import * as SecureStore from 'expo-secure-store';
import { base64ToBytes, bytesToBase64, wipeBytes } from './crypto';

const SECURE_INDEX_KEY = 'kriphub:secure-index';

type StoredMediaKey = {
  expiresAt: string | null;
  key: string;
};

type StoredAccessSession = {
  expiresAt: string | null;
};

async function readIndex() {
  const raw = await SecureStore.getItemAsync(SECURE_INDEX_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function writeIndex(keys: string[]) {
  await SecureStore.setItemAsync(SECURE_INDEX_KEY, JSON.stringify([...new Set(keys)]));
}

async function rememberKey(key: string) {
  const keys = await readIndex();
  await writeIndex([...keys, key]);
}

export async function storeTemporaryAccess(code: string, expiresAt: string) {
  const key = `kriphub:access-code:${Date.now()}`;
  await SecureStore.setItemAsync(
    key,
    JSON.stringify({ code, expiresAt } satisfies { code: string; expiresAt: string }),
  );
  await rememberKey(key);
}

export async function storeAccessSession(sessionId: string, expiresAt: string | null) {
  const key = `kriphub:access-session:${sessionId}`;
  await SecureStore.setItemAsync(
    key,
    JSON.stringify({ expiresAt } satisfies StoredAccessSession),
  );
  await rememberKey(key);
}

export async function storeMediaKey(
  mediaId: string,
  mediaKey: Uint8Array,
  expiresAt: string | null,
) {
  const key = `kriphub:media-key:${mediaId}`;
  await SecureStore.setItemAsync(
    key,
    JSON.stringify({ expiresAt, key: bytesToBase64(mediaKey) } satisfies StoredMediaKey),
  );
  await rememberKey(key);
}

export async function getStoredMediaKey(mediaId: string) {
  const key = `kriphub:media-key:${mediaId}`;
  const raw = await SecureStore.getItemAsync(key);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredMediaKey;

    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      await SecureStore.deleteItemAsync(key);
      return null;
    }

    return base64ToBytes(parsed.key);
  } catch {
    return base64ToBytes(raw);
  }
}

export async function clearKripHubSecureMaterial() {
  const keys = await readIndex();

  await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
  await SecureStore.deleteItemAsync(SECURE_INDEX_KEY);
}

export async function clearExpiredAccessIfNeeded() {
  const keys = await readIndex();
  let cleared = false;

  await Promise.all(
    keys.map(async (key) => {
      const raw = await SecureStore.getItemAsync(key);

      if (!raw) {
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Partial<StoredMediaKey & StoredAccessSession>;

        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
          await SecureStore.deleteItemAsync(key);
          cleared = true;
        }
      } catch {
        // Legacy cache values are kept until logout.
      }
    }),
  );

  return cleared;
}

export function disposeMediaKey(mediaKey: Uint8Array | null) {
  wipeBytes(mediaKey);
}
