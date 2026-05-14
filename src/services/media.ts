import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ExpoCrypto from 'expo-crypto';
import { supabase } from '../lib/supabase';
import type { Collection, GalleryCollection, Media, MediaType } from '../types/domain';
import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  encryptBytes,
  MEDIA_ENCRYPTION_VERSION,
  wipeBytes,
} from './crypto';
import { disposeMediaKey, getStoredMediaKey, storeMediaKey } from './secureCache';
import { downloadEncryptedObject, uploadEncryptedObject } from './storage';

type UploadEncryptedMediaInput = {
  collectionId: string;
  localUri: string;
  title: string;
  type: MediaType;
};

function extensionForType(type: MediaType) {
  return type === 'image' ? 'jpg' : 'mp4';
}

function toGalleryCollection(collection: Collection, isOwner: boolean): GalleryCollection {
  return {
    ...collection,
    access_id: null,
    access_type: isOwner ? 'owner' : 'temporary',
    expires_at: null,
    is_owner: isOwner,
    revoked_at: null,
  };
}

export async function pickMediaDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: ['image/*', 'video/*'],
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? '';

  return {
    localUri: asset.uri,
    name: asset.name,
    size: asset.size ?? 0,
    type: mimeType.startsWith('video/') ? 'video' : 'image',
  } satisfies {
    localUri: string;
    name: string;
    size: number;
    type: MediaType;
  };
}

export async function readLocalFileBytes(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return base64ToBytes(base64);
}

export async function listOwnerCollections() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listGalleryCollections() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  const [ownedResult, accessResult] = await Promise.all([
    supabase
      .from('collections')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('access_sessions')
      .select('id,access_type,collection_id,expires_at,revoked_at')
      .eq('recipient_id', user.id)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);

  if (ownedResult.error) {
    throw ownedResult.error;
  }

  if (accessResult.error) {
    throw accessResult.error;
  }

  const owned = (ownedResult.data ?? []).map((collection) =>
    toGalleryCollection(collection, true),
  );

  const activeAccesses = (accessResult.data ?? []).filter(
    (row) => !row.expires_at || new Date(row.expires_at).getTime() > Date.now(),
  );
  const sharedCollectionIds = [...new Set(activeAccesses.map((row) => row.collection_id))];
  const sharedCollections =
    sharedCollectionIds.length > 0
      ? await supabase.from('collections').select('*').in('id', sharedCollectionIds)
      : { data: [], error: null };

  if (sharedCollections.error) {
    throw sharedCollections.error;
  }

  const collectionById = new Map(
    (sharedCollections.data ?? []).map((collection) => [collection.id, collection]),
  );

  const shared: GalleryCollection[] = [];

  for (const row of activeAccesses) {
    const collection = collectionById.get(row.collection_id);

    if (collection) {
      shared.push({
        ...collection,
        access_id: row.id,
        access_type: row.access_type,
        expires_at: row.expires_at,
        is_owner: false,
        revoked_at: row.revoked_at,
      });
    }
  }

  const byId = new Map<string, GalleryCollection>();

  for (const collection of [...owned, ...shared]) {
    byId.set(collection.id, collection);
  }

  return Array.from(byId.values());
}

export const listCollections = listOwnerCollections;

export async function createCollection(title: string, description?: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      owner_id: user.id,
      description: description || null,
      title,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listMediaForCollection(collectionId: string) {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadEncryptedMedia(input: UploadEncryptedMediaInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  const plaintext = await readLocalFileBytes(input.localUri);
  const encrypted = encryptBytes(plaintext);
  wipeBytes(plaintext);

  const mediaId = ExpoCrypto.randomUUID();
  const storagePath = `owners/${user.id}/collections/${input.collectionId}/media/${mediaId}.${extensionForType(
    input.type,
  )}.enc`;

  try {
    await uploadEncryptedObject(storagePath, new Uint8Array(encrypted.ciphertext));

    const { data, error } = await supabase
      .from('media')
      .insert({
        id: mediaId,
        collection_id: input.collectionId,
        encrypted_storage_path: storagePath,
        encryption_version: MEDIA_ENCRYPTION_VERSION,
        nonce: encrypted.nonce,
        auth_tag: encrypted.authTag,
        owner_id: user.id,
        size_bytes: encrypted.ciphertext.byteLength,
        title: input.title,
        type: input.type,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    await storeMediaKey(data.id, encrypted.mediaKey, null);

    return data;
  } finally {
    wipeBytes(encrypted.mediaKey);
  }
}

export async function getMediaById(id: string) {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function downloadAndDecryptMedia(media: Media) {
  const mediaKey = await getStoredMediaKey(media.id);

  if (!mediaKey) {
    throw new Error('No hay una clave local para este contenido. Vuelve a validar el código.');
  }

  try {
    const encryptedBytes = await downloadEncryptedObject(media.encrypted_storage_path);
    const plaintext = decryptBytes(
      {
        authTag: media.auth_tag,
        ciphertext: encryptedBytes,
        nonce: media.nonce,
      },
      mediaKey,
    );

    const cacheUri = `${FileSystem.cacheDirectory}kriphub-${media.id}.${extensionForType(
      media.type,
    )}`;

    await FileSystem.writeAsStringAsync(cacheUri, bytesToBase64(plaintext), {
      encoding: FileSystem.EncodingType.Base64,
    });

    wipeBytes(plaintext);
    wipeBytes(encryptedBytes);

    return cacheUri;
  } finally {
    disposeMediaKey(mediaKey);
  }
}

export async function deleteLocalDecryptedMedia(mediaId: string, type: MediaType) {
  const uri = `${FileSystem.cacheDirectory}kriphub-${mediaId}.${extensionForType(type)}`;
  const info = await FileSystem.getInfoAsync(uri);

  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
