import { createHash } from 'node:crypto';
import type { RecipeDetailRow } from '../services/getRecipeDetail';

export interface EditorialGuidance {
  cooking_tips?: string[];
  pairing_suggestions?: string[];
  editorial_sources?: { title: string; url: string }[];
}

/** Bind reviewed text to the actual recipe, not just a reusable name or slug. */
export function editorialRecipeFingerprint(recipe: RecipeDetailRow): string {
  const ingredients = (recipe.ingredients || [])
    .map(ingredient => ({
      id: String(ingredient.id),
      name: ingredient.name,
      quantity: Number(ingredient.quantity),
      unit: typeof ingredient.unit === 'string' ? ingredient.unit : ingredient.unit?.code || null,
      note: ingredient.prep_note ?? null,
      optional: ingredient.is_optional === true,
    }))
    .sort((a, b) => {
      const left = JSON.stringify(a);
      const right = JSON.stringify(b);
      return left < right ? -1 : left > right ? 1 : 0;
    });
  const canonical = {
    id: recipe.id,
    name: recipe.name,
    method: recipe.method,
    base_servings: recipe.base_servings ?? null,
    meal_role: recipe.meal_role ?? null,
    is_complete_meal: recipe.is_complete_meal,
    primary_protein: recipe.primary_protein,
    diet: recipe.diet ? [...recipe.diet].sort() : null,
    ingredients,
    steps: [...(recipe.steps || [])].sort((a, b) => a.step_no - b.step_no).map(step => step.text),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function lines(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6 ||
      value.some(line => typeof line !== 'string' || !line.trim() || line.length > 500)) return null;
  return value.map(line => line.trim());
}

/** Only expose reader-facing fields; stale or malformed edits use existing fallbacks. */
export function recipeEditorialGuidance(recipe: RecipeDetailRow): EditorialGuidance {
  const editorial = record(record(recipe.source_data).editorial_guidance);
  if (editorial.version !== 1 || editorial.source_fingerprint !== editorialRecipeFingerprint(recipe)) return {};
  const cooking = lines(editorial.cooking_tips);
  const pairing = lines(editorial.pairing_suggestions);
  if (!cooking || !pairing) return {};
  const sources = Array.isArray(editorial.references) ? editorial.references.flatMap(value => {
    const source = record(value);
    if (typeof source.title !== 'string' || !source.title.trim() || source.title.length > 200 || typeof source.url !== 'string') return [];
    try {
      const url = new URL(source.url);
      return url.protocol === 'https:' ? [{ title: source.title.trim(), url: url.href }] : [];
    } catch { return []; }
  }).slice(0, 6) : [];
  return {
    cooking_tips: cooking,
    pairing_suggestions: pairing,
    ...(sources.length ? { editorial_sources: sources } : {}),
  };
}
