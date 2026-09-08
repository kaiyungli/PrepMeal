/**
 * Pure normalization: one raw `menu_plans` list row → `PlanSummary`.
 *
 * Nullable backend fields stay nullable; only `title` is coerced to a safe
 * fallback (the web `PlanCard` does the same with `plan.name || '未命名餐單'`).
 * `preview_items` is untrusted JSONB — anything that is not an array of
 * objects degrades to `[]`, and a preview entry with no recipe name falls
 * back to `'未知食譜'` (matching web).
 *
 * Zero value imports — unit-tested directly by `node --test`.
 */
import type { PlanPreviewItem, PlanSummary } from '../types';

const FALLBACK_PLAN_TITLE = '未命名餐單';
const FALLBACK_RECIPE_NAME = '未知食譜';

/** Loosely-typed raw row — every field is validated before use. */
export interface RawPlanSummaryRow {
  id: string | number;
  title?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  created_at?: unknown;
  avg_servings?: unknown;
  item_count?: unknown;
  preview_items?: unknown;
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapPreviewItems(raw: unknown): PlanPreviewItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PlanPreviewItem[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const recipe =
      record.recipe && typeof record.recipe === 'object'
        ? (record.recipe as Record<string, unknown>)
        : null;
    const name =
      toNullableString(recipe?.name) ?? toNullableString(record.recipe_name);
    out.push({
      recipe_name: name ?? FALLBACK_RECIPE_NAME,
      meal_slot: toNullableString(record.meal_slot),
    });
  }
  return out;
}

export function mapPlanSummaryRow(row: RawPlanSummaryRow): PlanSummary {
  return {
    id: String(row.id),
    title: toNullableString(row.title) ?? FALLBACK_PLAN_TITLE,
    start_date: toNullableString(row.start_date),
    end_date: toNullableString(row.end_date),
    created_at: toNullableString(row.created_at),
    avg_servings: toNullableNumber(row.avg_servings),
    item_count: toNullableNumber(row.item_count) ?? 0,
    preview_items: mapPreviewItems(row.preview_items),
  };
}
