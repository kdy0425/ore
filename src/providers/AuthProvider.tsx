import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import type { ProfileWithBranches } from '@/types/auth';
import { refreshQuizBank } from '@/data/quizRepository';
import { unregisterPushTokenForCurrentDevice } from '@/services/pushNotifications';

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  profile: ProfileWithBranches | null;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getRecoveryParams(url: string) {
  const parsed = Linking.parse(url);
  const params = new URLSearchParams(url.includes('#') ? url.split('#')[1] : '');
  return {
    code: typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null,
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithBranches | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        branch:branches!profiles_branch_id_fkey(id, name, is_active),
        requested_branch:branches!profiles_requested_branch_id_fkey(id, name, is_active)
      `)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setProfileError('계정 정보를 불러오지 못했습니다.');
      return;
    }

    const nextProfile = (data as ProfileWithBranches | null) ?? null;
    if (nextProfile?.status === 'active') await refreshQuizBank();
    setProfile(nextProfile);
    setProfileError(data ? null : '계정 프로필이 아직 생성되지 않았습니다.');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) await loadProfile(session.user.id);
  }, [loadProfile, session]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setLoading(true);
        void loadProfile(nextSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setProfileError(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      const { code, accessToken, refreshToken } = getRecoveryParams(url);
      if (code) await supabase.auth.exchangeCodeForSession(code);
      else if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    void Linking.getInitialURL().then((url) => {
      if (url) void handleUrl({ url });
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    profile,
    profileError,
    refreshProfile,
    signOut: async () => {
      await unregisterPushTokenForCurrentDevice().catch(() => undefined);
      await supabase.auth.signOut();
    },
  }), [loading, profile, profileError, refreshProfile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
