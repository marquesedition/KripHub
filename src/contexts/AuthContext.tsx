import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { clearKripHubSecureMaterial } from '../services/secureCache';
import type { Profile } from '../types/domain';

type AuthContextValue = {
  loading: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not load profile', error.message);
      setProfile(null);
      return;
    }

    setProfile(data);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        setSession(nextSession);

        if (event === 'SIGNED_OUT') {
          await clearKripHubSecureMaterial();
          setProfile(null);
          return;
        }

        await loadProfile(nextSession?.user.id);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      profile,
      refreshProfile: () => loadProfile(session?.user.id),
      session,
      user: session?.user ?? null,
    }),
    [loading, loadProfile, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
