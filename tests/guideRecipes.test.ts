import { describe, expect, it, vi } from 'vitest';
import { selectGuideRecipes } from '@/features/guides/guideRecipes';
import { selectPracticalExamples } from '@/features/guides/practicalExamples';
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
describe('practical examples from the public catalogue', () => {
  const example = { id: 'public-id', slug: 'garlic-chicken-pasta', name: '目前公開名稱', base_servings: 2,
    prep_time_minutes: 11, cook_time_minutes: 17, total_time_minutes: 28, author_id: 'not-for-page' };
  it('keeps current public names, servings and times without copying unrelated columns', () => {
    const [row] = selectPracticalExamples([example]);
    expect(row).toMatchObject({ name: '目前公開名稱', base_servings: 2, total_time_minutes: 28 });
    expect(row).not.toHaveProperty('author_id');
  });
  it('does not invent a link when an example disappears from the public catalogue', () => {
    expect(selectPracticalExamples([])).toEqual([]);
    expect(selectPracticalExamples([{ ...example, slug: 'unreviewed' }])).toEqual([]);
  });
  it.each([{ base_servings: 0 }, { prep_time_minutes: null }, { total_time_minutes: NaN }])('omits incomplete example metadata: %s', missing => {
    expect(selectPracticalExamples([{ ...example, ...missing }])).toEqual([]);
  });
});
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
