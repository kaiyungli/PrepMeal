-- Migration: 20260915053240_unit_safe_shopping_list_aggregation
--
-- Deliberate contract correction to `public.get_menu_plan_shopping_list_json`
-- (introduced in 012_get_menu_plan_shopping_list_json.sql, NOT edited here --
-- this migration only issues a fresh `CREATE OR REPLACE FUNCTION` for the
-- same signature). Does not touch any other object.
--
--
-- WHAT IS WRONG TODAY (both here and in the web endpoint this mirrors)
-- -----------------------------------------------------------------------------
-- 012's own header (point 5) already documented, in writing, that this
-- function -- like `src/pages/api/shopping-list.ts::mergeItems` -- groups
-- rows by `ingredient_id` ALONE. When one ingredient appears under two
-- INCOMPATIBLE units across a plan's recipes (e.g. one recipe calls for
-- "2 tsp" of an ingredient and another for "3 tbsp" of the same ingredient),
-- the old `GROUP BY ri.ingredient_id, i.name, i.shopping_category` summed
-- the raw quantities (2 + 3 = 5) and reported them under whichever unit the
-- earliest `recipe_ingredients` row happened to use ("5 tsp") -- a
-- mathematically invalid number. 012 called this "effectively arbitrary" and
-- consciously mirrored it anyway, for parity with the web endpoint at the
-- time. That parity call is being reversed here, on both sides, together.
--
--
-- THE FIX -- Strategy A: separate by normalized unit, never convert
-- -----------------------------------------------------------------------------
-- Rows now group by `ingredient_id` PLUS a normalized-unit key, computed with
-- the exact same alias table as `src/pages/api/shopping-list.ts::normalizeUnit`
-- (no entry added or removed):
--   teaspoon/tsp -> tsp   tablespoon/tbsp -> tbsp   milliliter/ml -> ml
--   liter/l -> l          gram/g -> g               kilogram/kg -> kg
--   cup -> cup            piece -> 件                anything else -> itself
-- So:
--   * "gram" + "g"   -> BOTH normalize to "g"  -> ONE merged row (unchanged
--     from before -- this was already correct, since both were exact
--     aliases of the same canonical unit).
--   * "g" + "kg"     -> normalize to "g" and "kg" respectively -> TWO
--     separate rows, each with its own correct, un-summed quantity.
--   * "tsp" + "tbsp" -> normalize to "tsp" and "tbsp" respectively -> TWO
--     separate rows. No conversion factor between them is introduced --
--     3 tbsp is reported as its own "3 tbsp" line, not converted to tsp.
--   * mass ("g"/"kg") vs. volume ("ml"/"l") -> different normalized units,
--     already always separate, and remain so.
-- No row is ever dropped: splitting one group into two still emits both.
--
-- This function only ever sees rows WITH an `ingredient_id` (it filters
-- `ri.ingredient_id IS NOT NULL`, exactly as 012 did and as the API's
-- `if (!ri.ingredient_id) continue` still does) -- there is no
-- missing-ingredient-id fallback path on this RPC to preserve, matching
-- 012's own note that this function "only ever sees rows WITH an
-- ingredient_id". The web endpoint's separate `name__normalizedUnit`
-- fallback (used only for rows with no `ingredientId` at all) is unaffected
-- by this migration; it lives in TypeScript, not here.
--
--
-- EVERYTHING ELSE IS UNCHANGED FROM 012 -- diffed line-by-line against it
-- -----------------------------------------------------------------------------
--   * Signature:            `get_menu_plan_shopping_list_json(p_plan_id uuid)
--                            RETURNS jsonb` -- identical.
--   * Security properties:  `LANGUAGE sql STABLE SECURITY DEFINER
--                            SET search_path = pg_catalog, public, pg_temp`
--                            -- identical, same rationale as 012's header.
--   * Ownership gate:        `owned_plan` CTE, same predicate
--                            (`mp.id = p_plan_id AND mp.user_id = auth.uid()`)
--                            -- byte-identical to 012.
--   * Servings multiplier:  `plan_servings` CTE -- byte-identical to 012.
--   * Recipe set:           `plan_recipes` CTE (`SELECT DISTINCT recipe_id`)
--                            -- byte-identical to 012.
--   * Unit-language resolution: `user_unit_language` CTE -- byte-identical
--                            to 012.
--   * Quantity math:         `COALESCE(sum(...), 0) * servings` -- identical
--                            expression, now computed per (ingredient_id,
--                            name, shopping_category, normalized_unit) group
--                            instead of per (ingredient_id, name,
--                            shopping_category) group.
--   * "Earliest row wins" tie-break for `unit_code` / `unit_display`:
--                            same `array_agg(... ORDER BY created_at NULLS
--                            LAST, id)[1]` pattern -- now naturally
--                            deterministic-and-correct rather than
--                            deterministic-but-arbitrary, since every row in
--                            a group now genuinely shares the same
--                            normalized unit (there is no longer a "which
--                            of several different units wins" question).
--   * JSON shape:            same six fields per item (`ingredient_id`,
--                            `name`, `shopping_category`, `quantity`,
--                            `unit_code`, `unit_display`), same
--                            `{"items": [...]}` envelope, same `[]::jsonb`
--                            empty-array fallback, same NULL-for-unowned/
--                            not-found behavior.
--   * Ordering guarantee:    same `ORDER BY shopping_category NULLS LAST,
--                            name` as 012, PLUS one added tie-break column,
--                            `normalized_unit`, appended last: `ORDER BY
--                            shopping_category NULLS LAST, name,
--                            normalized_unit`. `normalized_unit` is carried
--                            as an internal `line_items` column purely to
--                            drive this ORDER BY -- it is NEVER added to
--                            `jsonb_build_object`, so the six-field JSON
--                            shape above is unaffected. The tie-break exists
--                            because this migration is precisely what makes
--                            two rows share an equal (shopping_category,
--                            name) pair for the first time (the same
--                            ingredient, split by unit); Postgres does not
--                            guarantee a stable row order between ties on an
--                            incomplete ORDER BY, so without this addition
--                            the relative order of those two rows would be
--                            merely incidental rather than deterministic.
--                            Categories/names that still resolve to exactly
--                            one row are ordered exactly as before -- the
--                            extra key changes nothing for them.
--   * `is_optional` / `is_public` handling: unchanged (still not filtered,
--                            for the same reasons 012 documented).
--   * REVOKE/GRANT:          identical -- `REVOKE ALL ... FROM PUBLIC, anon,
--                            service_role` then `GRANT EXECUTE ... TO
--                            authenticated` only. No new grantee, no broader
--                            privilege than 012 already had.
--
-- No unit-conversion factor is introduced anywhere in this function. No
-- table, column, or grant is added, dropped, or altered -- this migration
-- issues exactly one `CREATE OR REPLACE FUNCTION`, one updated `COMMENT ON
-- FUNCTION`, and re-asserts the same REVOKE/GRANT pair 012 already applied
-- (idempotent -- re-running the identical REVOKE/GRANT changes nothing).

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
  line_items_raw AS (
    -- Row-level unit normalization, computed BEFORE aggregation so it can be
    -- grouped on directly below. Mirrors
    -- `src/pages/api/shopping-list.ts::normalizeUnit` exactly -- same eight
    -- alias pairs, nothing added or removed. Grouping by this normalized
    -- value (not raw `u.code`) is what lets "gram" and "g" still merge while
    -- "g"/"kg" and "tsp"/"tbsp" correctly stay apart.
    SELECT
      ri.ingredient_id                                            AS ingredient_id,
      i.name                                                      AS name,
      i.shopping_category                                         AS shopping_category,
      ri.quantity                                                 AS quantity,
      ri.created_at                                                AS created_at,
      ri.id                                                        AS id,
      u.code                                                       AS unit_code,
      u.display_name_en                                            AS display_name_en,
      u.display_name_zh                                            AS display_name_zh,
      CASE lower(trim(coalesce(u.code, '')))
        WHEN 'teaspoon'   THEN 'tsp'
        WHEN 'tsp'        THEN 'tsp'
        WHEN 'tablespoon' THEN 'tbsp'
        WHEN 'tbsp'       THEN 'tbsp'
        WHEN 'milliliter' THEN 'ml'
        WHEN 'ml'         THEN 'ml'
        WHEN 'liter'      THEN 'l'
        WHEN 'l'          THEN 'l'
        WHEN 'gram'       THEN 'g'
        WHEN 'g'          THEN 'g'
        WHEN 'kilogram'   THEN 'kg'
        WHEN 'kg'         THEN 'kg'
        WHEN 'cup'        THEN 'cup'
        WHEN 'piece'      THEN '件'
        ELSE coalesce(u.code, '')
      END                                                          AS normalized_unit
    FROM plan_recipes pr
    JOIN public.recipe_ingredients ri ON ri.recipe_id = pr.recipe_id
    JOIN public.ingredients i          ON i.id = ri.ingredient_id
    LEFT JOIN public.units u           ON u.id = ri.unit_id
    WHERE ri.ingredient_id IS NOT NULL
  ),
  line_items AS (
    SELECT
      lir.ingredient_id                                          AS ingredient_id,
      lir.name                                                    AS name,
      lir.shopping_category                                       AS shopping_category,
      -- Kept as an internal column only -- never added to the JSON object
      -- below. Its sole purpose here is to give the final `jsonb_agg`
      -- ORDER BY a deterministic tie-break between two rows that now
      -- legitimately share the same (shopping_category, name), which
      -- happens precisely when this migration splits one ingredient into
      -- two unit-separated lines.
      lir.normalized_unit                                         AS normalized_unit,
      COALESCE(sum(lir.quantity), 0)
        * (SELECT servings FROM plan_servings)                    AS quantity,
      -- "Earliest recipe_ingredients row wins" tie-break, same ordering key
      -- 012 used -- now picking among rows that already share one
      -- normalized unit, so this is a display-formatting choice (e.g. "g"
      -- vs. the original "gram" spelling), never a choice between two
      -- genuinely different units.
      (array_agg(
         nullif(lir.unit_code, '')
         ORDER BY lir.created_at NULLS LAST, lir.id
       ))[1]                                                      AS unit_code,
      (array_agg(
         CASE WHEN (SELECT lang FROM user_unit_language) = 'en'
           THEN COALESCE(nullif(lir.display_name_en, ''), nullif(lir.display_name_zh, ''))
           ELSE COALESCE(nullif(lir.display_name_zh, ''), nullif(lir.display_name_en, ''))
         END
         ORDER BY lir.created_at NULLS LAST, lir.id
       ))[1]                                                      AS unit_display
    FROM line_items_raw lir
    GROUP BY lir.ingredient_id, lir.name, lir.shopping_category, lir.normalized_unit
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
                 ORDER BY
                   li.shopping_category NULLS LAST,
                   li.name,
                   li.normalized_unit
               )
        FROM line_items li
      ),
      '[]'::jsonb
    )
  )
  FROM owned_plan;
