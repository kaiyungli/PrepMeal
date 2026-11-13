import { loadSamplePlan } from '@/features/guides/samplePlan.server';
import { HOME_EXAMPLES, HOME_ISR_SECONDS, validHomeExample, type HomeRecipe } from './homeRotation';
import type { HomeSampleCandidate } from './homeSamples';

/** Shared by ISR workers' routes; never calculate a weekly plan per visitor. */
export type HomePlanLoader = (days: typeof HOME_EXAMPLES[number]['days'], rows: HomeRecipe[], requireCompleteIngredients: boolean) => ReturnType<typeof loadSamplePlan>;
export function createSampleLoader(planLoader: HomePlanLoader = loadSamplePlan) {
  let cached: { key: string; expires: number; value: Promise<HomeSampleCandidate[]> } | undefined;
  return (catalogue: HomeRecipe[], image: (url: string) => Promise<boolean>): Promise<HomeSampleCandidate[]> => {
    const key = JSON.stringify(catalogue);
    if (cached?.key === key && cached.expires > Date.now()) return cached.value;
    const value = (async () => {
      const candidates: HomeSampleCandidate[] = [];
      for (const example of HOME_EXAMPLES) {
        if (!validHomeExample(example, catalogue)) continue;
        const rows = catalogue.filter(recipe => example.days.some(day => day.slugs.includes(recipe.slug)));
        if (!(await Promise.all(rows.map(recipe => image(recipe.image_url!)))).every(Boolean)) continue;
        try {
          const plan = await planLoader(example.days, rows, true);
          if (!plan || plan.servings !== 2 || plan.days.length !== 7 || !plan.sections.length
            || plan.days.some((day, index) => day.dishes.length !== 2
              || day.dishes.some((dish, slot) => dish.slug !== example.days[index].slugs[slot]))) continue;
          candidates.push({ id: example.id, plan });
        } catch { /* Exclude an incomplete group as a whole; try the next reviewed group. */ }
      }
      return candidates;
    })();
    cached = { key, expires: Date.now() + HOME_ISR_SECONDS * 1000, value };
    return value;
  };
}
export const loadSampleCandidates = createSampleLoader();
