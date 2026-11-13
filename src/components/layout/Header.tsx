'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon, LogoMark } from '@/components/ui/Icons';
import { PRIMARY_LINKS, TOOL_LINKS, GUIDE_LINKS, ACCOUNT_LINKS, TRUST_LINKS, type NavLink } from '@/features/layout/navigation';
import styles from './SiteChrome.module.css';

interface HeaderProps {
  showNav?: boolean;
  navLinks?: NavLink[];
  guideLinks?: NavLink[];
  accountLinks?: NavLink[];
  trustLinks?: NavLink[];
  isAuthenticated?: boolean;
  loading?: boolean;
  loggingOut?: boolean;
  isActiveRoute?: (path: string) => boolean;
  handleLogout?: () => void;
  onFavoritesIntent?: () => void;
  onMyPlansIntent?: () => void;
}

export default function Header({ showNav = true, navLinks = TOOL_LINKS,
  guideLinks = GUIDE_LINKS, accountLinks = ACCOUNT_LINKS, trustLinks = TRUST_LINKS,
  isAuthenticated = false, loading = false, loggingOut = false,
  isActiveRoute = () => false, handleLogout = () => {}, onFavoritesIntent, onMyPlansIntent,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const mobileButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = usePathname();
  const [menusPath, setMenusPath] = useState(pathname);
  if (menusPath !== pathname) {
    setMenusPath(pathname); setMoreOpen(false); setMenuOpen(false);
  }

  useEffect(() => {
    if (!moreOpen && !menuOpen) return;
    const pointer = (event: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (moreOpen) { setMoreOpen(false); moreButton.current?.focus(); }
      if (menuOpen) { setMenuOpen(false); mobileButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', escape); };
  }, [moreOpen, menuOpen]);

  const tools = navLinks.filter(link => !PRIMARY_LINKS.some(primary => primary.path === link.path));
  const intentFor = (path: string) => path === '/favorites' ? onFavoritesIntent : path === '/my-plans' ? onMyPlansIntent : undefined;
  const renderLink = (link: NavLink, inMenu = false) => <Link key={link.path} href={link.path}
    role={inMenu ? 'menuitem' : undefined}
    aria-current={isActiveRoute(link.path) ? 'page' : undefined}
    className={styles.navLink}
    onClick={() => { setMenuOpen(false); setMoreOpen(false); }}
    onPointerEnter={intentFor(link.path)} onTouchStart={intentFor(link.path)} onFocus={intentFor(link.path)}>{link.label}</Link>;
  const logout = <button type="button" className={styles.authLink} disabled={loggingOut}
    onClick={() => { handleLogout(); setMenuOpen(false); }}>{loggingOut ? '登出中...' : '登出'}</button>;
  const auth = !loading && (isAuthenticated ? <>{accountLinks.map(link => renderLink(link))}{logout}</> : <Link href="/login" className={styles.authLink} onClick={() => setMenuOpen(false)}>登入</Link>);

  return <header className={styles.header}>
    <div className={styles.inner}>
      <Link href="/" className={styles.logo} aria-current={pathname === '/' ? 'page' : undefined}><LogoMark size={32} /><span>今晚食乜</span></Link>
      {showNav && <>
        <nav className={styles.desktopNav} aria-label="主要導航">
          {PRIMARY_LINKS.map(link => renderLink(link))}
          <div className={styles.more} ref={moreRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMoreOpen(false); }}>
            <button ref={moreButton} type="button" className={styles.moreButton} aria-haspopup="menu" aria-expanded={moreOpen} aria-controls={`${menuId}-more`}
              data-active={[...tools, ...guideLinks, ...trustLinks].some(link => isActiveRoute(link.path)) || undefined}
              onClick={() => setMoreOpen(value => !value)} onKeyDown={event => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setMoreOpen(true); requestAnimationFrame(() => moreRef.current?.querySelector<HTMLAnchorElement>('[role=menuitem]')?.focus()); }
              }}>更多 <ChevronDownIcon size={14} /></button>
            {moreOpen && <div className={styles.dropdown} role="menu" id={`${menuId}-more`} aria-label="更多連結" onKeyDown={event => {
              const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role=menuitem]')];
              const current = links.indexOf(document.activeElement as HTMLAnchorElement);
              if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
                links[next]?.focus();
              }
            }}>
              {tools.length > 0 && <><p>我的工具</p>{tools.map(link => renderLink(link, true))}</>}
              {guideLinks.length > 0 && <><p>晚餐指南</p>{guideLinks.map(link => renderLink(link, true))}</>}
              <p>關於</p>{trustLinks.map(link => renderLink(link, true))}
            </div>}
          </div>
        </nav>
        <div className={styles.desktopAuth}>{auth}</div>
        <Link href="/recipes" className={styles.mobileSearch}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>搜尋食譜</Link>
        <button ref={mobileButton} type="button" className={styles.mobileToggle} aria-label={menuOpen ? '關閉選單' : '打開選單'} aria-expanded={menuOpen} aria-controls={`${menuId}-mobile`} onClick={() => setMenuOpen(value => !value)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={menuOpen ? 'm5 5 14 14M19 5 5 19' : 'M3 5h18M3 12h18M3 19h18'} /></svg>
        </button>
      </>}
    </div>
    {menuOpen && showNav && <nav className={styles.mobileMenu} id={`${menuId}-mobile`} aria-label="手機導航">
      {PRIMARY_LINKS.map(link => renderLink(link))}
      {tools.length > 0 && <><p>我的工具</p>{tools.map(link => renderLink(link))}</>}
      {guideLinks.length > 0 && <><p>晚餐指南</p>{guideLinks.map(link => renderLink(link))}</>}
      <p>關於</p>{trustLinks.map(link => renderLink(link))}
      <div className={styles.mobileAuth}>{auth}</div>
    </nav>}
  </header>;
}
