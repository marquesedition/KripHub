import { supabase } from '../lib/supabase';
import type { AccessCode, AccessCodeStatus, AccessSession, AccessType } from '../types/domain';
import {
  generateAccessCode,
  hashAccessCode,
  normalizeAccessCode,
  unwrapMediaKeyWithCode,
  wrapMediaKeyForCode,
  wipeBytes,
} from './crypto';
import { getStoredMediaKey, storeAccessSession, storeMediaKey } from './secureCache';
import { listMediaForCollection } from './media';

type ValidateCodeResponse = {
  access_session: {
    access_code_id: string;
    collection_id: string;
    expires_at: string | null;
    id: string;
  };
  media_keys: {
    encrypted_media_key: string;
    expires_at: string | null;
    media_id: string;
  }[];
};

type CreateAccessCodeInput = {
  accessType: AccessType;
  collectionId: string;
  durationMinutes?: number | null;
  maxUses?: number | null;
};

export const ACCESS_DURATION_OPTIONS = [
  { label: '1 hora', minutes: 60 },
  { label: '24 horas', minutes: 24 * 60 },
  { label: '7 días', minutes: 7 * 24 * 60 },
  { label: '30 días', minutes: 30 * 24 * 60 },
] as const;

export async function validateAccessCode(code: string) {
  const normalized = normalizeAccessCode(code);
  const { data, error } = await supabase.functions.invoke<ValidateCodeResponse>(
    'validate-access-code',
    {
      body: { code: normalized },
    },
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No se pudo validar el código.');
  }

  await storeAccessSession(data.access_session.id, data.access_session.expires_at);

  await Promise.all(
    data.media_keys.map(async (key) => {
      const mediaKey = unwrapMediaKeyWithCode(key.encrypted_media_key, normalized);
      await storeMediaKey(key.media_id, mediaKey, key.expires_at);
      wipeBytes(mediaKey);
    }),
  );

  return data;
}

export const validateTemporaryCode = validateAccessCode;

export async function createAccessCode(input: CreateAccessCodeInput) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  if (input.accessType === 'temporary' && !input.durationMinutes) {
    throw new Error('El acceso temporal necesita una duración.');
  }

  const code = generateAccessCode();
  const codeHash = await hashAccessCode(code);
  const expiresAt =
    input.accessType === 'temporary'
      ? new Date(Date.now() + Number(input.durationMinutes) * 60 * 1000).toISOString()
      : null;

  const { data: accessCode, error } = await supabase
    .from('access_codes')
    .insert({
      access_type: input.accessType,
      code_hash: codeHash,
      collection_id: input.collectionId,
      duration_minutes: input.accessType === 'temporary' ? input.durationMinutes : null,
      expires_at: expiresAt,
      max_uses: input.maxUses ?? null,
      owner_id: user.id,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const media = await listMediaForCollection(input.collectionId);
  const mediaKeys = [];

  for (const item of media) {
    const mediaKey = await getStoredMediaKey(item.id);

    if (!mediaKey) {
      continue;
    }

    try {
      mediaKeys.push({
        access_code_id: accessCode.id,
        encrypted_media_key: wrapMediaKeyForCode(mediaKey, code),
        expires_at: expiresAt,
        media_id: item.id,
      });
    } finally {
      wipeBytes(mediaKey);
    }
  }

  if (mediaKeys.length > 0) {
    const { error: keyError } = await supabase.from('media_keys').insert(mediaKeys);

    if (keyError) {
      throw keyError;
    }
  }

  return { accessCode, code };
}

export async function listAccessCodes(status?: AccessCodeStatus) {
  let query = supabase
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as AccessCode[];
}

export async function revokeAccessCode(id: string) {
  const { error } = await supabase
    .from('access_codes')
    .update({
      revoked_at: new Date().toISOString(),
      status: 'revoked',
    })
    .eq('id', id);

  if (error) {
    throw error;
  }

  const revokedAt = new Date().toISOString();

  const [sessionsResult, keysResult] = await Promise.all([
    supabase.from('access_sessions').update({ revoked_at: revokedAt }).eq('access_code_id', id),
    supabase.from('media_keys').update({ revoked_at: revokedAt }).eq('access_code_id', id),
  ]);

  if (sessionsResult.error) {
    throw sessionsResult.error;
  }

  if (keysResult.error) {
    throw keysResult.error;
  }
}

export async function listMyAccessSessions() {
  const { data, error } = await supabase
    .from('access_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as AccessSession[];
}

export const listAccessSessions = listMyAccessSessions;

export async function listOwnedAccessSessions() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Debes iniciar sesión.');
  }

  const { data, error } = await supabase
    .from('access_sessions')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as AccessSession[];
}

export async function revokeAccessSession(id: string) {
  const { error } = await supabase
    .from('access_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export function getAccessSessionState(access: Pick<AccessSession, 'expires_at' | 'revoked_at'>) {
  if (access.revoked_at) {
    return 'revoked';
  }

  if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now()) {
    return 'expired';
  }

  return 'active';
}
