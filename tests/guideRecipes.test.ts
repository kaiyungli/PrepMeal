import { describe, expect, it, vi } from 'vitest';
import { selectGuideRecipes } from '@/features/guides/guideRecipes';
const catalogue = [
  { id: 'a', slug: 'real-a', name: '快手菜', cuisine: 'chinese', total_time_minutes: 20 },
  { id: 'b', slug: 'real-b', name: '完整餐', cuisine: 'western', total_time_minutes: 30, is_complete_meal: true },
  { id: 'c', slug: 'real-c', name: '慢煮菜', cuisine: 'chinese', total_time_minutes: 90 },
  { id: 'd', slug: 'real-d', name: '未知時間', cuisine: 'chinese' },
];
describe('guide catalogue selection', () => {
  it('uses actual total time; excludes unknown and over-limit recipes', () => {
    expect(selectGuideRecipes(catalogue, 'quick').map(r => r.slug)).toEqual(['real-a', 'real-b']);
  });
  it('uses complete meals for daily examples rather than presenting sides as dinner', () => {
    expect(selectGuideRecipes(catalogue, 'week').map(r => r.name)).toEqual(['完整餐']);
  });
  it('keeps real names and slugs, excludes malformed entries, deduplicates', () => {
    const rows = selectGuideRecipes([...catalogue, catalogue[0], { id: 'x', slug: 'fake/path', name: 'bad' }], 'classic');
    expect(rows.map(r => r.slug)).toEqual(['real-a', 'real-c', 'real-d']);
    expect(rows.every(r => catalogue.some(c => c.id === r.id && c.slug === r.slug && c.name === r.name))).toBe(true);
  });
  it('caps the selection without inventing recipes to reach the advertised count', () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({ ...catalogue[0], id: String(i), slug: `real-${i}` }));
    expect(selectGuideRecipes(rows, 'classic')).toHaveLength(50);
    expect(selectGuideRecipes(rows, 'quick')).toHaveLength(20);
    expect(selectGuideRecipes(rows, 'market')).toHaveLength(12);
    expect(selectGuideRecipes([], 'week')).toEqual([]);
  });
});
const fetchCatalogueMock = vi.hoisted(() => vi.fn<() => Promise<unknown[] | null>>());
vi.mock('@/lib/recipesServer', () => ({ fetchHomeRecipeCatalog: fetchCatalogueMock }));
import { getGuideProps } from '@/features/guides/guideRecipes.server';
it('does not regenerate an empty page after a failed complete-catalogue load', async () => {
  fetchCatalogueMock.mockResolvedValueOnce(null);
  await expect(getGuideProps('classic')).rejects.toThrow('complete public guide catalogue');
  fetchCatalogueMock.mockResolvedValueOnce(catalogue);
  const result = await getGuideProps('week');
  expect(result.props.recipes.map(r => r.slug)).toEqual(['real-b']);
  expect(result.revalidate).toBe(300);
});
