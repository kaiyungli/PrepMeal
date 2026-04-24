// Auth Context — shared auth state singleton
// Mounted once in _app.js, consumed via useAuthContext
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { perfNow, perfMeasure } from '@/utils/perf';
import supabase from '@/lib/supabase';
import { buildOAuthRedirectUrl } from '@/lib/authRedirect';

interface AuthContextValue {
  user: any | null;
  session: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrated: boolean;
  signInWithGoogle: () => Promise<any>;
  signInWithApple: () => Promise<any>;
  signInWithFacebook: () => Promise<any>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const loadSession = async () => {
      const sessionStart = perfNow();
      try {
        const { data: { session: s } } = await supabase?.auth.getSession();
        setSession(s);
        setUser(s?.user || null);
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Session check error:', err);
        setUser(null);
        setSession(null);
        initialLoadDone.current = true;
      } finally {
        setLoading(false);
        setHydrated(true);
      }
      perfMeasure('AuthContext.getSession', sessionStart);
    };

    const timerId = requestAnimationFrame(() => {
      loadSession();
    });

    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, s) => {
      if (event === 'INITIAL_SESSION' && initialLoadDone.current === false) {
        return;
      }
      setSession(s);
      setUser(s?.user || null);
      setLoading(false);
    });

    return () => {
      cancelAnimationFrame(timerId);
      subscription?.unsubscribe();
    };
  }, []);

  const getAccessToken = useCallback(async () => {
    const tokenStart = perfNow();
    try {
      const { data: { session: s } } = await supabase?.auth.getSession();
      perfMeasure('AuthContext.getAccessToken', tokenStart);
      return s?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = buildOAuthRedirectUrl();
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  }, []);

  const signInWithApple = useCallback(async () => {
    const redirectTo = buildOAuthRedirectUrl();
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  }, []);

  const signInWithFacebook = useCallback(async () => {
    const redirectTo = buildOAuthRedirectUrl();
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase?.auth.signOut();
    if (error) throw error;
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    hydrated,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signOut,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
}