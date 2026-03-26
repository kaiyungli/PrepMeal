// Auth guard helper - centralized redirect logic for protected pages
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useRouter } from 'next/router';

/**
 * useAuthGuard - standardized auth protection + token helper for pages
 * Usage: call useAuthGuard() at top of protected page component
 * Returns both auth state and getAccessToken for convenience
 */
export function useAuthGuard() {
  const { isAuthenticated, loading, user, getAccessToken } = useAuth();
  const router = useRouter();

  // Standard redirect - use this in pages that need protection
  useEffect(() => {
    // Wait for auth to hydrate
    if (loading) return;
    
    // Already authenticated - allow
    if (isAuthenticated) return;
    
    // Not authenticated - redirect to login with return URL
    const currentPath = router.asPath;
    router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }, [loading, isAuthenticated, router]);

  // Manual trigger - for actions that need auth (like favorite click)
  const requireAuth = () => {
    if (!isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return false;
    }
    return true;
  };

  // Alert + redirect - for when you want to inform user first
  const requireAuthWithAlert = (message = '請先登入') => {
    if (!isAuthenticated) {
      alert(message);
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return false;
    }
    return true;
  };

  return {
    isAuthenticated,
    loading,
    user,
    getAccessToken, // Also provide token getter for convenience
    requireAuth,
    requireAuthWithAlert,
  };
}

// Legacy - keep for backward compatibility
export function useRequireAuth() {
  return useAuthGuard();
}