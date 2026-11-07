import type { GuideRecipe } from './guideRecipes';

// Catalogue-backed recipe lists for the ingredient and healthy-dinner guides.
// Every list is chosen from current public data, so a guide never links to a
// recipe that has been hidden or renamed.

export interface TopicRecipe extends GuideRecipe {
  primary_protein?: string | null;
  dish_type?: string | null;
  method?: string | null;
  calories_per_serving?: number | null;
  protein_g?: number | null;
}

function isTopicRecipe(value: unknown): value is TopicRecipe {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.slug === 'string' && Boolean(row.slug.trim())
    && !/[/?#]/.test(row.slug) && typeof row.name === 'string' && Boolean(row.name.trim());
}

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null);

function clean(catalogue: unknown[]): TopicRecipe[] {
  const unique = new Map<string, TopicRecipe>();
  for (const row of catalogue) {
    if (!isTopicRecipe(row) || unique.has(row.id)) continue;
    unique.set(row.id, {
      id: row.id, slug: row.slug, name: row.name,
      total_time_minutes: num(row.total_time_minutes),
      primary_protein: typeof row.primary_protein === 'string' ? row.primary_protein : null,
      dish_type: typeof row.dish_type === 'string' ? row.dish_type : null,
      method: typeof row.method === 'string' ? row.method : null,
      is_complete_meal: row.is_complete_meal === true,
      calories_per_serving: num(row.calories_per_serving),
      protein_g: num(row.protein_g),
    });
  }
  return [...unique.values()];
}

// Spread picks across cooking methods so one list is not five stir-fries.
function varied(recipes: TopicRecipe[], count: number): TopicRecipe[] {
  const sorted = [...recipes].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant-HK'));
  const out: TopicRecipe[] = [];
  const seenMethods = new Set<string>();
  for (const r of sorted) {
    if (out.length >= count) break;
    const m = r.method || '';
    if (!seenMethods.has(m)) { out.push(r); seenMethods.add(m); }
  }
  for (const r of sorted) {
    if (out.length >= count) break;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}

export const PROTEIN_SECTIONS = ['chicken', 'pork', 'beef', 'fish', 'shrimp', 'tofu', 'egg'] as const;
export type ProteinSection = typeof PROTEIN_SECTIONS[number];

export interface IngredientGuideData {
  byProtein: Record<ProteinSection, TopicRecipe[]>;
  vegSides: TopicRecipe[];
}

export function selectIngredientGuide(catalogue: unknown[], perSection = 6): IngredientGuideData {
  const rows = clean(catalogue);
  const byProtein = Object.fromEntries(PROTEIN_SECTIONS.map(p => [p,
    varied(rows.filter(r => r.primary_protein === p && !r.is_complete_meal && r.dish_type !== 'soup'), perSection)],
  )) as Record<ProteinSection, TopicRecipe[]>;
  const vegSides = varied(rows.filter(r => r.primary_protein === 'vegetarian' && r.dish_type === 'side'), 8);
  return { byProtein, vegSides };
}

export interface HealthyGuideData {
  leanMains: TopicRecipe[];
  vegSides: TopicRecipe[];
  lighterMeals: TopicRecipe[];
}

// Thresholds are per one-person serving, using the site's own estimates.
export const LEAN_MAIN_MAX_KCAL = 450;
export const LEAN_MAIN_MIN_PROTEIN_G = 25;
export const LIGHTER_MEAL_MAX_KCAL = 600;

export function selectHealthyGuide(catalogue: unknown[]): HealthyGuideData {
  const rows = clean(catalogue);
  const withKcal = rows.filter(r => r.calories_per_serving != null && r.calories_per_serving > 0);
  return {
    leanMains: varied(withKcal.filter(r => r.dish_type === 'main' && !r.is_complete_meal
      && r.calories_per_serving! <= LEAN_MAIN_MAX_KCAL && (r.protein_g ?? 0) >= LEAN_MAIN_MIN_PROTEIN_G), 10),
    vegSides: varied(withKcal.filter(r => r.primary_protein === 'vegetarian' && r.dish_type === 'side'), 8),
    lighterMeals: varied(withKcal.filter(r => r.is_complete_meal && r.calories_per_serving! <= LIGHTER_MEAL_MAX_KCAL), 8),
  };
}
