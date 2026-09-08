/**
 * Types for the Generate preview feature.
 *
 * `GenerateRecipe` is the lean planner/card row. It is a strict SUPERSET of
 * `RecipeSummary` (the shape `encodeRecipeSeed` / recipe-detail navigation
 * expects), so a generated recipe can be handed straight to the existing detail
 * route with no adapter.
 *
 * Field set = the frozen 17-column fetch contract for Slice 4D-B (see
 * `mobile-slice-4d-b-generate-readiness.md`). We deliberately DO NOT carry
 * `canonical_ingredients` / `ingredients_list` (the web planner never selects
 * them, so its canonical pantry path is dead — mobile must match), nor
 * `budget_level` / nutrition / prep-cook breakdown (unused by generation).
 */
import type { RecipeSummary } from '@/types/recipe';

export interface GenerateRecipe extends RecipeSummary {
  /** Nullable free text; only the (future) pantry text-match path reads it. */
  description: string | null;
  dish_type: string | null;
  method: string | null;
  speed: string | null;
  /** Effective protein list; `[]` when the recipe has none. */
  protein: string[];
  /** Dietary tags; `[]` when none. */
  diet: string[];
  /** Web stores this as a string OR a string[] OR null — kept as-is for the
   *  filter path to normalise later. */
  flavor: string | string[] | null;
  is_complete_meal: boolean;
  meal_role: string | null;
}

export type CompositionMode = 'complete_meal' | 'meat_veg' | 'two_meat_one_veg';

export type DaysPerWeek = 3 | 5 | 7;

export interface GenerateSettingsState {
  daysPerWeek: DaysPerWeek;
  composition: CompositionMode;
}

/** `planWeekAdvanced` output: day key -> ordered recipes for that day. */
export type WeeklyPlan = Record<string, GenerateRecipe[]>;

export interface PlanDaySection {
  /** 'mon'..'sun' */
  key: string;
  /** Localised heading, e.g. 第一天 */
  title: string;
  isWeekend: boolean;
  data: GenerateRecipe[];
}
