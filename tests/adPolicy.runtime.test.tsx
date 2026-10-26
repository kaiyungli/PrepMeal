import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdSlot from '@/components/ads/AdSlot';
import RecipeDetailContent from '@/components/RecipeDetailContent';

const state = vi.hoisted(() => ({ enabled: true, pathname: '/recipes/[id]', asPath: '/recipes/a', fallback: false, load: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ pathname: state.pathname, asPath: state.asPath, isFallback: state.fallback }) }));
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock('@/constants/ads', async importOriginal => {
  const actual = await importOriginal<typeof import('@/constants/ads')>();
  return { ...actual, isAdSenseEnabled: () => state.enabled,
    isVerifiedAdSlot: (value: unknown) => actual.isVerifiedAdSlot(value, ['9876543210']),
    AD_SLOT_IDS: { recipeDetailInArticle: '9876543210' } };
});
vi.mock('@/components/ads/loadAdSense', () => ({ loadAdSense: state.load }));
let ready: () => void;
let fail: (error: Error) => void;
let push: ReturnType<typeof vi.fn>;
beforeEach(() => {
  state.enabled = true; state.pathname = '/recipes/[id]'; state.asPath = '/recipes/a'; state.fallback = false;
  state.load.mockReset();
  const promise = new Promise<void>((resolve, reject) => { ready = resolve; fail = reject; });
  state.load.mockReturnValue(promise);
  push = vi.fn();
  Object.assign(window, { adsbygoogle: { push } });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(window, 'adsbygoogle'); });
async function loaded() { await act(async () => { ready(); }); }

describe('ad request boundaries', () => {
  it('has no DOM box or SDK call with disabled or invalid configuration', () => {
    state.enabled = false;
    const view = render(<AdSlot slotId="9876543210" />);
    expect(view.container.innerHTML).toBe('');
    state.enabled = true;
    view.rerender(<AdSlot slotId="1234567890" />);
    expect(view.container.innerHTML).toBe(''); expect(state.load).not.toHaveBeenCalled();
  });
  it.each(['/login', '/auth/callback', '/generate', '/my-plans', '/favorites', '/profile', '/admin', '/404', '/_error', '/recipes'])('does not load an SDK on %s even with a reviewed slot', pathname => {
    state.pathname = pathname;
    const view = render(<AdSlot slotId="9876543210" />);
    expect(view.container.innerHTML).toBe(''); expect(state.load).not.toHaveBeenCalled();
  });
  it('does not load an SDK for a fallback page', () => {
    state.fallback = true;
    render(<AdSlot slotId="9876543210" />);
    expect(state.load).not.toHaveBeenCalled();
  });
  it('waits for the SDK, then issues one request under StrictMode', async () => {
    const view = render(<StrictMode><AdSlot slotId="9876543210" /></StrictMode>);
    expect(push).not.toHaveBeenCalled();
    await loaded();
    expect(push).toHaveBeenCalledOnce();
    expect(view.container.querySelector('ins')?.getAttribute('data-ad-client')).toBe('ca-pub-7449807224140811');
  });
  it('cancels a late SDK callback after moving to a private page', async () => {
    const view = render(<AdSlot slotId="9876543210" />);
    state.pathname = '/my-plans'; state.asPath = '/my-plans';
    view.rerender(<AdSlot slotId="9876543210" />);
    await loaded();
    expect(push).not.toHaveBeenCalled(); expect(view.container.innerHTML).toBe('');
  });
  it('makes no new request after an already loaded slot moves to a private page', async () => {
    const view = render(<AdSlot slotId="9876543210" />); await loaded();
    expect(push).toHaveBeenCalledOnce();
    state.pathname = '/login'; state.asPath = '/login';
    view.rerender(<AdSlot slotId="9876543210" />);
    expect(view.container.innerHTML).toBe(''); expect(push).toHaveBeenCalledOnce();
  });
  it('does not refresh ads just because a query or fragment changes', async () => {
    const view = render(<AdSlot slotId="9876543210" />); await loaded();
    state.asPath = '/recipes/a?view=steps#ingredients';
    view.rerender(<AdSlot slotId="9876543210" />);
    expect(push).toHaveBeenCalledOnce();
    state.asPath = '/recipes/b'; view.rerender(<AdSlot slotId="9876543210" />);
    await act(async () => {});
    expect(push).toHaveBeenCalledTimes(2);
  });
  it('collapses the slot if the SDK fails', async () => {
    const view = render(<AdSlot slotId="9876543210" />);
    await act(async () => { fail(new Error('Network failed')); });
    expect(view.container.innerHTML).toBe(''); expect(push).not.toHaveBeenCalled();
  });
  it('does not mount an ad in the shared quick-preview content', () => {
    const view = render(<RecipeDetailContent recipe={{ id: 'a', name: 'Recipe', ingredients: [], steps: [] }} />);
    expect(view.container.querySelector('ins')).toBeNull(); expect(state.load).not.toHaveBeenCalled();
  });
});
