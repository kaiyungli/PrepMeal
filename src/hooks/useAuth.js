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

  const signOut = async () => {
    const { error } = await supabase?.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user,
  };
}
