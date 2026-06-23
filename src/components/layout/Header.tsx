'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NavLink {
  label: string;
  path: string;
}

interface HeaderProps {
  showNav?: boolean;
  // Data props
  navLinks?: NavLink[];
  trustLinks?: NavLink[];
  isAuthenticated?: boolean;
  loading?: boolean;
  loggingOut?: boolean;
  // Checkers
  isActiveRoute?: (path: string) => boolean;
  // Actions
  handleLogout?: () => void;
}

export default function Header({ 
  showNav = true,
  navLinks = [],
  trustLinks = [],
  isAuthenticated = false,
  loading = false,
  loggingOut = false,
  isActiveRoute = () => false,
  handleLogout = () => {},
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Generate nav link class based on active state
  const getNavLinkClass = (isActive: boolean) => {
    return isActive
      ? "text-sm font-semibold text-[#9B6035] border-b-2 border-[#9B6035] pb-1"
      : "text-sm font-medium text-[#AA7A50] hover:text-[#9B6035] transition-colors";
  };

  // Render a nav link (reusable for desktop and mobile)
  const renderNavLink = (link: { label: string; path: string }, isMobile = false) => {
    const isActive = isActiveRoute(link.path);
    return (
      <Link
        key={link.path}
        href={link.path}
        className={getNavLinkClass(isActive)}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => isMobile && setMenuOpen(false)}
      >
        {link.label}
      </Link>
    );
  };

  // Render trust link for dropdown
  const renderTrustLink = (link: { label: string; path: string }) => {
    const isActive = isActiveRoute(link.path);
    return (
      <Link
        key={link.path}
        href={link.path}
        className="block px-4 py-2.5 text-sm text-[#5A4030] hover:bg-[#F8F3E8] hover:text-[#9B6035] transition-colors"
        onClick={() => setMoreOpen(false)}
      >
        {link.label}
      </Link>
    );
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
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => renderNavLink(link))}
              {/* More dropdown */}
              <div className="relative">
                <button
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#7A5A38] hover:text-[#9B6035]"
                  onClick={() => setMoreOpen(!moreOpen)}
                >
                  更多
                  <span className="text-xs">▼</span>
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-[#E8D9C9] bg-[#FFFDF8] shadow-[0_12px_32px_rgba(58,32,16,0.12)] py-2 z-50">
                    {trustLinks.map((link) => renderTrustLink(link))}
                  </div>
                )}
              </div>
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
            {navLinks.map((link) => renderNavLink(link, true))}
            <hr className="border-[#E5DCC8]" />
            {trustLinks.map((link) => renderNavLink(link, true))}
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