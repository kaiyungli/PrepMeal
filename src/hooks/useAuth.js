// Simple auth hook for Google OAuth
import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase';

export function useAuth() {
  // Start with loading: true - but don't block on it
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Lazy load session AFTER first paint - don't block
    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase?.auth.getSession();
        setUser(session?.user || null);
        setIsAuthenticated(!!session?.user);
      } catch (err) {
        console.error('Session check error:', err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setHydrated(true);
      }
    };
    
    // Schedule for after first paint
    const timerId = requestAnimationFrame(() => {
      loadSession();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => {
      cancelAnimationFrame(timerId);
      subscription?.unsubscribe();
    };
  }, []);

  // Get current access token for API calls - stable reference
  const getAccessToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase?.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const signInWithGoogle = async () => {
    // Use callback page for OAuth redirect
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}` 
      : `${window.location.origin}/auth/callback`;
    
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    
    if (error) throw error;
    return data;
  };

  const signInWithApple = async () => {
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}` 
      : `${window.location.origin}/auth/callback`;
    
    try {
      if (!supabase) throw new Error("Supabase not initialized"); 
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Apple 登入尚未完成設定，請使用其他方式');
    }
  };

  const signInWithFacebook = async () => {
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}` 
      : `${window.location.origin}/auth/callback`;
    
    try {
      if (!supabase) throw new Error("Supabase not initialized"); 
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Facebook 登入尚未完成設定，請使用其他方式');
    }
  };

  const signOut = async () => {
    const { error } = await supabase?.auth.signOut();
    if (error) throw error;
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    loading,
    authHydrated: hydrated,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signOut,
    isAuthenticated,
    getAccessToken,
  };
}