$$;

COMMENT ON FUNCTION public.get_menu_plan_shopping_list_json(uuid) IS
  'Mobile Slice 4C (unit-safe aggregation update). Read-only. Given a '
  'saved-plan id, returns '
  '{"items":[{ingredient_id,name,shopping_category,quantity,unit_code,unit_display}, ...]} '
  'for a plan owned by the calling user (auth.uid()), or SQL NULL when the '
  'plan does not exist OR is owned by someone else (indistinguishable). '
  'SECURITY DEFINER; ownership enforced in-body via menu_plans.user_id = '
  'auth.uid(); no service-role key. Aggregation semantics mirror '
  'src/pages/api/shopping-list.ts: distinct plan recipes counted once, '
  'quantity = sum(recipe_ingredients.quantity) '
  '* round(avg(coalesce(nullif(item servings, 0), 1))) [0 and NULL both -> 1], '
  'grouped by ingredient_id PLUS a normalized unit (same alias table as the '
  'web normalizeUnit()) so an ingredient recorded under incompatible units '
  '(e.g. tsp vs. tbsp) is returned as separate, individually-correct lines '
  'rather than raw-summed under one arbitrary unit. unit_display language '
  'follows the caller''s user_preferences.unit_language (resolved for '
  'auth.uid(); default zh; no client-supplied language). Category/unit '
  'normalisation for display stays client-side; this function''s own '
  'normalized-unit expression exists only to group rows correctly.';

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION; revoke that
-- so the grant below is the complete, auditable access list. Identical to
-- 012 -- re-asserted here because CREATE OR REPLACE FUNCTION does not carry
-- grants forward from a dropped/replaced definition in all Postgres
-- versions, so this must be restated to guarantee the access list stays
-- exactly what it was.
REVOKE ALL ON FUNCTION public.get_menu_plan_shopping_list_json(uuid)
  FROM PUBLIC, anon, service_role;

-- `authenticated` only. NOT granted to `anon`: a shopping list is inherently
-- tied to auth.uid(), which is NULL for anon, so an anon call could only ever
-- return NULL -- there is no reason to expose EXECUTE to that role.
GRANT EXECUTE ON FUNCTION public.get_menu_plan_shopping_list_json(uuid)
  TO authenticated;
