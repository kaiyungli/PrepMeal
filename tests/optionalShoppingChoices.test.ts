// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useOptionalSelections } from '@/features/shopping-list/optionalSelections';
import { useGeneratedShoppingList } from '@/features/generate/hooks/useGeneratedShoppingList';
import { useSavedPlanShoppingList } from '@/features/plans/hooks/useSavedPlanShoppingList';
import { vegetarianProductNote } from '@/constants/vegetarianProductNotes';
import OptionalIngredientChoices from '@/components/shopping/OptionalIngredientChoices';

const auth = vi.hoisted(() => ({ user: { id: 'choice-A' } as { id: string } | null, isAuthenticated: true, getAccessToken: vi.fn(async () => 'synthetic-token') }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const groups = [{ recipeId: 'r1', recipeName: '測試薄餅', ingredients: [{ ingredientId: 'beef', name: '牛肉' }, { ingredientId: 'shrimp', name: '蝦' }] }];
beforeEach(() => { localStorage.clear(); auth.user = { id: 'choice-A' }; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shares explicit choices across mounted consumers, reloads from storage, and isolates accounts', () => {
  const a = renderHook(() => useOptionalSelections('choice-A'));
  const b = renderHook(() => useOptionalSelections('choice-A'));
  const other = renderHook(() => useOptionalSelections('choice-B'));
  act(() => a.result.current.select('r1', []));
  expect(b.result.current.selections).toEqual({ r1: [] });
  expect(other.result.current.selections).toEqual({});
  a.unmount(); b.unmount();
  const reloaded = renderHook(() => useOptionalSelections('choice-A'));
  expect(reloaded.result.current.selections).toEqual({ r1: [] });
  const switching = renderHook(({ user }) => useOptionalSelections(user), { initialProps: { user: 'choice-A' as string | null } });
  switching.rerender({ user: null }); expect(switching.result.current.selections).toEqual({});
  switching.rerender({ user: 'choice-B' }); expect(switching.result.current.selections).toEqual({});
});

it('requires an explicit UI action before excluding optional ingredients', () => {
  render(createElement(OptionalIngredientChoices, { groups }));
  const shrimp = screen.getByRole('checkbox', { name: '蝦' }) as HTMLInputElement;
  expect(shrimp.checked).toBe(true);
  fireEvent.click(shrimp);
  expect(JSON.parse(localStorage.getItem('optional-shopping-v1:choice-A')!).r1).toEqual(['beef']);
  fireEvent.click(screen.getByRole('button', { name: '只用基本材料' }));
  expect(JSON.parse(localStorage.getItem('optional-shopping-v1:choice-A')!).r1).toEqual([]);
  expect((screen.getByRole('checkbox', { name: '牛肉' }) as HTMLInputElement).checked).toBe(false);
});

it('refetches an open generated list after a choice changes rather than returning its old memory result', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pantry: [], toBuy: [], byRecipe: [], summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 }, optionalIngredients: groups }) });
  vi.stubGlobal('fetch', fetcher);
  const options = { weeklyPlan: { mon: [{ id: 'r1' }] }, pantryIngredients: [], servings: 2, isAuthenticated: true, userId: 'choice-A', getAccessToken: auth.getAccessToken };
  const { result } = renderHook(() => ({ list: useGeneratedShoppingList(options), choice: useOptionalSelections('choice-A') }));
  await act(async () => { await result.current.list.handleOpenShoppingList(); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  act(() => result.current.choice.select('r1', []));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  expect(JSON.parse(fetcher.mock.calls[1][1].body).optionalSelections).toEqual({ r1: [] });
  await waitFor(() => expect(result.current.list.isShoppingListLoading).toBe(false));
});

it('invalidates a saved list on selection and maps meat to the drawer canonical category', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pantry: [], toBuy: [{ category: 'meat', items: [{ name: '雞肉', quantity: 250, unit: 'g' }] }], byRecipe: [], optionalIngredients: groups }) });
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => ({ list: useSavedPlanShoppingList({ recipeIds: ['r1', 'r1'], servings: 4 }), choice: useOptionalSelections('choice-A') }));
  await act(async () => { await result.current.list.fetchShoppingList(); });
  expect(result.current.list.shoppingList?.byCategory.toBuy.meat).toHaveLength(1);
  act(() => result.current.choice.select('r1', ['shrimp']));
  expect(result.current.list.shoppingList).toBeNull();
  await act(async () => { await result.current.list.fetchShoppingList(); });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ recipeIds: ['r1', 'r1'], servings: 4, optionalSelections: { r1: ['shrimp'] } });
});

it('only adds product requirements to actual vegetarian composite ingredients', () => {
  expect(vegetarianProductNote(['vegetarian'], [{ name: '日式咖哩磚', slug: 'japanese-curry-roux' }])).toContain('適合素食');
  expect(vegetarianProductNote([], [{ name: '泡菜', slug: 'kimchi' }])).toBeNull();
  expect(vegetarianProductNote(['vegetarian'], [{ name: '水', slug: 'water' }])).toBeNull();
});
