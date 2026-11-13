import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/features/guides/samplePlan.server', () => ({ loadRecipePreviews: vi.fn() }));
import type { loadRecipePreviews } from '@/features/guides/samplePlan.server';
import { createHeroLoader } from '@/features/home/homeHero.server';
import { usableHero } from '@/features/home/homeHero';
import type { HomeRecipe } from '@/features/home/homeRotation';
const rows: HomeRecipe[] = Array.from({ length: 20 }, (_, i) => ({ id: String(i), slug: `food-${i}`, name: `菜${i}`, image_url: `https://images.unsplash.com/${i}.jpg`, total_time_minutes: 20, base_servings: 1, is_public: true, meal_role: 'protein_main', dish_type: 'main' }));
afterEach(() => vi.useRealTimers());
describe('independent preloaded hero candidates', () => {
  it('bounds and shares one two-person batch across daily variants, refreshing at ISR TTL', async () => {
    vi.useFakeTimers();
    const previews = vi.fn(async (recipes: Parameters<typeof loadRecipePreviews>[0], servings = 2) => recipes.map(recipe => ({ ...recipe, image_url: recipe.image_url ?? null, total_time_minutes: recipe.total_time_minutes ?? null, servings, ingredientExcerpt: [{ name: '材料', quantityText: 'from-existing-calculator' }] })));
    const load = createHeroLoader(previews), image = vi.fn().mockResolvedValue(true);
    const a = load(rows, image), b = load(rows.slice().reverse(), image);
    expect(a).toBe(b); expect(await a).toHaveLength(12);
    expect(previews).toHaveBeenCalledTimes(1); expect(previews.mock.calls[0][1]).toBe(2);
    expect(previews.mock.calls[0][0]).toHaveLength(12);
    vi.advanceTimersByTime(300001); await load(rows, image); expect(previews).toHaveBeenCalledTimes(2);
  });
  it('rejects invalid/private/side/base-serving candidates and calculator/image failures', async () => {
    const previews = vi.fn().mockResolvedValue([]), load = createHeroLoader(previews);
    for (const change of [{ is_public: false }, { base_servings: 2 }, { meal_role: 'veg_side' }, { is_complete_meal: true }]) {
      expect(await load(rows.map(r => ({ ...r, ...change })), async () => true)).toEqual([]);
    }
    expect(await createHeroLoader(previews)(rows, async () => false)).toEqual([]);
    expect(previews).not.toHaveBeenCalled();
    expect(await createHeroLoader(vi.fn().mockRejectedValue(Error('unavailable')))(rows, async () => true)).toEqual([]);
    expect(usableHero({ ...rows[0], servings: 2, ingredientExcerpt: [] })).toBe(false);
    expect(usableHero({ ...rows[0], servings: 3, ingredientExcerpt: [{ name: '材料', quantityText: '300 克' }] })).toBe(false);
  });
});
