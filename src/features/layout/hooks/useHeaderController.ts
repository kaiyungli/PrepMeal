/**
 * useHeaderController - Header logic extracted from Header.tsx
 */
import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function useHeaderController() {
  const pathname = usePathname();
  const { user, signOut, isAuthenticated, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Nav links - can be customized if needed
  // Main navigation links
  const navLinks = useMemo(() => [
    { label: "首頁", path: "/" },
    { label: "食譜", path: "/recipes" },
    { label: "生成餐單", path: "/generate" },
    { label: "收藏", path: "/favorites" },
    { label: "我的餐單", path: "/my-plans" },
  ], []);

  // Trust/legal pages for mobile menu
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
    } catch (err) {
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
    trustLinks,
    isActiveRoute,

    // Actions
    handleLogout,
  };
}