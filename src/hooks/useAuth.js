// Simple auth hook for Google OAuth
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const getSession = async () => {
      const { data: { session } } = await supabase?.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Preserve return URL if present
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}${redirectParam}` 
      : `${window.location.origin}/my-plans`;
    
    const { data, error } = await supabase?.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return data;
  };

  const signInWithApple = async () => {
    // Preserve return URL if present
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}${redirectParam}` 
      : `${window.location.origin}/my-plans`;
    
    try {
      const { data, error } = await supabase?.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      // Apple provider may not be configured
      throw new Error('Apple登入暫時不可用，請使用其他方式登入');
    }
  };

  const signInWithFacebook = async () => {
    const redirectParam = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('redirect') 
      : null;
    const redirectTo = redirectParam 
      ? `${window.location.origin}${redirectParam}` 
      : `${window.location.origin}/my-plans`;
    
    try {
      const { data, error } = await supabase?.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo },
      });
      if (error) throw error;
      return data;
    } catch (err) {
      throw new Error('Facebook登入暫時不可用，請使用其他方式登入');
    }
  };

  const signOut = async () => {
    const { error } = await supabase?.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signOut,
    isAuthenticated: !!user,
  };
}
