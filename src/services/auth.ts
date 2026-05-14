import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMessage,
} from '../lib/supabase';

export function normalizeNickname(nickname: string) {
  return nickname.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

export function nicknameToPrivateEmail(nickname: string) {
  return `${normalizeNickname(nickname)}@users.kriphub.local`;
}

function assertValidNickname(nickname: string) {
  const normalized = normalizeNickname(nickname);

  if (!normalized) {
    throw new Error('Introduce un nickname válido.');
  }

  if (normalized.length < 3) {
    throw new Error('El nickname debe tener al menos 3 caracteres.');
  }

  if (normalized.length > 40) {
    throw new Error('El nickname no puede superar los 40 caracteres.');
  }

  return normalized;
}

export async function signInWithNickname(nickname: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigMessage);
  }

  const normalized = assertValidNickname(nickname);

  const { error } = await supabase.auth.signInWithPassword({
    email: nicknameToPrivateEmail(normalized),
    password,
  });

  if (error) {
    throw error;
  }
}

export async function signUpWithNickname(nickname: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error(supabaseConfigMessage);
  }

  const normalized = assertValidNickname(nickname);

  const { data, error } = await supabase.auth.signUp({
    email: nicknameToPrivateEmail(normalized),
    password,
    options: {
      data: {
        nickname: normalized,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
