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
  const navLinks = useMemo(() => [
    { label: "首頁", path: "/" },
    { label: "食譜", path: "/recipes" },
    { label: "生成餐單", path: "/generate" },
    { label: "收藏", path: "/favorites" },
    { label: "我的餐單", path: "/my-plans" },
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
    isActiveRoute,

    // Actions
    handleLogout,
  };
}