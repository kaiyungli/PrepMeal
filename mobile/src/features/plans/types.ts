/**
 * Plans feature types (mobile).
 *
 * Field names stay in backend snake_case — the same convention the recipes
 * feature uses (`src/types/recipe.ts`) — so the service layer maps 1:1 and a
 * shared fetch layer could be introduced later without a rename pass.
 *
 * Source of truth: the live `public.menu_plans` / `public.menu_plan_items`
 * tables the web app reads (`src/pages/api/user/menus/*`,
 * `src/features/plans/server/getMenuPlanDetail.ts`). Only the fields the
 * mobile list + detail screens actually render are modelled. Shopping list,
 * mutation, scoring and `menu_data` structures are out of scope for this
 * read-only slice.
 */

/** `menu_plans.id` — a UUID string in the DB. */
export type PlanId = string;

/** One preview meal shown on a list card, distilled from `preview_items` JSONB. */
export interface PlanPreviewItem {
  /** Never empty — a missing name is coerced to a fallback. */
  recipe_name: string;
  meal_slot: string | null;
}

/** A row of the "my plans" list. */
export interface PlanSummary {
  id: PlanId;
  /** Never empty — the mapper substitutes a fallback for a missing title. */
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  avg_servings: number | null;
  item_count: number;
  preview_items: PlanPreviewItem[];
}

/** Plan-level metadata for the detail header. */
export interface PlanDetail {
  id: PlanId;
  title: string;
  start_date: string | null;
  end_date: string | null;
  avg_servings: number | null;
  item_count: number;
}

/** The minimal recipe shape embedded per plan item (from a `recipes(...)` join). */
export interface PlanItemRecipe {
  id: string;
  slug: string | null;
  /** Never empty — coerced to a fallback when the join row has no name. */
  name: string;
  image_url: string | null;
}

/** One `menu_plan_items` row, normalized. */
export interface PlanItem {
  id: string;
  date: string | null;
  meal_slot: string | null;
  servings: number | null;
  item_order: number | null;
  recipe_id: string | null;
  /** `null` when the referenced recipe is missing or not publicly visible. */
  recipe: PlanItemRecipe | null;
}

/** A day bucket produced by `mapPlanItemsByDay`. */
export interface PlanDay {
  /** ISO date (`YYYY-MM-DD`), or `null` for items with no usable date. */
  date: string | null;
  items: PlanItem[];
}
