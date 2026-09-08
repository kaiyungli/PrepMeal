-- Migration: 012_get_menu_plan_shopping_list_json
--
-- Plan-scoped, read-only shopping-list aggregation RPC for the mobile app
-- (Mobile Slice 4C). One authenticated round trip turns a saved plan id into
-- the aggregated "to buy" ingredient lines the web saved-plan shopping list
-- already produces -- WITHOUT shipping the mobile client the full
-- get_recipe_list_with_detail_json() payload (all ~200 public recipes, each
-- with description / method / every step's text) just to compute a list that
-- needs only per-ingredient rows for this plan's handful of recipes.
--
--
-- WHY SECURITY DEFINER (same rationale as 010_get_recipe_list_with_detail_json)
-- -----------------------------------------------------------------------------
-- `recipe_ingredients`, `ingredients`, and `units` have no RLS policy captured
-- anywhere in this repo's migrations and their base schema is not in this repo
-- either (a pre-existing gap). Running as SECURITY DEFINER makes that gap
-- irrelevant to THIS function's safety: it executes with the definer's
-- privileges, so it can read those child tables regardless of what (if
-- anything) is configured on them, and the OWNERSHIP GATE below is the ONLY
-- access-control this function has. The web `/api/shopping-list` endpoint this
-- mirrors takes the same shortcut a different way -- it runs under the
-- service-role key. This function uses NO service-role key and adds NO new
-- table grants.
--
--
-- OWNERSHIP GATE -- enforced INSIDE the function, not by the caller
-- -----------------------------------------------------------------------------
--   `menu_plans.id = p_plan_id AND menu_plans.user_id = auth.uid()`
--
-- The `owned_plan` CTE is the root of every other CTE (`plan_items` joins it,
-- `plan_recipes` derives from `plan_items`, `line_items` derives from
-- `plan_recipes`) AND the driving table of the final SELECT. So:
--
--   * plan id does not exist            -> `owned_plan` has 0 rows
--   * plan exists, owned by another user-> `owned_plan` has 0 rows (RLS is not
--                                          even relied on here; the explicit
--                                          `user_id = auth.uid()` predicate
--                                          filters it out)
--   * caller is `anon` (auth.uid() NULL)-> `owned_plan` has 0 rows
--
-- and in every one of those cases `SELECT ... FROM owned_plan` yields NO rows,
-- so a `LANGUAGE sql RETURNS jsonb` function returns SQL NULL. NOT-FOUND and
-- NOT-OWNED are therefore byte-for-byte identical to the caller (both: NULL) --
-- the client can never tell whether an id belongs to someone else or to nobody.
--
-- A plan the caller DOES own always returns a NON-NULL `{"items": [...]}`
-- object, even when the array is empty (no items, or items whose recipes have
-- no ingredient rows). So the mobile client maps:
--       data IS NULL            -> neutral "not found"  (== not owned)
--       data.items.length === 0 -> "this plan has nothing to buy"
--       otherwise               -> render the grouped list
--
--
-- AGGREGATION SEMANTICS -- reproduced from `src/pages/api/shopping-list.ts`
-- (the endpoint the web saved-plan shopping list actually calls via
--  `src/components/myPlans/ShoppingListSection.js`). NOT reinvented, and NOT
--  taken from `src/lib/shoppingList.ts::buildShoppingList`, which has no
--  importer and is not on the saved-plan path. Point-by-point:
--
--   1. RECIPE SET: the web builds `recipeIds` as
--      `[...new Set(items.map(i => i.recipe_id).filter(Boolean))]` and passes
--      it to `.in('recipe_id', recipeIds)`. Both the `Set` and the SQL `IN`
--      collapse duplicates, so a recipe placed in the plan N times contributes
--      its ingredients ONCE, not N times. -> `plan_recipes` is
--      `SELECT DISTINCT recipe_id`.
--
--   2. SERVINGS MULTIPLIER: the web multiplier is
--      `usePlanDetailController`'s `avgServings` =
--      `Math.round(sum(item.servings || 1) / items.length)`, floored at 1,
--      over ALL plan items (not distinct recipes). -> `plan_servings` =
--      `GREATEST(round(avg(coalesce(nullif(servings, 0), 1))), 1)`. `round()`
--      in Postgres rounds halves away from zero, matching JS `Math.round` for
--      the non-negative values servings can take. JS `item.servings || 1`
--      coerces BOTH a literal 0 AND NULL to 1 before averaging, so the inner
--      term must be `coalesce(nullif(servings, 0), 1)` -- a plain
--      `coalesce(servings, 1)` would let a stored 0 through and pull the
--      average below the web value. A plan with no items -> `avg` is NULL ->
--      outer `coalesce(..., 1)` -> multiplier 1 (matches the web
--      `items.length > 0 ? ... : 1`).
--
--   3. LINE QUANTITY: the API computes `(ri.quantity ?? 0) * servings` per row
--      then sums rows sharing an ingredient. `servings` is constant, so
--      `sum(ri.quantity) * servings` is identical. SQL `sum()` skips NULLs and
--      `coalesce(sum(...), 0)` makes an all-NULL group 0 -- matching the API's
--      `?? 0` (NOT `shoppingList.ts`'s `quantity || 1`, which would turn a
--      missing quantity into 1).
--
--   4. MERGE KEY: the API keys merged rows by `ingredientId` when present
--      (always, for `recipe_ingredients` rows) else `name__normalizedUnit`.
--      This function only ever sees rows WITH an `ingredient_id` (it filters
--      `ri.ingredient_id IS NOT NULL`, exactly as the API's
--      `if (!ri.ingredient_id) continue`), so `GROUP BY ri.ingredient_id` is
--      the whole key. `ingredient_id` -> `ingredients` is a FK, so grouping
--      also by `i.name, i.shopping_category` does not split any group.
--
--   5. UNIT WHEN AN INGREDIENT APPEARS UNDER DIFFERENT UNITS ACROSS RECIPES:
--      the API sums quantities regardless of unit and keeps whichever row it
--      saw FIRST (query order -- effectively arbitrary). This function keeps
--      the unit of the earliest `(recipe_ingredients.created_at, id)` row --
--      the same ordering key `010_get_recipe_list_with_detail_json` uses for
--      ingredient order. Deterministic where the API was arbitrary; never a
--      different VALUE than one the API could have picked.
--
--   6. CATEGORY + UNIT NORMALISATION stays in TypeScript, ported verbatim from
--      `src/features/shopping-list/{constants,mappers}` and
--      `src/lib/quantityFormatter.ts` into
--      `mobile/src/features/plans/lib/shoppingListModel.ts` (unit-tested).
--      This function returns the RAW `ingredients.shopping_category` and BOTH
--      the raw `units.code` and the localized `units.display_name_*`; the
--      client maps the category to its canonical key, orders sections by
--      `SHOPPING_CATEGORY_ORDER`, and formats quantities -- exactly as the web
--      `mapShoppingListResponseToViewModel` does after the API returns. No
--      second category taxonomy is introduced here.
--
--   7. OPTIONAL INGREDIENTS: the API applies no `is_optional` filter, so
--      optional ingredients ARE included. This function likewise does not
--      filter on `is_optional`.
--
--   8. `is_public`: the API (service role) does not filter recipe visibility
--      for the saved-plan path, so a plan referencing a since-unpublished
--      recipe still contributes that recipe's ingredients. This function does
--      NOT filter `recipes.is_public` either -- the ownership gate already
--      bounds the recipe set to exactly those referenced by the caller's own
--      plan. (This is why 4C does NOT reuse
--      `get_recipe_list_with_detail_json`, which would silently drop such
--      recipes and is capped at 200 rows.)
--
--   9. UNIT DISPLAY-NAME LANGUAGE: the API resolves the CALLER's
--      `user_preferences.unit_language` server-side (it never trusts a
--      client-supplied language) and picks the unit display name with it:
--        unit_language = 'en' -> display_name_en, else display_name_zh, else code
--        otherwise            -> display_name_zh, else display_name_en, else code
--      The API resolves the preference as: start from default `'zh'`;
--      `SELECT unit_language FROM user_preferences WHERE user_id = <caller>`
--      (`.single()`); `if (prefs?.unit_language) unitLanguage = prefs.unit_language`
--      -- so a MISSING row OR a NULL / empty-string value both keep `'zh'`.
--      -> `user_unit_language` CTE =
--         `COALESCE(NULLIF((SELECT unit_language FROM user_preferences
--                           WHERE user_id = auth.uid()), ''), 'zh')`
--      (`user_preferences.user_id` is UNIQUE, so the bare subquery matches
--      `.single()`). The `line_items.unit_display` expression then orders the
--      two `display_name_*` columns by that resolved language. This RPC takes
--      NO language argument. The `... else code` tail of each chain is applied
--      CLIENT-SIDE: the RPC returns the raw `unit_code` alongside `unit_display`
--      and `shoppingListModel.ts::toDisplayUnit` does `unit_display || code`
--      (mirrors the API's `unitDisplay || unitCode`), so the client output
--      shape is unchanged by this parity fix.
--
--
-- SHAPE / COST
-- -----------------------------------------------------------------------------
--   * Returns `jsonb` -- always a single object `{"items": [...]}` for an
--     owned plan, or SQL NULL. `items` is a JSON ARRAY; element order is fixed
--     inside `jsonb_agg(... ORDER BY shopping_category, name)`, not left to row
--     emission order.
--   * One statement, CTE-chained. No per-item / per-recipe round trips, no
--     200-row cap, no recipe steps / description / method / cook-time in the
--     payload -- only the six shopping-list fields per ingredient line.
--   * `STABLE`, no `INSERT`/`UPDATE`/`DELETE` -- read-only.
--   * `SET search_path = pg_catalog, public, pg_temp` so a SECURITY DEFINER
--     body cannot be hijacked by a caller-controlled search_path.

CREATE OR REPLACE FUNCTION public.get_menu_plan_shopping_list_json(p_plan_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH owned_plan AS (
    SELECT mp.id
    FROM public.menu_plans mp
    WHERE mp.id = p_plan_id
      AND mp.user_id = auth.uid()
  ),
  plan_items AS (
    SELECT mpi.recipe_id, mpi.servings
    FROM owned_plan op
    JOIN public.menu_plan_items mpi ON mpi.menu_plan_id = op.id
  ),
  plan_servings AS (
    -- SERVINGS PARITY with src/pages/api/shopping-list.ts. The web multiplier is
    -- `Math.round(sum(item.servings || 1) / items.length)`, floored at 1. JS
    -- `item.servings || 1` coerces BOTH a stored 0 AND NULL/undefined to 1
    -- before averaging, so the per-item term here must map 0 -> 1 as well as
    -- NULL -> 1: `COALESCE(NULLIF(pi.servings, 0), 1)` (NULLIF turns a literal 0
    -- into NULL, COALESCE then makes NULL -> 1). A plain `COALESCE(pi.servings, 1)`
    -- would let a 0 through and drag the average below the web value. The OUTER
    -- `COALESCE(avg(...), 1)` handles an empty plan (avg over 0 rows -> NULL),
    -- matching the web `items.length > 0 ? ... : 1`.
    SELECT GREATEST(
             round(COALESCE(avg(COALESCE(NULLIF(pi.servings, 0), 1)), 1))::int,
             1
           )::numeric AS servings
    FROM plan_items pi
  ),
  plan_recipes AS (
    SELECT DISTINCT pi.recipe_id
    FROM plan_items pi
    WHERE pi.recipe_id IS NOT NULL
  ),
  user_unit_language AS (
    -- UNIT-LANGUAGE PARITY with src/pages/api/shopping-list.ts. The web endpoint
    -- resolves the CALLER's own `user_preferences.unit_language` server-side and
    -- never trusts a client-supplied language; this RPC likewise takes no
    -- language argument and resolves it for auth.uid() here. Web logic:
    -- default 'zh'; `SELECT unit_language ... eq('user_id', <caller>).single()`;
    -- `if (prefs?.unit_language) unitLanguage = prefs.unit_language` -- so a
    -- MISSING row OR a NULL / empty-string value all keep the 'zh' default.
    -- `NULLIF(..., '')` + `COALESCE(..., 'zh')` reproduces that; `user_id` is
    -- UNIQUE on user_preferences so the bare scalar subquery matches `.single()`.
    SELECT COALESCE(
             NULLIF(
               (SELECT up.unit_language
                FROM public.user_preferences up
                WHERE up.user_id = auth.uid()),
               ''
             ),
             'zh'
           ) AS lang
  ),
  line_items AS (
    SELECT
      ri.ingredient_id                                           AS ingredient_id,
      i.name                                                     AS name,
      i.shopping_category                                        AS shopping_category,
      COALESCE(sum(ri.quantity), 0)
        * (SELECT servings FROM plan_servings)                   AS quantity,
      (array_agg(
         nullif(u.code, '')
         ORDER BY ri.created_at NULLS LAST, ri.id
       ))[1]                                                     AS unit_code,
      -- unit_language parity (see header point 9 + `user_unit_language` CTE):
      -- pick the display name by the caller's resolved preference --
      --   'en'      -> display_name_en, else display_name_zh
      --   otherwise -> display_name_zh, else display_name_en
      -- The `... else code` tail of the web chain is applied CLIENT-SIDE: the
      -- raw `unit_code` is returned above and `toDisplayUnit` does
      -- `unit_display || code`. Keeping this expression inside the same
      -- `array_agg(... ORDER BY created_at, id)[1]` preserves the "earliest
      -- recipe_ingredients row wins" tie-break used for `unit_code`.
      (array_agg(
         CASE WHEN (SELECT lang FROM user_unit_language) = 'en'
           THEN COALESCE(nullif(u.display_name_en, ''), nullif(u.display_name_zh, ''))
           ELSE COALESCE(nullif(u.display_name_zh, ''), nullif(u.display_name_en, ''))
         END
         ORDER BY ri.created_at NULLS LAST, ri.id
       ))[1]                                                     AS unit_display
    FROM plan_recipes pr
    JOIN public.recipe_ingredients ri ON ri.recipe_id = pr.recipe_id
    JOIN public.ingredients i          ON i.id = ri.ingredient_id
    LEFT JOIN public.units u           ON u.id = ri.unit_id
    WHERE ri.ingredient_id IS NOT NULL
    GROUP BY ri.ingredient_id, i.name, i.shopping_category
  )
  SELECT jsonb_build_object(
    'items',
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'ingredient_id',     li.ingredient_id,
                   'name',              li.name,
                   'shopping_category', li.shopping_category,
                   'quantity',          li.quantity,
                   'unit_code',         li.unit_code,
                   'unit_display',      li.unit_display
                 )
                 ORDER BY li.shopping_category NULLS LAST, li.name
               )
        FROM line_items li
      ),
      '[]'::jsonb
    )
  )
  FROM owned_plan;
