/**
 * useHeaderController - Header logic extracted from Header.tsx
 */
import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { PRIMARY_LINKS, TOOL_LINKS, GUIDE_LINKS, ACCOUNT_LINKS, TRUST_LINKS, isNavigationRouteActive } from '../navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFavoritesPrefetch } from '@/hooks/useFavorites';
import { prefetchMyPlans, isMyPlansStale } from '@/features/plans/myPlansCache';

export function useHeaderController() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, signOut, isAuthenticated, loading } = auth;
  const onFavoritesIntent = useFavoritesPrefetch(auth);
  const [loggingOut, setLoggingOut] = useState(false);

  // Start loading "我的餐單" when the user points at / touches its link.
  const { getAccessToken } = auth;
  const userId = user?.id;
  const onMyPlansIntent = useCallback(() => {
    if (loading || !isAuthenticated || !userId || !isMyPlansStale(userId)) return;
    getAccessToken()
      .then((token: string | null) => { if (token) prefetchMyPlans(userId, token); })
      .catch(() => {});
  }, [loading, isAuthenticated, userId, getAccessToken]);

  const navLinks = [...PRIMARY_LINKS, ...TOOL_LINKS];
  const guideLinks = GUIDE_LINKS;
  const accountLinks = ACCOUNT_LINKS;
  const trustLinks = TRUST_LINKS;

  // Check if current route matches nav item
  const isActiveRoute = (linkPath: string) => isNavigationRouteActive(pathname, linkPath);

  // Handle logout - no error UX needed as logout rarely fails
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch {
      // Silent fail - user may retry or refresh
    } finally {
      setLoggingOut(false);
    }
  };

  return {
    // Auth state
    user,
    isAuthenticated,
    loading,
    loggingOut,

    // Navigation
    pathname,
    navLinks,
    guideLinks,
    accountLinks,
    trustLinks,
    isActiveRoute,

    // Actions
    handleLogout,
    onFavoritesIntent,
    onMyPlansIntent,
  };
}
