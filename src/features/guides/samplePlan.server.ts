import { sampleDishIngredients } from './samplePlanIngredients';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleShoppingList } from '@/pages/api/shopping-list';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse } from '@/features/shopping-list/types';
import { SAMPLE_PLAN_DAYS, SAMPLE_PLAN_SERVINGS, type SamplePlan, type SamplePlanItem } from './samplePlan';

type SampleRecipe = { id: string | number; slug: string; name: string; image_url?: string | null; total_time_minutes?: number | null };

const SEASONING = new Set(['seasoning', 'pantry']);

// Run the planner's shopping-list calculation in process, so the example shows
// exactly what a visitor would get for the same dishes.
async function computeShoppingList(recipeIds: string[], servings: number): Promise<ShoppingListResponse | null> {
  let status = 0;
  let payload: unknown = null;
  const res = {
    setHeader() { return res; },
    status(code: number) { status = code; return res; },
    json(body: unknown) { payload = body; return res; },
  } as unknown as NextApiResponse<ShoppingListResponse | { error: string }>;
  const req = { method: 'POST', body: { recipeIds, servings }, headers: {} } as unknown as NextApiRequest;
  await handleShoppingList(req, res, true);
  return status === 200 && payload && typeof payload === 'object' && 'toBuy' in payload
    ? payload as ShoppingListResponse : null;
}

/** Independent recipe previews: a single batch using the same serving calculator. */
export async function loadRecipePreviews(recipes: SampleRecipe[], servings = SAMPLE_PLAN_SERVINGS) {
  if (!recipes.length) return [];
  const response = await computeShoppingList(recipes.map(recipe => String(recipe.id)), servings);
  if (!response) return [];
  const view = mapShoppingListResponseToViewModel(response);
  return recipes.map(recipe => ({
    slug: recipe.slug, name: recipe.name, image_url: recipe.image_url ?? null,
    total_time_minutes: recipe.total_time_minutes ?? null, servings,
    ingredientExcerpt: sampleDishIngredients(String(recipe.id), view),
  })).filter(recipe => recipe.ingredientExcerpt.length > 0);
}

/** null when any dish is missing or the calculation fails: never show a partial example. */
export async function loadSamplePlan(days = SAMPLE_PLAN_DAYS, catalogue?: SampleRecipe[], requireCompleteIngredients = false): Promise<SamplePlan | null> {
  if (!supabaseServer) return null;
  const slugs = days.flatMap(d => d.slugs);
  try {
    const result = catalogue ? { data: catalogue, error: null } : await supabaseServer
      .from('recipes')
      .select('id, slug, name, image_url, total_time_minutes')
      .eq('is_public', true)
      .in('slug', slugs);
    const { data, error } = result;
    if (error || !data) return null;
    const bySlug = new Map(data.map(r => [r.slug as string, r]));
    if (slugs.some(slug => !bySlug.has(slug))) return null;

    const ids = slugs.map(slug => String(bySlug.get(slug)!.id));
    const response = await computeShoppingList(ids, SAMPLE_PLAN_SERVINGS);
    if (!response) return null;
    if (requireCompleteIngredients && ids.some(id => !response.byRecipe.some(group =>
      String(group.recipeId) === id && group.toBuy.length + group.pantry.length > 0))) return null;
    const view = mapShoppingListResponseToViewModel(response);

    // How many dishes use each ingredient (by name, any unit).
    const dishCount = new Map<string, number>();
    for (const group of view.byRecipe) {
      for (const name of new Set(group.toBuy.map(i => i.name))) dishCount.set(name, (dishCount.get(name) ?? 0) + 1);
    }

    const sections = view.sections.map(s => ({
      key: s.categoryKey,
      label: s.categoryLabel,
      items: s.items.map((i): SamplePlanItem => ({ name: i.name, quantityText: i.quantityText, dishCount: dishCount.get(i.name) ?? 1, category: s.categoryKey })),
    })).filter(s => s.items.length > 0);
    const all = sections.flatMap(s => s.items);

    return {
      servings: SAMPLE_PLAN_SERVINGS,
      days: days.map(d => ({
        day: d.day, note: d.note,
        dishes: d.slugs.map(slug => {
          const r = bySlug.get(slug)!;
          return {
            slug, name: String(r.name),
            image_url: typeof r.image_url === 'string' ? r.image_url : null,
            total_time_minutes: typeof r.total_time_minutes === 'number' ? r.total_time_minutes : null,
            ...(requireCompleteIngredients ? { ingredientExcerpt: sampleDishIngredients(String(r.id), view) } : {}),
          };
        }),
      })),
      sections,
      itemCount: all.length,
      // Fresh ingredients first: shared meat or vegetables say more than salt.
      sharedItems: all.filter(i => i.dishCount > 1).sort((a, b) =>
        Number(SEASONING.has(a.category)) - Number(SEASONING.has(b.category)) || b.dishCount - a.dishCount),
    };
  } catch (err) {
    console.error('[sample-plan] failed', String(err));
    return null;
  }
}