$$;

COMMENT ON FUNCTION public.get_menu_plan_shopping_list_json(uuid) IS
  'Mobile Slice 4C. Read-only. Given a saved-plan id, returns '
  '{"items":[{ingredient_id,name,shopping_category,quantity,unit_code,unit_display}, ...]} '
  'for a plan owned by the calling user (auth.uid()), or SQL NULL when the '
  'plan does not exist OR is owned by someone else (indistinguishable). '
  'SECURITY DEFINER; ownership enforced in-body via menu_plans.user_id = '
  'auth.uid(); no service-role key. Aggregation semantics mirror '
  'src/pages/api/shopping-list.ts: distinct plan recipes counted once, '
  'quantity = sum(recipe_ingredients.quantity) '
  '* round(avg(coalesce(nullif(item servings, 0), 1))) [0 and NULL both -> 1], '
  'grouped by ingredient_id. unit_display language follows the caller''s '
  'user_preferences.unit_language (resolved for auth.uid(); default zh; no '
  'client-supplied language). Category/unit normalisation is done client-side.';

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION; revoke that
-- so the grant below is the complete, auditable access list.
REVOKE ALL ON FUNCTION public.get_menu_plan_shopping_list_json(uuid)
  FROM PUBLIC, anon, service_role;

-- `authenticated` only. NOT granted to `anon`: a shopping list is inherently
-- tied to auth.uid(), which is NULL for anon, so an anon call could only ever
-- return NULL -- there is no reason to expose EXECUTE to that role.
GRANT EXECUTE ON FUNCTION public.get_menu_plan_shopping_list_json(uuid)
  TO authenticated;
