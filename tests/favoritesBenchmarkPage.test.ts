// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import FavoritesPerformancePage from '@/pages/favorites-performance';
const { auth } = vi.hoisted(() => ({ auth: { loading: false, isAuthenticated: true, user: { id: 'synthetic-owner' }, favoritesEpoch: 1, getAccessToken: vi.fn(async () => 'synthetic-token') } }));
vi.mock('@/hooks/useAuthGuard', () => ({ useAuthGuard: () => auth }));
vi.mock('@/features/layout/hooks/useHeaderController', () => ({ useHeaderController: () => ({}) }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('next/head', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const setup = () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true, data: { favorites: ['private-id'], recipes: [{ id: 'private-id' }] } }))));
  return render(createElement(FavoritesPerformancePage));
};
it('opens without making a GET and starts only on an explicit button press', async () => {
  setup(); await act(async () => {}); expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: '收藏效能量度' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '開始量度' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); }); expect(fetch).toHaveBeenCalledTimes(11);
  expect(screen.getByRole('status').textContent).toContain('11/22');
  fireEvent.click(screen.getByRole('button', { name: '停止' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); }); expect(fetch).toHaveBeenCalledTimes(11);
});
it('exports the completed phone run without credentials, account IDs or favorite payloads', async () => {
  setup(); vi.stubGlobal('Blob', NodeBlob); vi.stubGlobal('File', NodeFile);
  const makeUrl = vi.fn(() => 'blob:synthetic'); vi.stubGlobal('URL', { createObjectURL: makeUrl, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByRole('button', { name: '開始量度' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
  expect(screen.getByRole('status').textContent).toContain('22/22');
  fireEvent.click(screen.getByRole('button', { name: '匯出結果' }));
  const exported = JSON.parse(await (makeUrl.mock.calls as unknown as [NodeBlob][])[0][0].text());
  expect(exported.schema).toBe('prepmeal-favorites-benchmark-v2');
  expect(exported.complete).toBe(true); expect(exported.samples).toHaveLength(22);
  expect(JSON.stringify(exported)).not.toMatch(/synthetic-token|synthetic-owner|private-id|Authorization/);
  expect(click).toHaveBeenCalledTimes(1);
});
it('unmount cancels an idle run and prevents further GETs', async () => {
  const page = setup(); fireEvent.click(screen.getByRole('button', { name: '開始量度' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); }); page.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(300_000); }); expect(fetch).toHaveBeenCalledTimes(11);
});
it('account retirement resets the panel and aborts the old run', async () => {
  const page = setup(); fireEvent.click(screen.getByRole('button', { name: '開始量度' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const old = auth.user; auth.user = { id: 'another-synthetic-owner' };
  try {
    page.rerender(createElement(FavoritesPerformancePage));
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(fetch).toHaveBeenCalledTimes(11); expect(screen.getByRole('status').textContent).toContain('0/22');
  } finally { auth.user = old; }
});
it('phone comparison exports 24 balanced safe samples after explicit start', async () => {
  setup(); vi.stubGlobal('Blob', NodeBlob); vi.stubGlobal('File', NodeFile);
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify({ success: true, data: { favorites: ['private-id'], recipes: [{ id: 'private-id' }] } }), {
    headers: { 'X-PrepMeal-Favorites-Read-Path': url.endsWith('rpc') ? 'rpc' : 'rest' },
  })));
  const makeUrl = vi.fn(() => 'blob:synthetic'); vi.stubGlobal('URL', { createObjectURL: makeUrl, revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  expect(fetch).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole('button', { name: '比較 REST／RPC' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  expect(fetch).toHaveBeenCalledTimes(24); expect(screen.getByRole('status').textContent).toContain('24/24');
  expect(screen.getByLabelText('REST／RPC 對照摘要').textContent).toContain('RPC（12 次）');
  fireEvent.click(screen.getByRole('button', { name: '匯出結果' }));
  const exported = JSON.parse(await (makeUrl.mock.calls as unknown as [NodeBlob][])[0][0].text());
  expect(exported.schema).toBe('prepmeal-favorites-comparison-v1'); expect(exported.complete).toBe(true);
  expect(JSON.stringify(exported)).not.toMatch(/private-id|synthetic-token|synthetic-owner|Authorization/);
});
it('switching accounts cancels a stalled comparison and resets its samples', async () => {
  const page = setup(); vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  fireEvent.click(screen.getByRole('button', { name: '比較 REST／RPC' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
  const old = auth.user; auth.user = { id: 'new-synthetic-owner' };
  try {
    page.rerender(createElement(FavoritesPerformancePage));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(fetch).toHaveBeenCalledTimes(1); expect(screen.getByRole('status').textContent).toContain('0/22');
  } finally { auth.user = old; }
});
