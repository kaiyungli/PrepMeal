/**
 * Pure raw-row -> `GenerateRecipe` normalisation for the Generate lean fetch.
 *
 * Mirrors the discipline of `mobile/src/features/recipes/services/fetchRecipes.ts`
 * `mapRecipeRow`: nullable backend fields stay nullable, only `name` gets a safe
 * fallback, nothing is fabricated. Arrays are coerced to `string[]` (dropping
 * non-string / empty entries); `flavor` is passed through as string | string[] |
 * null because the web filter path expects to normalise it itself later.
 *
 * Kept dependency-free and side-effect-free so it is unit-testable under
 * `node --test` with no Supabase import.
 */
import type { GenerateRecipe } from '../types.ts';

const FALLBACK_RECIPE_NAME = '未命名食譜';

/** One `recipes` row as selected by the 17-column Generate query. */
export interface RawGenerateRow {
  id: string | number;
  slug: unknown;
  name: unknown;
  image_url: unknown;
  description: unknown;
  cuisine: unknown;
  dish_type: unknown;
  method: unknown;
  speed: unknown;
  primary_protein: unknown;
  protein: unknown;
  diet: unknown;
  flavor: unknown;
  is_complete_meal: unknown;
  meal_role: unknown;
  total_time_minutes: unknown;
  difficulty: unknown;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
}

function flavorValue(value: unknown): string | string[] | null {
  if (typeof value === 'string') return value.trim() !== '' ? value : null;
  if (Array.isArray(value)) {
    const arr = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '');
    return arr.length > 0 ? arr : null;
  }
  return null;
}

export function mapGenerateRecipeRow(row: RawGenerateRow): GenerateRecipe {
  return {
    id: row.id,
    slug: nullableString(row.slug),
    name: nullableString(row.name) ?? FALLBACK_RECIPE_NAME,
    image_url: nullableString(row.image_url),
    description: nullableString(row.description),
    cuisine: nullableString(row.cuisine),
    dish_type: nullableString(row.dish_type),
    method: nullableString(row.method),
    speed: nullableString(row.speed),
    primary_protein: nullableString(row.primary_protein),
    protein: stringArray(row.protein),
    diet: stringArray(row.diet),
    flavor: flavorValue(row.flavor),
    is_complete_meal: row.is_complete_meal === true,
    meal_role: nullableString(row.meal_role),
    total_time_minutes: nullableNumber(row.total_time_minutes),
    difficulty: nullableString(row.difficulty),
  };
}
