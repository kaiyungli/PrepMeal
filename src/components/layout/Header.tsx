'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  showNav?: boolean;
}

/**
 * Check if current route matches nav item (supports nested routes)
 */
function isActiveRoute(currentPath: string | null, linkPath: string): boolean {
  if (!currentPath) return false;
  if (linkPath === '/') {
    return currentPath === '/';
  }
  return currentPath.startsWith(linkPath);
}

export default function Header({ showNav = true }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, signOut, isAuthenticated, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const navLinks = [
    { label: "首頁", path: "/" },
    { label: "食譜", path: "/recipes" },
    { label: "生成餐單", path: "/generate" },
    { label: "收藏", path: "/favorites" },
    { label: "我的餐單", path: "/my-plans" },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  // Generate nav link class based on active state
  const getNavLinkClass = (path: string) => {
    const isActive = isActiveRoute(pathname, path);
    return isActive
      ? "text-sm font-semibold text-[#9B6035] border-b-2 border-[#9B6035] pb-1"
      : "text-sm font-medium text-[#AA7A50] hover:text-[#9B6035] transition-colors";
  };

  return (
    <>
      <header className="h-16 bg-[#F8F3E8] border-b border-[#DDD0B0]">
        <div className="h-full max-w-[1200px] mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-[#9B6035]">
            <span>🍜</span>
            <span>今晚食乜</span>
          </Link>

          {/* Desktop Nav */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={getNavLinkClass(link.path)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Auth Button */}
          {showNav && (
            <div className="hidden md:block">
              {!loading && (
                isAuthenticated ? (
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="text-sm font-semibold text-[#AA7A50] hover:text-[#9B6035] transition-colors"
                  >
                    {loggingOut ? '登出中...' : '登出'}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-[#9B6035] bg-[#C8D49A] px-4 py-2 rounded-lg hover:bg-[#B8C489] transition-colors"
                  >
                    登入
                  </Link>
                )
              )}
            </div>
          )}

          {/* Mobile Hamburger */}
          {showNav && (
            <button
              className="md:hidden p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="space-y-1.5">
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
                <span className="block w-6 h-0.5 bg-[#9B6035]"></span>
              </div>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && showNav && (
        <div className="md:hidden bg-[#F8F3E8] border-b border-[#DDD0B0] px-4 py-4">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const isActive = isActiveRoute(pathname, link.path);
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={isActive ? "text-sm font-semibold text-[#9B6035]" : "text-sm font-medium text-[#AA7A50]"}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <hr className="border-[#E5DCC8]" />
            {!loading && (
              isAuthenticated ? (
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="text-sm font-semibold text-left text-[#AA7A50]"
                >
                  登出
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-semibold text-[#9B6035]"
                  onClick={() => setMenuOpen(false)}
                >
                  登入
                </Link>
              )
            )}
          </nav>
        </div>
      )}
    </>
  );
}
