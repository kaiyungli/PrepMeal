import type { GuideRecipe } from './guideRecipes';

export interface PracticalRecipe extends GuideRecipe {
  base_servings: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
}

// Editorial examples, checked against public recipe details on 2026-10-28.
export const exampleSlugs = [
  'garlic-chicken-pasta', 'tomato-tofu-rice', 'prepmeal-batch2-04',
  'garlic-butter-shrimp-pasta', 'vegetable-egg-fried-rice',
  'prepmeal-batch4-15', 'poached-baby-napa', 'prepmeal-batch3-16', 'poached-spinach-broth',
] as const;

export function selectPracticalExamples(catalogue: unknown[]): PracticalRecipe[] {
  return exampleSlugs.flatMap(slug => {
    const row = catalogue.find(value => value && typeof value === 'object' && (value as Record<string, unknown>).slug === slug) as Record<string, unknown> | undefined;
    if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' || !row.name.trim()
      || !Number.isInteger(row.base_servings) || Number(row.base_servings) <= 0
      || !Number.isFinite(row.prep_time_minutes) || Number(row.prep_time_minutes) < 0
      || !Number.isFinite(row.cook_time_minutes) || Number(row.cook_time_minutes) < 0
      || !Number.isFinite(row.total_time_minutes) || Number(row.total_time_minutes) <= 0) return [];
    return [{ id: row.id, slug, name: row.name, base_servings: Number(row.base_servings),
      prep_time_minutes: Number(row.prep_time_minutes), cook_time_minutes: Number(row.cook_time_minutes),
      total_time_minutes: Number(row.total_time_minutes) }];
  });
}
