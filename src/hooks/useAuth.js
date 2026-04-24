// useAuth — thin compatibility wrapper around shared AuthContext
// Phase 2: all state owned by AuthContext now
import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const ctx = useAuthContext();
  
  return {
    user: ctx.user,
    loading: ctx.loading,
    authHydrated: ctx.hydrated,
    signInWithGoogle: ctx.signInWithGoogle,
    signInWithApple: ctx.signInWithApple,
    signInWithFacebook: ctx.signInWithFacebook,
    signOut: ctx.signOut,
    isAuthenticated: ctx.isAuthenticated,
    getAccessToken: ctx.getAccessToken,
  };
}