import { beforeEach, describe, expect, it, vi } from 'vitest';
const { range, visibility, slugFilter } = vi.hoisted(() => ({ range: vi.fn(), visibility: vi.fn(), slugFilter: vi.fn() }));
vi.mock('@/lib/supabaseServer', () => ({ supabaseServer: {
  from: () => ({ select: () => ({ eq: (column: string, value: boolean) => {
    visibility(column, value);
    return { not: (column: string, operator: string, value: null) => {
      slugFilter(column, operator, value);
      return { order: () => ({ range }) };
    } };
  } }) }),
} }));
import { fetchRecipeLinkCatalog } from '@/lib/recipesServer';
beforeEach(() => { range.mockReset(); visibility.mockReset(); slugFilter.mockReset(); });
const page = (n: number, count: number) => ({ data: Array.from({ length: n }, (_, i) => ({ slug: `recipe-${i}` })), error: null, count });
describe('public recipe link catalogue completeness', () => {
  it('returns a complete catalogue and a genuinely empty catalogue', async () => {
    range.mockResolvedValueOnce(page(3, 3)).mockResolvedValueOnce(page(0, 0));
    expect(await fetchRecipeLinkCatalog()).toHaveLength(3);
    expect(await fetchRecipeLinkCatalog()).toEqual([]);
    expect(visibility.mock.calls).toEqual([['is_public', true], ['is_public', true]]);
    expect(slugFilter.mock.calls).toEqual([['slug', 'is', null], ['slug', 'is', null]]);
  });
  it('fetches all pages rather than returning the first thousand', async () => {
    range.mockResolvedValueOnce(page(1000, 1002)).mockResolvedValueOnce(page(2, 1002));
    expect(await fetchRecipeLinkCatalog()).toHaveLength(1002);
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });
  it('rejects a truncated result and a missing exact count', async () => {
    range.mockResolvedValueOnce(page(1, 3)).mockResolvedValueOnce({ ...page(1, 1), count: null });
    expect(await fetchRecipeLinkCatalog()).toBeNull();
    expect(await fetchRecipeLinkCatalog()).toBeNull();
  });
  it('discards partial pages on errors or a catalogue count change', async () => {
    range.mockResolvedValueOnce(page(1000, 1002)).mockResolvedValueOnce({ data: null, error: { message: 'failed' }, count: null });
    expect(await fetchRecipeLinkCatalog()).toBeNull();
    range.mockResolvedValueOnce(page(1000, 1002)).mockResolvedValueOnce(page(3, 1003));
    expect(await fetchRecipeLinkCatalog()).toBeNull();
    range.mockRejectedValueOnce(new Error('unreachable'));
    expect(await fetchRecipeLinkCatalog()).toBeNull();
  });
});
