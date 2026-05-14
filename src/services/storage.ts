import { encryptedMediaBucket, supabase } from '../lib/supabase';

export async function uploadEncryptedObject(path: string, encryptedBytes: Uint8Array) {
  const { error } = await supabase.storage
    .from(encryptedMediaBucket)
    .upload(path, encryptedBytes, {
      cacheControl: '0',
      contentType: 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

export async function downloadEncryptedObject(path: string) {
  const { data, error } = await supabase.storage
    .from(encryptedMediaBucket)
    .download(path);

  if (error) {
    throw error;
  }

  return new Uint8Array(await data.arrayBuffer());
}
