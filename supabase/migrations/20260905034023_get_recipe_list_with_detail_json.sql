-- Migration: 010_get_recipe_list_with_detail_json
--
-- Defines the server-side recipe list-with-detail RPC used by the mobile app:
-- one RPC returning the current public recipe list with full detail embedded
-- per row, so a list-originated detail open costs zero additional round trips.
--
-- SECURITY DEFINER is required, not optional: recipe_ingredients,
-- ingredients, units, and recipe_steps have no RLS policy captured anywhere
-- in this repo's migrations (their base schema isn't in this repo either —
-- a pre-existing gap). Running as SECURITY DEFINER makes that
-- gap irrelevant to THIS function's safety: it executes with the definer's
-- privileges, which bypasses RLS on every table it touches regardless of
-- what (if anything) is configured on them, and the explicit
-- `WHERE r.is_public = true` below is the ONLY access-control gate this
-- function has — the same centralized pattern get_recipe_detail_json
-- already uses. get_recipe_detail_json itself is intentionally NOT touched
-- by this migration.
--
-- ORDERING CONTRACT: the returned `jsonb` value is always a JSON ARRAY
-- (never a set of rows), and its element order is fixed INSIDE the
-- `jsonb_agg(... ORDER BY ...)` aggregate below — not left to depend on
-- row-emission order from a set-returning function or on the caller
-- chaining PostgREST's `.order()`. Same for the nested `ingredients` /
-- `steps` arrays: each is its own `jsonb_agg(... ORDER BY ...)`.
--
-- ROW-COUNT CONTRACT: at most 200 public recipes, newest first
-- (`created_at DESC, id DESC`) — the same bound and ordering
-- `RECIPE_LIST_FIRST_PAGE_CEILING` enforces client-side today in
-- `mobile/src/features/recipes/services/fetchRecipes.ts`. The LIMIT is
-- applied to the driving `recipes` row set BEFORE the ingredient/step joins
-- (see the `limited_recipes` CTE), not after, so the join/aggregation cost
-- is bounded by the same 200-row cap, not by the full table. If that mobile
-- constant ever changes, this function's literal `200` must change with it
-- — they are not structurally linked (SQL cannot import a TS constant), so
-- keep them in sync by hand.

CREATE OR REPLACE FUNCTION public.get_recipe_list_with_detail_json()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH limited_recipes AS (
    SELECT r.*
    FROM public.recipes r
    WHERE r.is_public = true
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT 200
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id',                lr.id,
        'slug',               lr.slug,
        'name',               lr.name,
        'image_url',          lr.image_url,
        'total_time_minutes', lr.total_time_minutes,
        'difficulty',         lr.difficulty,
        'cuisine',            lr.cuisine,
        'primary_protein',    lr.primary_protein,
        'description',        lr.description,
        'cook_time_minutes',  lr.cook_time_minutes,
        'prep_time_minutes',  lr.prep_time_minutes,
        'method',             lr.method,
        'ingredients',        COALESCE(ri.ingredients, '[]'::jsonb),
        'steps',              COALESCE(rs.steps, '[]'::jsonb)
      )
      ORDER BY lr.created_at DESC, lr.id DESC
    ),
    '[]'::jsonb
  )
  FROM limited_recipes lr
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'id',                i.id,
               'name',              i.name,
               'slug',              i.slug,
               'shopping_category', i.shopping_category,
               'quantity',          ric.quantity,
               'unit', CASE WHEN u.code IS NULL THEN NULL
                            ELSE jsonb_build_object('code', u.code, 'name', u.name)
                       END
             )
             ORDER BY ric.created_at ASC, ric.id ASC
           ) AS ingredients
    FROM public.recipe_ingredients ric
    JOIN public.ingredients i ON i.id = ric.ingredient_id
    LEFT JOIN public.units u ON u.id = ric.unit_id
    WHERE ric.recipe_id = lr.id
  ) ri ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'step_no',      rst.step_no,
               'text',         rst.text,
               'time_seconds', rst.time_seconds
             )
             ORDER BY rst.step_no ASC
           ) AS steps
    FROM public.recipe_steps rst
    WHERE rst.recipe_id = lr.id
  ) rs ON true;
$$;

COMMENT ON FUNCTION public.get_recipe_list_with_detail_json() IS
  'Mobile-only. Returns a JSON array of at most 200 public recipes '
  '(is_public = true), newest first (created_at DESC, id DESC), with full '
  'detail (description, cook/prep time, method, ingredients, steps) '
  'embedded per row. SECURITY DEFINER: enforces is_public itself, '
  'independent of child-table RLS. No parameters, no service-role-only '
  'branch.';

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION; revoke
-- that first so the grant below is the complete, auditable access list.
REVOKE ALL ON FUNCTION public.get_recipe_list_with_detail_json() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recipe_list_with_detail_json()
  TO anon, authenticated;
