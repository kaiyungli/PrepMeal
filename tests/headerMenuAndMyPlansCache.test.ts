// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import Header from '@/components/layout/Header';
import {
  clearMyPlans, invalidateMyPlans, isMyPlansStale, loadMyPlans, peekMyPlans, prefetchMyPlans, setMyPlans,
} from '@/features/plans/myPlansCache';

vi.mock('next/navigation', () => ({ usePathname: () => '/recipes' }));
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
