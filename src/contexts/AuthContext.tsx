// Auth Context — shared auth state singleton
// Mounted once in _app.js, consumed via useAuthContext
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { perfNow, perfMeasure } from '@/utils/perf';
import supabase from '@/lib/supabase';
import { buildOAuthRedirectUrl } from '@/lib/authRedirect';
import { invalidateFavoritesCache } from '@/hooks/useFavorites';
import { favoritesSessionIdentity } from '@/utils/favoritesSession';

interface AuthContextValue {
  user: any | null;
  session: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrated: boolean;
  favoritesEpoch: number;
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
  const [favoritesEpoch, setFavoritesEpoch] = useState(0);
  const favoriteIdentity = useRef<string | null>(null);
  const syncFavoriteIdentity = useCallback((s: Parameters<typeof favoritesSessionIdentity>[0]) => {
    const next = favoritesSessionIdentity(s);
    if (favoriteIdentity.current !== next) {
      invalidateFavoritesCache();
      favoriteIdentity.current = next;
      setFavoritesEpoch(epoch => epoch + 1);
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const sessionStart = perfNow();
      try {
        const { data: { session: s } } = await supabase?.auth.getSession();
        syncFavoriteIdentity(s);
        setSession(s);
        setUser(s?.user || null);
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Session check error:', err);
        setUser(null);
        syncFavoriteIdentity(null);
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
      syncFavoriteIdentity(s);
      setUser(s?.user || null);
      setLoading(false);
    });

    return () => {
      cancelAnimationFrame(timerId);
      subscription?.unsubscribe();
    };
  }, [syncFavoriteIdentity]);

  const getAccessToken = useCallback(async () => {
    // Use cached session directly — no extra getSession() call needed
    return session?.access_token || null;
  }, [session]);

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
    syncFavoriteIdentity(null);
  }, [syncFavoriteIdentity]);

  const value: AuthContextValue = {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    hydrated,
    favoritesEpoch,
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
