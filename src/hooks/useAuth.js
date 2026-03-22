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
    const { data, error } = await supabase?.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/profile` : '/profile',
      },
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
