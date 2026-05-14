import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from '../types/database';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  'https://ymwlymasveorwpaexyql.supabase.co';
const rawSupabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const missingSupabaseKeyPlaceholder = 'missing-supabase-publishable-key';

export const isSupabaseConfigured =
  Boolean(rawSupabasePublishableKey) &&
  !rawSupabasePublishableKey.includes('replace_with_');

export const supabaseConfigMessage =
  'Falta EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Añade la publishable/anon key del proyecto en .env y reinicia Expo.';

const supabasePublishableKey = isSupabaseConfigured
  ? rawSupabasePublishableKey
  : missingSupabaseKeyPlaceholder;

if (!isSupabaseConfigured) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to .env before signing in.',
  );
}

export const encryptedMediaBucket =
  process.env.EXPO_PUBLIC_ENCRYPTED_MEDIA_BUCKET?.trim() || 'encrypted-media';

export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  },
);

if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
