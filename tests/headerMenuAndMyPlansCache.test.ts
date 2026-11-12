// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { PRIMARY_LINKS, TOOL_LINKS, GUIDE_LINKS, TRUST_LINKS, isNavigationRouteActive } from '@/features/layout/navigation';
import {
  clearMyPlans, invalidateMyPlans, isMyPlansStale, loadMyPlans, peekMyPlans, prefetchMyPlans, setMyPlans,
} from '@/features/plans/myPlansCache';

const route = vi.hoisted(() => ({ pathname: '/recipes' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: ComponentProps<'a'>) => createElement('a', { ...props, href }, children) }));

const trustLinks = [{ label: '關於我們', path: '/about' }];
const guideLinks = [{ label: '健康晚餐', path: '/healthy-dinner-guide' }];
const accountLinks = [{ label: '個人資料', path: '/profile' }];

describe('Header "更多" menu', () => {
  afterEach(cleanup);
  const openMenu = () => {
    render(createElement('div', null,
      createElement(Header, { trustLinks, guideLinks, accountLinks, isAuthenticated: true }),
      createElement('p', null, 'page body')));
    fireEvent.click(screen.getByRole('button', { name: /更多/ }));
    expect(screen.getByRole('menu')).toBeTruthy();
  };

  it('closes on a click outside the menu', () => {
    openMenu();
    fireEvent.pointerDown(screen.getByText('page body'));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('stays open on a click inside the menu, closes on Escape', () => {
    openMenu();
    fireEvent.pointerDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('lists guide pages and shows 個人資料 when signed in', () => {
    openMenu();
    expect(screen.getByRole('menuitem', { name: '健康晚餐' }).getAttribute('href')).toBe('/healthy-dinner-guide');
    expect(screen.getAllByRole('link', { name: '個人資料' })[0].getAttribute('href')).toBe('/profile');
  });

  it('hides 個人資料 when signed out', () => {
    render(createElement(Header, { trustLinks, guideLinks, accountLinks, isAuthenticated: false }));
    expect(screen.queryByRole('link', { name: '個人資料' })).toBeNull();
  });
});

describe('shared site navigation and footer', () => {
  beforeEach(() => { route.pathname = '/'; });
  afterEach(cleanup);

  it('uses the same primary labels and destinations, with correct active routes', () => {
    route.pathname = '/generate';
    render(createElement(Header, { isActiveRoute: path => isNavigationRouteActive(route.pathname, path) }));
    const nav = screen.getByRole('navigation', { name: '主要導航' });
    expect(within(nav).getAllByRole('link').map(link => [link.textContent, link.getAttribute('href')])).toEqual(PRIMARY_LINKS.map(link => [link.label, link.path]));
    expect(within(nav).getByRole('link', { name: '一週餐單' }).getAttribute('aria-current')).toBe('page');
    expect(isNavigationRouteActive('/', '/#home-guides')).toBe(false);
    expect(isNavigationRouteActive('/recipes/a', '/recipes')).toBe(true);
    expect(isNavigationRouteActive('/recipes-other', '/recipes')).toBe(false);
  });

  it('keeps tools reachable and preserves intent prefetch handlers', () => {
    const favorites = vi.fn(), plans = vi.fn();
    render(createElement(Header, { onFavoritesIntent: favorites, onMyPlansIntent: plans }));
    fireEvent.click(screen.getByRole('button', { name: '更多' }));
    for (const link of TOOL_LINKS) expect(screen.getByRole('menuitem', { name: link.label }).getAttribute('href')).toBe(link.path);
    fireEvent.focus(screen.getByRole('menuitem', { name: '收藏' }));
    fireEvent.touchStart(screen.getByRole('menuitem', { name: '我的餐單' }));
    expect(favorites).toHaveBeenCalledTimes(1); expect(plans).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '更多' }));
  });

  it('shares mobile labels, shows login, and closes on Escape and route changes', () => {
    const view = render(createElement(Header));
    fireEvent.click(screen.getByRole('button', { name: '打開選單' }));
    const nav = screen.getByRole('navigation', { name: '手機導航' });
    for (const link of [...PRIMARY_LINKS, ...TOOL_LINKS, ...GUIDE_LINKS, ...TRUST_LINKS]) expect(within(nav).getByRole('link', { name: link.label }).getAttribute('href')).toBe(link.path);
    expect(within(nav).getByRole('link', { name: '登入' }).getAttribute('href')).toBe('/login');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: '手機導航' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '打開選單' }));
    fireEvent.click(screen.getByRole('button', { name: '打開選單' }));
    route.pathname = '/generate'; view.rerender(createElement(Header));
    expect(screen.queryByRole('navigation', { name: '手機導航' })).toBeNull();
  });

  it('shows account and logout in both signed-in menus and respects logout pending', () => {
    const logout = vi.fn();
    render(createElement(Header, { isAuthenticated: true, handleLogout: logout }));
    fireEvent.click(screen.getByRole('button', { name: '打開選單' }));
    const nav = screen.getByRole('navigation', { name: '手機導航' });
    expect(within(nav).getByRole('link', { name: '個人資料' }).getAttribute('href')).toBe('/profile');
    expect(within(nav).queryByRole('link', { name: '登入' })).toBeNull();
    fireEvent.click(within(nav).getByRole('button', { name: '登出' }));
    expect(logout).toHaveBeenCalledTimes(1);
    cleanup(); render(createElement(Header, { isAuthenticated: true, loggingOut: true }));
    expect((screen.getByRole('button', { name: '登出中...' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps all existing footer destinations and privacy controls in the single footer', () => {
    render(createElement(Footer));
    const footer = screen.getByRole('contentinfo');
    const hrefs = within(footer).getAllByRole('link').map(link => link.getAttribute('href'));
    for (const path of ['/', '/generate', '/recipes', '/favorites', '/my-plans', '/profile', '/login', ...GUIDE_LINKS.map(link => link.path), ...TRUST_LINKS.map(link => link.path), 'mailto:eatwhathk247@gmail.com', 'tel:+85294959673']) expect(hrefs).toContain(path);
    expect(within(footer).getByRole('button', { name: '管理私隱選項' })).toBeTruthy();
  });
});

describe('my plans cache', () => {
  const reply = (plans: unknown[]) => ({ ok: true, json: async () => ({ success: true, data: { plans } }) });
  beforeEach(() => { clearMyPlans(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply([{ id: 'p1' }]))); });
  afterEach(() => { clearMyPlans(); vi.unstubAllGlobals(); });

  it('prefetch and page load share one request, then the list is cached for that user only', async () => {
    prefetchMyPlans('u1', 't');
    const plans = await loadMyPlans('u1', 't');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(plans).toEqual([{ id: 'p1' }]);
    expect(peekMyPlans('u1')).toEqual([{ id: 'p1' }]);
    expect(peekMyPlans('u2')).toBeNull();
    expect(isMyPlansStale('u1')).toBe(false);
  });

  it('saving a plan marks the list stale, and a request started before cannot overwrite it', async () => {
    let finish!: (v: unknown) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(r => { finish = r; }) as never);
    const early = loadMyPlans('u1', 't');
    invalidateMyPlans();
    finish(reply([{ id: 'old' }]));
    await early;
    expect(peekMyPlans('u1')).toBeNull();
    expect(isMyPlansStale('u1')).toBe(true);
  });

  it('a saved plan makes the cached list stale until the refresh lands', async () => {
    await loadMyPlans('u1', 't');
    invalidateMyPlans();
    expect(isMyPlansStale('u1')).toBe(true);
    vi.mocked(fetch).mockResolvedValueOnce(reply([{ id: 'p1' }, { id: 'p2' }]) as never);
    await loadMyPlans('u1', 't');
    expect(isMyPlansStale('u1')).toBe(false);
    expect(peekMyPlans('u1')).toHaveLength(2);
  });

  it('delete keeps the cache in step; logout clears it', async () => {
    await loadMyPlans('u1', 't');
    setMyPlans('u1', []);
    expect(peekMyPlans('u1')).toEqual([]);
    clearMyPlans();
    expect(peekMyPlans('u1')).toBeNull();
  });

  it('a failed response is an error and is not cached', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, json: async () => ({ success: false }) } as never);
    await expect(loadMyPlans('u1', 't')).rejects.toThrow();
    expect(peekMyPlans('u1')).toBeNull();
  });
});
