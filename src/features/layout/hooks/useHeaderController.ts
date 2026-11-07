/**
 * useHeaderController - Header logic extracted from Header.tsx
 */
import { useState, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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

  // Nav links - can be customized if needed
  // Main navigation links
  const navLinks = useMemo(() => [
    { label: "首頁", path: "/" },
    { label: "食譜", path: "/recipes" },
    { label: "生成餐單", path: "/generate" },
    { label: "收藏", path: "/favorites" },
    { label: "我的餐單", path: "/my-plans" },
  ], []);

  // Guide pages (also listed in the footer) so they are reachable from the header
  const guideLinks = useMemo(() => [
    { label: "30分鐘快手菜", path: "/30-minute-dinner-recipes" },
    { label: "家常菜靈感", path: "/50-classic-hk-recipes" },
    { label: "一週晚餐示例", path: "/7-day-dinner-plan" },
    { label: "買餸攻略", path: "/hong-kong-market-shopping-guide" },
    { label: "健康晚餐", path: "/healthy-dinner-guide" },
    { label: "按材料揀菜", path: "/ingredient-pairing-guide" },
  ], []);

  // Signed-in account pages
  const accountLinks = useMemo(() => [
    { label: "個人資料", path: "/profile" },
  ], []);

  // Trust/legal pages for the "更多" menu
  const trustLinks = useMemo(() => [
    { label: "關於我們", path: "/about" },
    { label: "聯絡我們", path: "/contact" },
    { label: "常見問題", path: "/faq" },
    { label: "隱私政策", path: "/privacy" },
    { label: "服務條款", path: "/terms" },
  ], []);

  // Check if current route matches nav item
  const isActiveRoute = (linkPath: string): boolean => {
    if (!pathname) return false;
    if (linkPath === '/') return pathname === '/';
    return pathname === linkPath || pathname.startsWith(`${linkPath}/`);
  };

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
