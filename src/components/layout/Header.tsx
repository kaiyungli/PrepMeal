'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon, LogoMark } from '@/components/ui/Icons';

interface NavLink {
  label: string;
  path: string;
}

interface HeaderProps {
  showNav?: boolean;
  // Data props
  navLinks?: NavLink[];
  guideLinks?: NavLink[];
  accountLinks?: NavLink[];
  trustLinks?: NavLink[];
  isAuthenticated?: boolean;
  loading?: boolean;
  loggingOut?: boolean;
  // Checkers
  isActiveRoute?: (path: string) => boolean;
  // Actions
  handleLogout?: () => void;
  onFavoritesIntent?: () => void;
  onMyPlansIntent?: () => void;
}

export default function Header({
  showNav = true,
  navLinks = [],
  guideLinks = [],
  accountLinks = [],
  trustLinks = [],
  isAuthenticated = false,
  loading = false,
  loggingOut = false,
  isActiveRoute = () => false,
  handleLogout = () => {},
  onFavoritesIntent,
  onMyPlansIntent,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close both menus whenever the page changes.
  const [menusPath, setMenusPath] = useState(pathname);
  if (menusPath !== pathname) {
    setMenusPath(pathname);
    setMoreOpen(false);
    setMenuOpen(false);
  }

  // "更多" closes on a click/tap outside it, on Escape, or when focus leaves it.
  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  const intentFor = (path: string) =>
    path === '/favorites' ? onFavoritesIntent : path === '/my-plans' ? onMyPlansIntent : undefined;

  // Generate nav link class based on active state
  const getNavLinkClass = (isActive: boolean) => {
    return isActive
      ? "text-sm font-semibold text-[#9B6035] border-b-2 border-[#9B6035] pb-1"
      : "text-sm font-medium text-[#AA7A50] hover:text-[#9B6035] transition-colors";
  };

  // Render a nav link (reusable for desktop and mobile)
  const renderNavLink = (link: NavLink, isMobile = false) => {
    const isActive = isActiveRoute(link.path);
    const intent = intentFor(link.path);
    return (
      <Link
        key={link.path}
        href={link.path}
        className={getNavLinkClass(isActive)}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => isMobile && setMenuOpen(false)}
        onPointerEnter={intent}
        onTouchStart={intent}
        onFocus={intent}
      >
        {link.label}
      </Link>
    );
  };

  // Render a link inside the "更多" dropdown
  const renderMenuLink = (link: NavLink) => {
    const isActive = isActiveRoute(link.path);
    return (
      <Link
        key={link.path}
        href={link.path}
        role="menuitem"
        aria-current={isActive ? 'page' : undefined}
        className={`block px-4 py-2 text-sm transition-colors hover:bg-[#F8F3E8] hover:text-[#9B6035] ${isActive ? 'font-semibold text-[#9B6035]' : 'text-[#5A4030]'}`}
        onClick={() => setMoreOpen(false)}
      >
        {link.label}
      </Link>
    );
  };

  const menuHeading = (label: string) => (
    <p className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-[#AA7A50]">{label}</p>
  );

  const mobileHeading = (label: string) => (
    <p className="text-xs font-semibold tracking-wide text-[#AA7A50]">{label}</p>
  );

  return (
    <>
      <header className="h-16 bg-[#F8F3E8] border-b border-[#DDD0B0]">
        <div className="h-full max-w-[1200px] mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-[#9B6035]">
            <LogoMark size={32} />
            <span>今晚食乜</span>
          </Link>

          {/* Desktop Nav */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => renderNavLink(link))}
              {/* More dropdown */}
              <div
                className="relative"
                ref={moreRef}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setMoreOpen(false);
                }}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#AA7A50] hover:text-[#9B6035] transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen(open => !open)}
                >
                  更多
                  <ChevronDownIcon size={14} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-48 rounded-2xl border border-[#E8D9C9] bg-[#FFFDF8] shadow-[0_12px_32px_rgba(58,32,16,0.12)] py-2 z-50"
                  >
                    {guideLinks.length > 0 && (
                      <>
                        {menuHeading('晚餐指南')}
                        {guideLinks.map(renderMenuLink)}
                        <hr className="my-2 border-[#EFE6D6]" />
                      </>
                    )}
                    {menuHeading('關於')}
                    {trustLinks.map(renderMenuLink)}
                  </div>
                )}
              </div>
            </nav>
          )}

          {/* Auth Button */}
          {showNav && (
            <div className="hidden md:flex items-center gap-4">
              {!loading && (
                isAuthenticated ? (
                  <>
                    {accountLinks.map((link) => renderNavLink(link))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="text-sm font-semibold text-[#AA7A50] hover:text-[#9B6035] transition-colors"
                    >
                      {loggingOut ? '登出中...' : '登出'}
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-sm font-semibold text-[#3A2010] bg-[#C8D49A] px-4 py-2 rounded-lg hover:bg-[#B8C489] transition-colors"
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
              type="button"
              className="md:hidden p-2"
              aria-label={menuOpen ? '關閉選單' : '打開選單'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(open => !open)}
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
            {!loading && isAuthenticated && accountLinks.map((link) => renderNavLink(link, true))}
            {guideLinks.length > 0 && (
              <>
                <hr className="border-[#E5DCC8]" />
                {mobileHeading('晚餐指南')}
                {guideLinks.map((link) => renderNavLink(link, true))}
              </>
            )}
            <hr className="border-[#E5DCC8]" />
            {mobileHeading('關於')}
            {trustLinks.map((link) => renderNavLink(link, true))}
            <hr className="border-[#E5DCC8]" />
            {!loading && (
              isAuthenticated ? (
                <button
                  type="button"
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
