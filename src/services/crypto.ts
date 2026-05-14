import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';
import * as ExpoCrypto from 'expo-crypto';
import { fromByteArray, toByteArray } from 'base64-js';

export const MEDIA_ENCRYPTION_VERSION = 1;
export const KEY_ENCRYPTION_VERSION = 1;

const AES_GCM_KEY_BYTES = 32;
const AES_GCM_NONCE_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const ACCESS_CODE_SALT = utf8ToBytes('KRIPHUB_ACCESS_CODE_V1');

export type EncryptedPayload = {
  authTag: string;
  ciphertext: Uint8Array;
  nonce: string;
};

export type EncryptedFile = EncryptedPayload & {
  mediaKey: Uint8Array;
};

export type WrappedKeyEnvelope = {
  alg: 'AES-256-GCM';
  ct: string;
  nonce: string;
  tag: string;
  v: typeof KEY_ENCRYPTION_VERSION;
};

export function randomBytes(length: number) {
  return ExpoCrypto.getRandomBytes(length);
}

export function generateMediaKey() {
  return randomBytes(AES_GCM_KEY_BYTES);
}

export function bytesToBase64(bytes: Uint8Array) {
  return fromByteArray(bytes);
}

export function base64ToBytes(value: string) {
  return toByteArray(value);
}

export function concatBytes(left: Uint8Array, right: Uint8Array) {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

export function splitCiphertextAndTag(payload: Uint8Array) {
  if (payload.length < AES_GCM_TAG_BYTES) {
    throw new Error('Encrypted payload is shorter than an AES-GCM auth tag.');
  }

  return {
    ciphertext: payload.slice(0, payload.length - AES_GCM_TAG_BYTES),
    authTag: payload.slice(payload.length - AES_GCM_TAG_BYTES),
  };
}

export function encryptBytes(plaintext: Uint8Array, mediaKey = generateMediaKey()) {
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const encrypted = gcm(mediaKey, nonce).encrypt(plaintext);
  const { authTag, ciphertext } = splitCiphertextAndTag(encrypted);

  return {
    authTag: bytesToBase64(authTag),
    ciphertext,
    mediaKey,
    nonce: bytesToBase64(nonce),
  } satisfies EncryptedFile;
}

export function decryptBytes(encrypted: EncryptedPayload, mediaKey: Uint8Array) {
  const nonce = base64ToBytes(encrypted.nonce);
  const payload = concatBytes(encrypted.ciphertext, base64ToBytes(encrypted.authTag));

  return gcm(mediaKey, nonce).decrypt(payload);
}

export function deriveAccessKeyFromCode(code: string) {
  return hkdf(
    sha256,
    utf8ToBytes(code.trim()),
    ACCESS_CODE_SALT,
    utf8ToBytes('media-key-wrap'),
    AES_GCM_KEY_BYTES,
  );
}

export function wrapMediaKeyForCode(mediaKey: Uint8Array, code: string) {
  const wrappingKey = deriveAccessKeyFromCode(code);
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const encrypted = gcm(wrappingKey, nonce).encrypt(mediaKey);
  const { authTag, ciphertext } = splitCiphertextAndTag(encrypted);
  wipeBytes(wrappingKey);

  return JSON.stringify({
    alg: 'AES-256-GCM',
    ct: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
    tag: bytesToBase64(authTag),
    v: KEY_ENCRYPTION_VERSION,
  } satisfies WrappedKeyEnvelope);
}

export function unwrapMediaKeyWithCode(envelopeJson: string, code: string) {
  const envelope = JSON.parse(envelopeJson) as WrappedKeyEnvelope;

  if (envelope.v !== KEY_ENCRYPTION_VERSION || envelope.alg !== 'AES-256-GCM') {
    throw new Error('Unsupported media key envelope.');
  }

  const wrappingKey = deriveAccessKeyFromCode(code);

  try {
    return decryptBytes(
      {
        authTag: envelope.tag,
        ciphertext: base64ToBytes(envelope.ct),
        nonce: envelope.nonce,
      },
      wrappingKey,
    );
  } finally {
    wipeBytes(wrappingKey);
  }
}

export function wipeBytes(bytes: Uint8Array | null | undefined) {
  bytes?.fill(0);
}

export function normalizeAccessCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase();
}

export function generateTemporaryCode(byteLength = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(byteLength);
  let code = '';

  for (const byte of bytes) {
    code += alphabet[byte % alphabet.length];
  }

  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

export const generateAccessCode = generateTemporaryCode;

export async function hashAccessCode(code: string) {
  return ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    `kriphub:v1:${normalizeAccessCode(code)}`,
    { encoding: ExpoCrypto.CryptoEncoding.HEX },
  );
}
