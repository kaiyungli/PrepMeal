// @vitest-environment jsdom
import { createElement, useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecipeDetailModal } from '@/features/recipes/hooks/useRecipeDetailModal';
import { getCachedRecipeDetail, prefetchRecipeDetail, setCachedRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';
import RecipeModalController from '@/components/RecipeModalController';

type Recipe = { id: string; name: string; ingredients?: { name: string }[]; steps?: string[] };
// Keep the real controller, hook and cache; inspect their presentation/action
// boundary without unrelated ads, image loading or modal styling.
vi.mock('@/components/RecipeDetailModal', () => ({
  default: ({ isOpen, recipe, onClose, onFavoriteClick }: {
    isOpen: boolean; recipe: Recipe | null; onClose: () => void; onFavoriteClick: () => void;
  }) => isOpen ? createElement('section', null,
    createElement('span', { 'data-testid': 'detail-name' }, recipe?.name),
    createElement('span', { 'data-testid': 'detail-ingredients' }, recipe?.ingredients?.map(x => x.name).join(',')),
    createElement('button', { onClick: onClose }, 'close preview'),
    createElement('button', { onClick: onFavoriteClick }, 'favorite preview'),
  ) : null,
}));

const fetchMock = vi.fn<typeof fetch>();
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const recipe = (id: string): Recipe => ({ id, name: id });
const detail = (r: Recipe): Recipe => ({ ...r, ingredients: [{ name: `${r.id} ingredient` }], steps: [`${r.id} step`] });
const response = (r: Recipe) => new Response(JSON.stringify({ recipe: r }), { status: 200 });
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('recipe response isolation with the real prefetch cache', () => {
  it('A → B → C keeps C when shared responses arrive in reverse order', async () => {
    const recipes = ['integration-rapid-a', 'integration-rapid-b', 'integration-rapid-c'].map(recipe);
    const pending = recipes.map(() => deferred<Response>());
    fetchMock.mockImplementation(url => pending[recipes.findIndex(r => String(url).endsWith(r.id))].promise);
    const prefetched = recipes.map(r => prefetchRecipeDetail(r.id));
    const { result, rerender } = renderHook(({ selected }) => useRecipeDetailModal(selected, { onClose: vi.fn() }), {
      initialProps: { selected: recipes[0] },
    });
    rerender({ selected: recipes[1] });
    rerender({ selected: recipes[2] });
    for (const index of [2, 1, 0]) {
      await act(async () => { pending[index].resolve(response(detail(recipes[index]))); await prefetched[index]; });
      expect(result.current.recipe).toEqual(detail(recipes[2]));
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Obsolete modal callbacks do not cancel useful shared cache work.
    for (const r of recipes) expect(getCachedRecipeDetail(r.id)).toEqual(detail(r));
  });

  it('closing one preview does not abort a shared prefetch used by another', async () => {
    const a = recipe('integration-shared-a');
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const prefetched = prefetchRecipeDetail(a.id);
    const first = renderHook(() => useRecipeDetailModal(a, { onClose: vi.fn() }));
    const second = renderHook(() => useRecipeDetailModal(a, { onClose: vi.fn() }));
    act(() => first.result.current.close());
    await act(async () => { pending.resolve(response(detail(a))); await prefetched; });
    expect(first.result.current.recipe).toEqual(a);
    expect(first.result.current.loading).toBe(false);
    expect(second.result.current.recipe).toEqual(detail(a));
    expect(second.result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reopening the same ID can reuse the still-running shared prefetch', async () => {
    const a = recipe('integration-reopen-a');
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const prefetched = prefetchRecipeDetail(a.id);
    const { result, rerender } = renderHook(({ selected }: { selected: Recipe | null }) => useRecipeDetailModal(selected, { onClose: vi.fn() }), {
      initialProps: { selected: a as Recipe | null },
    });
    act(() => result.current.close());
    rerender({ selected: null });
    rerender({ selected: a });
    await act(async () => { pending.resolve(response(detail(a))); await prefetched; });
    expect(result.current.recipe).toEqual(detail(a));
    expect(result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Strict Mode uses one shared prefetch and ignores the discarded effect', async () => {
    const a = recipe('integration-strict-prefetch-a');
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const prefetched = prefetchRecipeDetail(a.id);
    const { result } = renderHook(() => useRecipeDetailModal(a, { onClose: vi.fn() }), { reactStrictMode: true });
    await act(async () => { pending.resolve(response(detail(a))); await prefetched; });
    expect(result.current.recipe).toEqual(detail(a));
    expect(result.current.loading).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('Strict Mode aborts the first direct fetch and accepts only the active one', async () => {
    const a = recipe('integration-strict-direct-a');
    const first = deferred<Response>();
    const second = deferred<Response>();
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useRecipeDetailModal(a, { onClose: vi.fn() }), { reactStrictMode: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => { second.resolve(response(detail(a))); });
    await act(async () => { first.resolve(response({ ...detail(a), name: 'obsolete strict response' })); });
    expect(result.current.recipe).toEqual(detail(a));
    expect(getCachedRecipeDetail(a.id)).toEqual(detail(a));
    expect(result.current.loading).toBe(false);
  });

  it('switching after headers but before JSON parsing completes cannot cache or display A', async () => {
    const a = recipe('integration-json-a');
    const b = recipe('integration-json-b');
    const body = deferred<{ recipe: Recipe }>();
    const headers = new Response('', { status: 200 });
    vi.spyOn(headers, 'json').mockReturnValue(body.promise);
    fetchMock.mockResolvedValue(headers);
    setCachedRecipeDetail(b.id, detail(b));
    const { result, rerender } = renderHook(({ selected }) => useRecipeDetailModal(selected, { onClose: vi.fn() }), {
      initialProps: { selected: a },
    });
    await act(async () => {});
    expect(headers.json).toHaveBeenCalledTimes(1);
    rerender({ selected: b });
    await act(async () => { body.resolve({ recipe: detail(a) }); });
    expect(result.current.recipe).toEqual(detail(b));
    expect(getCachedRecipeDetail(a.id)).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('the controller displays and favorites B after close A → open B → late A', async () => {
    const a = recipe('integration-controller-a');
    const b = recipe('integration-controller-b');
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    const prefetched = prefetchRecipeDetail(a.id);
    setCachedRecipeDetail(b.id, detail(b));
    const favorite = vi.fn();
    function Harness() {
      const [selected, setSelected] = useState<Recipe | null>(a);
      return createElement('div', null,
        createElement('button', { onClick: () => setSelected(b) }, 'open B'),
        createElement(RecipeModalController, {
          selectedRecipe: selected, onClose: () => setSelected(null),
          onFavoriteClick: () => favorite(selected?.id),
        }),
      );
    }
    render(createElement(Harness));
    fireEvent.click(screen.getByRole('button', { name: 'close preview' }));
    expect(screen.queryByTestId('detail-name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open B' }));
    await act(async () => { pending.resolve(response(detail(a))); await prefetched; });
    expect(screen.getByTestId('detail-name').textContent).toBe(b.name);
    expect(screen.getByTestId('detail-ingredients').textContent).toBe(`${b.id} ingredient`);
    fireEvent.click(screen.getByRole('button', { name: 'favorite preview' }));
    expect(favorite).toHaveBeenCalledExactlyOnceWith(b.id);
  });
});
