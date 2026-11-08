import { describe, expect, it, vi } from 'vitest';
vi.mock('@/features/guides/samplePlan.server', () => ({ loadSamplePlan: vi.fn() }));
vi.mock('@/lib/supabaseServer', () => ({ supabaseServer: null }));
import { loadHomeContent } from '@/features/home/homeContent.server';
import { HOME_EXAMPLES, type HomeRecipe } from '@/features/home/homeRotation';
import type { SamplePlan } from '@/features/guides/samplePlan';

function catalogue(): HomeRecipe[] {
  const rows = new Map<string, HomeRecipe>();
  for (const example of HOME_EXAMPLES) for (const day of example.days) day.slugs.forEach((slug, index) => rows.set(slug, {
    id: slug, slug, name: slug, image_url: `https://images.unsplash.com/${slug}.jpg`, total_time_minutes: 20,
    base_servings: 1, is_public: true, meal_role: index === 0 ? 'protein_main' : 'veg_side', is_complete_meal: false,
    primary_protein: index === 0 ? ['pork','fish','chicken','beef','shrimp','tofu','chicken'][example.days.indexOf(day)] : 'vegetarian',
    method: example.days.indexOf(day) % 2 ? 'steamed' : 'stir_fry',
  }));
  return [...rows.values()];
}
async function fakePlan(days: typeof HOME_EXAMPLES[number]['days'], rows?: HomeRecipe[]): Promise<SamplePlan | null> {
  return { servings: 2, days: days.map(d => ({ day: d.day, note: d.note,
    dishes: d.slugs.map(slug => ({ slug, name: slug, image_url: rows?.find(r => r.slug === slug)?.image_url, total_time_minutes: 20 })) })),
    sections: [{ key: 'meat', label: '肉類', items: [{ name: '材料', quantityText: 'from-existing-handler', dishCount: 1, category: 'meat' }] }], itemCount: 1, sharedItems: [] };
}

describe('homepage ISR content and safe fallbacks', () => {
  it('passes the exact reviewed 14 recipes to the existing plan loader for all seven variants', async () => {
    const rows = catalogue();
    for (let index = 0; index < 7; index++) {
      const plan = vi.fn(fakePlan), image = vi.fn().mockResolvedValue(true), fetchCatalogue = vi.fn().mockResolvedValue(rows);
      const content = await loadHomeContent(index, { catalogue: fetchCatalogue, plan, image });
      expect(content.homeExampleId).toBe(HOME_EXAMPLES[index].id);
      expect(content.heroSlug).toBe(HOME_EXAMPLES[index].heroSlug);
      expect(content.samplePlan.sections[0].items[0].quantityText).toBe('from-existing-handler');
      expect(plan).toHaveBeenCalledTimes(1);
      expect(plan).toHaveBeenCalledWith(HOME_EXAMPLES[index].days, expect.any(Array), true);
      const [days, selected] = plan.mock.calls[0];
      expect(days).toEqual(HOME_EXAMPLES[index].days);
      expect(selected).toHaveLength(14);
      expect(selected?.map(r => r.slug).sort()).toEqual(days.flatMap(d => d.slugs).sort());
      expect(fetchCatalogue).toHaveBeenCalledTimes(1);
      expect(content.featuredRecipes).toHaveLength(36);
      expect(content.featuredBootstrap).toContain('installHomeFeatured');
    }
  });
  it.each(['missing', 'private', 'photo', 'role', 'image-request'])('falls back as a whole when the selected example has %s data', async failure => {
    const slug = HOME_EXAMPLES[0].days[0].slugs[0];
    const rows = catalogue().filter(r => failure !== 'missing' || r.slug !== slug).map(r => r.slug !== slug ? r : {
      ...r, is_public: failure !== 'private', image_url: failure === 'photo' ? null : r.image_url,
      meal_role: failure === 'role' ? 'veg_side' : r.meal_role,
    });
    const content = await loadHomeContent(0, { catalogue: async () => rows, plan: vi.fn(fakePlan),
      image: async url => failure !== 'image-request' || !url.includes(slug) });
    expect(content.homeExampleId).toBe(HOME_EXAMPLES[1].id);
    expect(content.requestedExampleId).toBe(HOME_EXAMPLES[0].id);
    expect(content.samplePlan.days).toHaveLength(7);
    expect(content.heroSlug).toBe(HOME_EXAMPLES[1].heroSlug);
    expect(content.featuredRecipes.some(r => r.slug === slug)).toBe(false);
  });
  it('tries a complete alternative after shopping calculation fails, without mixing days', async () => {
    const plan = vi.fn(fakePlan).mockResolvedValueOnce(null);
    const content = await loadHomeContent(0, { catalogue: async () => catalogue(), plan, image: async () => true });
    expect(plan).toHaveBeenCalledTimes(2);
    expect(content.samplePlan.days.map(d => d.dishes.map(r => r.slug))).toEqual(HOME_EXAMPLES[1].days.map(d => d.slugs));
  });
  it('throws on unavailable catalogue or all broken examples so ISR retains its complete prior page', async () => {
    await expect(loadHomeContent(0, { catalogue: async () => null })).rejects.toThrow('last complete');
    await expect(loadHomeContent(0, { catalogue: async () => catalogue(), image: async () => false })).rejects.toThrow('last complete');
    await expect(loadHomeContent(-1)).rejects.toThrow('Invalid home example');
  });
});
