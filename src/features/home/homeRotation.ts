import examples from './homeExamples.json';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';
import { matchesSlotRole, type SlotRoleRecipe } from '@/lib/slotRoles';

export const HOME_EXAMPLES = examples;
export const HOME_ISR_SECONDS = 300;
export { homeExampleIndex, hongKongDateKey } from './homeCalendar';

type CardFacts = Pick<RecipeDetailRow, 'difficulty' | 'calories_per_serving' | 'protein_g'>;
export type HomeRecipe = SlotRoleRecipe & Partial<CardFacts> & {
  id: string | number; slug: string; name: string; image_url: string | null;
  total_time_minutes: number | null; base_servings: number; is_public: boolean;
  method?: string | null;
};
export type FeaturedRecipe = Pick<HomeRecipe, 'id' | 'slug' | 'name'> &
  Partial<Pick<HomeRecipe, 'image_url' | 'total_time_minutes' | 'difficulty' | 'calories_per_serving' | 'protein_g'>>;

export function hasUsablePhoto(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'images.unsplash.com'
      || (u.hostname === 'hivnajhqqvaokthzhugx.supabase.co' && u.pathname.startsWith('/storage/v1/object/public/')));
  } catch { return false; }
}

export function validHomeExample(example: typeof HOME_EXAMPLES[number], catalogue: HomeRecipe[]): boolean {
  if (example.days.length !== 7) return false;
  const slugs = example.days.flatMap(day => day.slugs);
  if (slugs.length !== 14 || new Set(slugs).size !== 14) return false;
  const bySlug = new Map(catalogue.map(recipe => [recipe.slug, recipe]));
  const mains = example.days.map(day => bySlug.get(day.slugs[0]));
  if (new Set(mains.map(recipe => recipe?.primary_protein).filter(Boolean)).size < 4
    || new Set(mains.map(recipe => recipe?.method).filter(Boolean)).size < 2) return false;
  return example.days.every(day => day.slugs.length === 2 && day.slugs.every((slug, index) => {
    const recipe = bySlug.get(slug);
    return !!recipe && recipe.is_public && recipe.base_servings === 1 && !recipe.is_complete_meal
      && hasUsablePhoto(recipe.image_url) && matchesSlotRole(recipe, index === 0 ? 'protein_main' : 'veg_side');
  }));
}

export function featuredCandidates(catalogue: FeaturedRecipe[], limit = 36): FeaturedRecipe[] {
  const seen = new Set<string>();
  // A stable hash spreads the bounded pool through the catalogue instead of only newest recipes.
  const hash = (s: string) => [...s].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  return catalogue.filter(recipe => {
    if (!recipe.slug?.trim() || /[\s/?#\\<>]/.test(recipe.slug) || !hasUsablePhoto(recipe.image_url) || seen.has(recipe.slug)) return false;
    seen.add(recipe.slug); return true;
  }).sort((a, b) => hash(a.slug) - hash(b.slug) || a.slug.localeCompare(b.slug)).slice(0, limit)
    .map(({ id, slug, name, image_url, total_time_minutes, difficulty, calories_per_serving, protein_g }) => ({
      id, slug, name, image_url, total_time_minutes, difficulty: difficulty ?? null,
      calories_per_serving: calories_per_serving ?? null, protein_g: protein_g ?? null,
    }));
}
