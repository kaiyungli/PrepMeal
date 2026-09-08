/**
 * Pure normalization for the plan-detail payload:
 *   - `mapPlanDetailRow`  — one raw `menu_plans` row → `PlanDetail`
 *   - `mapPlanItemRow`    — one raw `menu_plan_items` row (with an embedded
 *                           `recipes(...)` join) → `PlanItem`
 *
 * The embedded recipe is `null` whenever the join produced nothing — the
 * recipe was deleted, or RLS on `public.recipes` withheld it because it is not
 * `is_public`. The row still renders (with a fallback name, non-navigable),
 * exactly as the web `PlanRecipeCard` fallback does.
 *
 * Zero value imports — safe to load under `node --test` if ever needed.
 */
import type { PlanDetail, PlanItem, PlanItemRecipe } from '../types';

const FALLBACK_PLAN_TITLE = '未命名餐單';
const FALLBACK_RECIPE_NAME = '未知食譜';

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export interface RawPlanDetailRow {
  id: string | number;
  title?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  avg_servings?: unknown;
  item_count?: unknown;
}

export function mapPlanDetailRow(row: RawPlanDetailRow): PlanDetail {
  return {
    id: String(row.id),
    title: toNullableString(row.title) ?? FALLBACK_PLAN_TITLE,
    start_date: toNullableString(row.start_date),
    end_date: toNullableString(row.end_date),
    avg_servings: toNullableNumber(row.avg_servings),
    item_count: toNullableNumber(row.item_count) ?? 0,
  };
}

/** PostgREST returns a to-one embed as an object, but tolerate a 1-element array. */
function mapEmbeddedRecipe(raw: unknown): PlanItemRecipe | null {
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (obj === null || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  const id = toNullableString(record.id);
  if (!id) return null;
  return {
    id,
    slug: toNullableString(record.slug),
    name: toNullableString(record.name) ?? FALLBACK_RECIPE_NAME,
    image_url: toNullableString(record.image_url),
  };
}

export interface RawPlanItemRow {
  id: string | number;
  date?: unknown;
  meal_slot?: unknown;
  servings?: unknown;
  item_order?: unknown;
  recipe_id?: unknown;
  recipes?: unknown;
}

export function mapPlanItemRow(row: RawPlanItemRow): PlanItem {
  return {
    id: String(row.id),
    date: toNullableString(row.date),
    meal_slot: toNullableString(row.meal_slot),
    servings: toNullableNumber(row.servings),
    item_order: toNullableNumber(row.item_order),
    recipe_id: row.recipe_id == null ? null : String(row.recipe_id),
    recipe: mapEmbeddedRecipe(row.recipes),
  };
}
