// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createElement } from 'react';
import { File as NodeFile } from 'node:buffer';
import { useFilteredRecipes } from '@/features/recipes/hooks/useFilteredRecipes';
import { useNavigationDataReady } from '@/features/performance/useNavigationDataReady';
import { fetchRecipesFromAPI } from '@/features/recipes/services/fetchRecipesFromAPI';
import Overlay, { NavigationMeasurementLauncher } from '@/features/performance/NavigationMeasurement';
import { beginNavigationStep, cancelNavigationStep, clearNavigationMeasurement, exportNavigationMeasurement, getNavigationMeasurement,
  measurementScope, navigationDataReady, navigationRouteCompleted, navigationRouteStarted, startNavigationMeasurement, validateNavigationScope } from '@/features/performance/navigationMeasurement';
const { events, auth, router } = vi.hoisted(() => {
  const events = { on: vi.fn(), off: vi.fn() };
  return { events, auth: { loading: false, isAuthenticated: true, user: { id: 'private-owner' }, favoritesEpoch: 1 }, router: { events, push: vi.fn(async () => true) } };
});
vi.mock('next/router', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/features/recipes/services/fetchRecipesFromAPI', () => ({ fetchRecipesFromAPI: vi.fn() }));
const scope = () => measurementScope(auth.user.id, auth.favoritesEpoch);
beforeEach(() => { clearNavigationMeasurement(); vi.useFakeTimers(); vi.clearAllMocks(); auth.loading = false; auth.isAuthenticated = true; auth.user = { id: 'private-owner' }; auth.favoritesEpoch = 1; });
afterEach(() => { cleanup(); clearNavigationMeasurement(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('is idle by default and does not install route handlers or start requests', () => {
  vi.stubGlobal('fetch', vi.fn()); render(createElement(Overlay));
  expect(screen.queryByLabelText('導航量度控制')).toBeNull(); expect(events.on).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('waits for both route completion and data readiness in either order', () => {
  startNavigationMeasurement('desktop', scope()); beginNavigationStep();
  navigationRouteCompleted('/favorites?token=private-token'); expect(getNavigationMeasurement().running).toBe(true);
  navigationDataReady('recipes'); expect(getNavigationMeasurement().samples).toHaveLength(0);
  navigationDataReady('favorites'); expect(getNavigationMeasurement().samples[0].outcome).toBe('ready');
  beginNavigationStep(); navigationDataReady('recipes'); expect(getNavigationMeasurement().running).toBe(true);
  navigationRouteCompleted('/recipes'); expect(getNavigationMeasurement().samples).toHaveLength(2);
});
it('the four-step export contains fixed page labels and safe measurements only', () => {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { name: `${window.location.origin}/api/user/favorites?recipe_id=private-recipe`, responseEnd: performance.now() + 20 },
    { name: 'https://private.example/api/private', responseEnd: performance.now() + 20 },
  ] as unknown as PerformanceEntry[]);
  startNavigationMeasurement('phone', scope());
  for (const page of ['favorites', 'recipes', 'favorites', 'home'] as const) {
    expect(beginNavigationStep()).toBe(page); vi.advanceTimersByTime(50);
    navigationRouteCompleted(page === 'home' ? '/' : `/${page}`); navigationDataReady(page);
  }
  const exported = exportNavigationMeasurement();
  expect(exported.complete).toBe(true); expect(exported.samples).toHaveLength(4);
  expect(exported.samples[0].completed_api_resources).toBe(1);
  expect(JSON.stringify(exported)).not.toMatch(/private-owner|private-token|private-recipe|private\.example|https?:\/\//);
  expect(beginNavigationStep()).toBeNull();
});
it('timeout, route cancellation and hidden interruption remain incomplete', () => {
  startNavigationMeasurement('phone', scope()); beginNavigationStep(); vi.advanceTimersByTime(15_000);
  expect(getNavigationMeasurement().samples[0].outcome).toBe('timeout');
  beginNavigationStep(); navigationRouteStarted('/recipes/private-id'); expect(getNavigationMeasurement().samples[1].outcome).toBe('cancelled');
  beginNavigationStep(); cancelNavigationStep('hidden'); expect(getNavigationMeasurement().samples[2].outcome).toBe('hidden');
  expect(exportNavigationMeasurement().complete).toBe(false);
});
it('logout or a changed login epoch discards the run and retires late callbacks', () => {
  startNavigationMeasurement('desktop', scope()); beginNavigationStep(); validateNavigationScope(measurementScope('private-owner', 2));
  navigationDataReady('favorites'); navigationRouteCompleted('/favorites'); vi.advanceTimersByTime(15_000);
  expect(getNavigationMeasurement().enabled).toBe(false); expect(getNavigationMeasurement().samples).toEqual([]);
});
it('explicit launcher starts a panel; navigation only starts on the step button', async () => {
  render(createElement('div', {}, createElement(NavigationMeasurementLauncher, { userId: auth.user.id, epoch: 1 }), createElement(Overlay)));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'phone' } });
  fireEvent.click(screen.getByRole('button', { name: '開始導航量度' }));
  expect(router.push).not.toHaveBeenCalled(); expect(events.on).toHaveBeenCalledTimes(3);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '首次測試收藏' })); });
  expect(router.push).toHaveBeenCalledExactlyOnceWith('/favorites');
  await act(async () => { navigationRouteCompleted('/favorites'); navigationDataReady('favorites'); });
  expect(screen.getByRole('status').textContent).toContain('1/4');
  fireEvent.click(screen.getByRole('button', { name: '結束量度' })); expect(screen.queryByLabelText('導航量度控制')).toBeNull();
});
it('auth transition and overlay unmount cancel issued timing without navigating', async () => {
  startNavigationMeasurement('desktop', scope()); const view = render(createElement(Overlay));
  act(() => { beginNavigationStep(); }); auth.loading = true; view.rerender(createElement(Overlay));
  expect(getNavigationMeasurement().enabled).toBe(false); expect(router.push).not.toHaveBeenCalled();
  auth.loading = false; act(() => { startNavigationMeasurement('desktop', scope()); beginNavigationStep(); });
  view.unmount(); expect(getNavigationMeasurement().running).toBe(false); expect(events.off).toHaveBeenCalled();
});
it('an empty initial recipe list is not ready during debounce or its pending API request', async () => {
  let complete!: (value: { recipes: never[]; total: number }) => void;
  vi.mocked(fetchRecipesFromAPI).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  startNavigationMeasurement('desktop', scope()); beginNavigationStep(); navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  beginNavigationStep(); navigationRouteCompleted('/recipes');
  const filters = { protein: ['measurement-empty'] };
  renderHook(() => {
    const list = useFilteredRecipes([], { filters, searchQuery: '' });
    useNavigationDataReady('recipes', () => list.isListSettled() && !list.loading, Boolean(list.fetchError));
  });
  expect(getNavigationMeasurement().running).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(300); });
  expect(getNavigationMeasurement().running).toBe(true);
  await act(async () => { complete({ recipes: [], total: 0 }); });
  expect(getNavigationMeasurement().samples[1].outcome).toBe('ready');
});
it('a supplied initial recipe list is ready without issuing another API read', () => {
  startNavigationMeasurement('desktop', scope()); beginNavigationStep(); navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  beginNavigationStep(); navigationRouteCompleted('/recipes');
  const filters = {};
  renderHook(() => {
    const list = useFilteredRecipes([{ id: 'private-recipe' }], { filters, searchQuery: '', initialTotalCount: 1 });
    useNavigationDataReady('recipes', () => list.isListSettled() && !list.loading);
  });
  expect(getNavigationMeasurement().samples[1].outcome).toBe('ready'); expect(fetchRecipesFromAPI).not.toHaveBeenCalled();
});
it('native phone sharing exports the safe file and marks successful four-step completion', async () => {
  vi.stubGlobal('File', NodeFile);
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share, canShare: () => true });
  startNavigationMeasurement('phone', scope());
  for (const page of ['favorites', 'recipes', 'favorites', 'home'] as const) {
    beginNavigationStep(); navigationRouteCompleted(page === 'home' ? '/' : `/${page}`); navigationDataReady(page);
  }
  render(createElement(Overlay));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '匯出導航結果' })); });
  expect(share).toHaveBeenCalledTimes(1);
  const file = share.mock.calls[0][0].files[0] as NodeFile;
  expect(file.name).toBe('PrepMeal_Navigation_phone.json');
  const data = JSON.parse(await file.text()); expect(data.complete).toBe(true);
  expect(JSON.stringify(data)).not.toMatch(/private-owner|private-recipe|token|Authorization/);
});
it('desktop export downloads an attached anchor instead of invoking native share, without File support', async () => {
  const share = vi.fn(); vi.stubGlobal('navigator', { share, canShare: () => true }); vi.stubGlobal('File', undefined);
  const revoke = vi.fn(); vi.stubGlobal('URL', { createObjectURL: () => 'blob:desktop', revokeObjectURL: revoke });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(document.body.contains(this)).toBe(true); expect(this.download).toBe('PrepMeal_Navigation_desktop.json');
  });
  startNavigationMeasurement('desktop', scope()); beginNavigationStep(); navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  render(createElement(Overlay));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '匯出導航結果' })); });
  expect(click).toHaveBeenCalledTimes(1); expect(share).not.toHaveBeenCalled();
  expect(JSON.parse((screen.getByLabelText('導航結果 JSON') as HTMLTextAreaElement).value).samples).toHaveLength(1);
  expect(document.querySelector('a[download]')).toBeNull(); expect(revoke).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); }); expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:desktop');
});
it('rejected phone sharing retains results and offers a separate explicit download', async () => {
  vi.stubGlobal('File', NodeFile); vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new Error('cancelled')), canShare: () => true });
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:phone', revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  startNavigationMeasurement('phone', scope()); beginNavigationStep(); navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  render(createElement(Overlay));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '匯出導航結果' })); });
  expect(click).not.toHaveBeenCalled(); expect(getNavigationMeasurement().samples).toHaveLength(1);
  expect(screen.getByLabelText('導航結果 JSON')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '直接下載 JSON' })); expect(click).toHaveBeenCalledTimes(1);
  act(() => { clearNavigationMeasurement(); startNavigationMeasurement('phone', scope()); });
  expect(screen.queryByLabelText('導航結果 JSON')).toBeNull();
});
it('a blocked desktop download still exposes copyable JSON and does not discard completed samples', async () => {
  vi.stubGlobal('URL', { createObjectURL: () => { throw new Error('blocked'); }, revokeObjectURL: vi.fn() });
  startNavigationMeasurement('desktop', scope()); beginNavigationStep(); navigationRouteCompleted('/favorites'); navigationDataReady('favorites');
  render(createElement(Overlay));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '匯出導航結果' })); });
  const text = screen.getByLabelText('導航結果 JSON') as HTMLTextAreaElement;
  expect(JSON.parse(text.value).samples).toHaveLength(1); expect(getNavigationMeasurement().samples).toHaveLength(1);
});
