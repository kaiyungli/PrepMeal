-- Migration: reconcile_admin_recipe_rpc_contract
--
-- Brings the deployed admin recipe RPC contract back in line with the domain
-- schema and the Admin API call site (src/pages/api/admin/recipes/index.js).
--
-- WHY
-- ---------------------------------------------------------------------------
-- src/pages/api/admin/recipes/index.js sends, on every create / update:
--
--   POST -> db.rpc('admin_create_recipe_atomic', { ...22 named args })   (index.js:126-149)
--   PUT  -> db.rpc('admin_update_recipe_atomic', { ...23 named args })   (index.js:178-202)
--
-- The 22-arg set carries eight recipe-metadata fields the rest of the system
-- already depends on:
--   method, speed, servings_unit, meal_role, is_complete_meal,
--   primary_protein, budget_level, reuse_group
-- All eight are real, CHECK-constrained columns on public.recipes. method and
-- speed are NOT NULL. meal_role / is_complete_meal / primary_protein /
-- budget_level are read by the meal-plan generator, the recipe filters and the
-- nutrition-tagging rules.
--
-- The functions deployed today accept only 14 / 15 args. Their create body
-- hard-codes method = 'boiled', speed = 'normal' and never writes the other
-- six; their update body never touches any of the eight. PostgREST resolves an
-- RPC by its exact named-argument set, so the 22 / 23-key calls do not bind to
-- the 14 / 15-arg overloads at all -- admin recipe create + update are
-- non-functional in production.
--
-- WHAT THIS MIGRATION DOES
-- ---------------------------------------------------------------------------
--   1. Fail-closed pre-flight: enumerate every overload of the three admin
--      recipe RPC names from pg_catalog and abort (RAISE) unless every one is a
--      signature this migration knows how to reconcile:
--        admin_create_recipe_atomic : the 14-arg legacy OR the 22-arg canonical
--        admin_update_recipe_atomic : the 15-arg legacy OR the 23-arg canonical
--        admin_delete_recipe_atomic : the 1-arg signature (never modified here)
--      This supports both starting points:
--        A. production, carrying the legacy 14 / 15-arg overloads
--        B. a local / historical DB that already applied repo 006 / 007 and so
--           already carries a 22 / 23-arg overload
--   2. DROP the legacy 14 / 15-arg overloads if present (no-op under B).
--   3. CREATE OR REPLACE the canonical 22 / 23-arg create / update functions.
--      Their bodies write ALL canonical recipe fields and keep recipe +
--      ingredients + steps in a single transaction; any slug collision,
--      missing-recipe update, or child-row violation raises and rolls back the
--      whole RPC.
--   4. Re-assert the security posture on create + update explicitly:
--      SECURITY INVOKER, pinned search_path, EXECUTE for service_role only.
--   5. Fail-closed post-check: exactly one overload per name with the expected
--      arity, SECURITY INVOKER, search_path pinned, and no EXECUTE for
--      PUBLIC / anon / authenticated.
--   6. Notify PostgREST to reload its schema cache.
--
-- It does NOT touch admin_delete_recipe_atomic, and it does NOT create / alter
-- / drop any table, view, RLS state, policy, or any grant other than EXECUTE on
-- these two functions. No historical migration is modified.
--
-- The file runs inside the single implicit migration transaction: any RAISE
-- below rolls the whole thing back (fail closed).


-- ===========================================================================
-- 1. Fail-closed pre-flight -- only the audit's known signatures may exist
-- ===========================================================================
DO $preflight$
DECLARE
  k_create_legacy CONSTANT text :=
    'p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text, '
    'p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer, '
    'p_base_servings integer, p_image_url text, p_calories_per_serving numeric, '
    'p_is_public boolean, p_ingredients jsonb, p_steps jsonb';
  k_create_canon CONSTANT text :=
    'p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text, '
    'p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer, '
    'p_base_servings integer, p_image_url text, p_calories_per_serving numeric, '
    'p_is_public boolean, p_method text, p_speed text, p_servings_unit text, '
    'p_meal_role text, p_is_complete_meal boolean, p_primary_protein text, '
    'p_budget_level text, p_reuse_group text, p_ingredients jsonb, p_steps jsonb';
  k_update_legacy CONSTANT text := 'p_recipe_id uuid, ' || k_create_legacy;
  k_update_canon  CONSTANT text := 'p_recipe_id uuid, ' || k_create_canon;
  k_delete        CONSTANT text := 'p_recipe_id uuid';
  r        record;
  n_create int := 0;
  n_update int := 0;
  n_delete int := 0;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS ident
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prokind = 'f'
       AND p.proname IN ('admin_create_recipe_atomic',
                         'admin_update_recipe_atomic',
                         'admin_delete_recipe_atomic')
  LOOP
    IF r.proname = 'admin_create_recipe_atomic' THEN
      n_create := n_create + 1;
      IF r.ident NOT IN (k_create_legacy, k_create_canon) THEN
        RAISE EXCEPTION
          'reconcile_admin_recipe_rpc_contract: unknown overload public.admin_create_recipe_atomic(%) -- refusing to apply (fail closed)',
          r.ident;
      END IF;
    ELSIF r.proname = 'admin_update_recipe_atomic' THEN
      n_update := n_update + 1;
      IF r.ident NOT IN (k_update_legacy, k_update_canon) THEN
        RAISE EXCEPTION
          'reconcile_admin_recipe_rpc_contract: unknown overload public.admin_update_recipe_atomic(%) -- refusing to apply (fail closed)',
          r.ident;
      END IF;
    ELSE
      n_delete := n_delete + 1;
      IF r.ident <> k_delete THEN
        RAISE EXCEPTION
          'reconcile_admin_recipe_rpc_contract: unknown overload public.admin_delete_recipe_atomic(%) -- refusing to apply (fail closed)',
          r.ident;
      END IF;
    END IF;
  END LOOP;

  IF n_create = 0 THEN
    RAISE EXCEPTION 'reconcile_admin_recipe_rpc_contract: public.admin_create_recipe_atomic not found -- refusing to apply (fail closed)';
  END IF;
  IF n_update = 0 THEN
    RAISE EXCEPTION 'reconcile_admin_recipe_rpc_contract: public.admin_update_recipe_atomic not found -- refusing to apply (fail closed)';
  END IF;
  IF n_delete <> 1 THEN
    RAISE EXCEPTION 'reconcile_admin_recipe_rpc_contract: expected exactly one public.admin_delete_recipe_atomic(uuid), found % -- refusing to apply (fail closed)', n_delete;
  END IF;
END
$preflight$;


-- ===========================================================================
-- 2. Drop the legacy 14 / 15-arg overloads (no-op if the DB is already on the
--    canonical shape). Exact identity signatures; no CASCADE (pg_depend shows
--    zero dependants). The pre-flight above has already proven no unknown
--    overload exists, so IF EXISTS only absorbs starting-point B.
-- ===========================================================================
DROP FUNCTION IF EXISTS public.admin_create_recipe_atomic(
  text, text, text, text, text, text,
  integer, integer, integer,
  text, numeric, boolean,
  jsonb, jsonb
);

DROP FUNCTION IF EXISTS public.admin_update_recipe_atomic(
  uuid,
  text, text, text, text, text, text,
  integer, integer, integer,
  text, numeric, boolean,
  jsonb, jsonb
);


-- ===========================================================================
-- 3a. Canonical create -- public.admin_create_recipe_atomic (22 args)
--     Parameter names / order identical to index.js POST (index.js:126-149).
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_create_recipe_atomic(
  p_name                 text,
  p_slug                 text,
  p_description          text,
  p_cuisine              text,
  p_dish_type            text,
  p_difficulty           text,
  p_prep_time_minutes    integer,
  p_cook_time_minutes    integer,
  p_base_servings        integer,
  p_image_url            text,
  p_calories_per_serving numeric,
  p_is_public            boolean,
  p_method               text,
  p_speed                text,
  p_servings_unit        text,
  p_meal_role            text,
  p_is_complete_meal     boolean,
  p_primary_protein      text,
  p_budget_level         text,
  p_reuse_group          text,
  p_ingredients          jsonb,
  p_steps                jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE
  v_recipe_id uuid;
  v_result    jsonb;
BEGIN
  -- Recipe row: writes every canonical field, including all eight metadata
  -- columns. method / speed are NOT NULL with no column default, so coalesce
  -- a blank/absent value to a CHECK-valid default; the nullable metadata
  -- columns take NULL for '' so their "IS NULL OR = ANY(...)" CHECKs pass.
  INSERT INTO public.recipes (
    name, slug, description, cuisine, dish_type, difficulty,
    prep_time_minutes, cook_time_minutes, base_servings,
    image_url, calories_per_serving, is_public,
    method, speed, servings_unit, meal_role, is_complete_meal,
    primary_protein, budget_level, reuse_group
  ) VALUES (
    p_name, p_slug, p_description, p_cuisine, p_dish_type, p_difficulty,
    p_prep_time_minutes, p_cook_time_minutes, p_base_servings,
    p_image_url, p_calories_per_serving, p_is_public,
    COALESCE(NULLIF(p_method, ''), 'stir_fry'),
    COALESCE(NULLIF(p_speed, ''), 'normal'),
    COALESCE(NULLIF(p_servings_unit, ''), 'portion'),
    NULLIF(p_meal_role, ''),
    COALESCE(p_is_complete_meal, false),
    NULLIF(p_primary_protein, ''),
    NULLIF(p_budget_level, ''),
    NULLIF(p_reuse_group, '')
  )
  RETURNING id INTO v_recipe_id;

  -- Ingredients: UUID references only, no name/code lookup. ingredient_id,
  -- unit_id and quantity are NOT NULL on the table; a missing key casts to
  -- NULL and the INSERT raises, rolling back the whole RPC.
  IF jsonb_typeof(COALESCE(p_ingredients, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(COALESCE(p_ingredients, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.recipe_ingredients (
      recipe_id, ingredient_id, quantity, unit_id, is_optional, prep_note, group_key
    )
    SELECT
      v_recipe_id,
      (j->>'ingredient_id')::uuid,
      (j->>'quantity')::numeric,
      (j->>'unit_id')::uuid,
      COALESCE((j->>'is_optional')::boolean, false),
      NULLIF(j->>'notes', ''),
      NULLIF(j->>'group_key', '')
    FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) AS j;
  END IF;

  -- Steps: step_no / text / time_seconds.
  IF jsonb_typeof(COALESCE(p_steps, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(COALESCE(p_steps, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.recipe_steps (recipe_id, step_no, text, time_seconds)
    SELECT
      v_recipe_id,
      (j->>'step_no')::integer,
      j->>'text',
      NULLIF((j->>'time_seconds')::text, '')::integer
    FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) AS j;
  END IF;

  SELECT jsonb_build_object(
    'recipe', (SELECT to_jsonb(r) FROM public.recipes r WHERE r.id = v_recipe_id),
    'ingredients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ri.id,
        'recipe_id', ri.recipe_id,
        'ingredient_id', ri.ingredient_id,
        'quantity', ri.quantity,
        'unit_id', ri.unit_id,
        'is_optional', ri.is_optional,
        'notes', ri.prep_note,
        'group_key', ri.group_key
      )), '[]'::jsonb)
      FROM public.recipe_ingredients ri
      WHERE ri.recipe_id = v_recipe_id
    ),
    'steps', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'recipe_id', rs.recipe_id,
        'step_no', rs.step_no,
        'text', rs.text,
        'time_seconds', rs.time_seconds
      ) ORDER BY rs.step_no), '[]'::jsonb)
      FROM public.recipe_steps rs
      WHERE rs.recipe_id = v_recipe_id
    )
  )
  INTO v_result;

  RETURN v_result;
END
$fn$;


-- ===========================================================================
-- 3b. Canonical update -- public.admin_update_recipe_atomic (23 args)
--     p_recipe_id + the 22 create args; identical to index.js PUT
--     (index.js:178-202). Full-replace of ingredients and steps.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.admin_update_recipe_atomic(
  p_recipe_id            uuid,
  p_name                 text,
  p_slug                 text,
  p_description          text,
  p_cuisine              text,
  p_dish_type            text,
  p_difficulty           text,
  p_prep_time_minutes    integer,
  p_cook_time_minutes    integer,
  p_base_servings        integer,
  p_image_url            text,
  p_calories_per_serving numeric,
  p_is_public            boolean,
  p_method               text,
  p_speed                text,
  p_servings_unit        text,
  p_meal_role            text,
  p_is_complete_meal     boolean,
  p_primary_protein      text,
  p_budget_level         text,
  p_reuse_group          text,
  p_ingredients          jsonb,
  p_steps                jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.recipes SET
    name                 = p_name,
    slug                 = p_slug,
    description          = p_description,
    cuisine              = p_cuisine,
    dish_type            = p_dish_type,
    difficulty           = p_difficulty,
    prep_time_minutes    = p_prep_time_minutes,
    cook_time_minutes    = p_cook_time_minutes,
    base_servings        = p_base_servings,
    image_url            = p_image_url,
    calories_per_serving = p_calories_per_serving,
    is_public            = p_is_public,
    method               = COALESCE(NULLIF(p_method, ''), 'stir_fry'),
    speed                = COALESCE(NULLIF(p_speed, ''), 'normal'),
    servings_unit        = COALESCE(NULLIF(p_servings_unit, ''), 'portion'),
    meal_role            = NULLIF(p_meal_role, ''),
    is_complete_meal     = COALESCE(p_is_complete_meal, false),
    primary_protein      = NULLIF(p_primary_protein, ''),
    budget_level         = NULLIF(p_budget_level, ''),
    reuse_group          = NULLIF(p_reuse_group, '')
  WHERE id = p_recipe_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'admin_update_recipe_atomic: recipe % not found', p_recipe_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Ingredients: transactional full replacement.
  DELETE FROM public.recipe_ingredients WHERE recipe_id = p_recipe_id;
  IF jsonb_typeof(COALESCE(p_ingredients, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(COALESCE(p_ingredients, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.recipe_ingredients (
      recipe_id, ingredient_id, quantity, unit_id, is_optional, prep_note, group_key
    )
    SELECT
      p_recipe_id,
      (j->>'ingredient_id')::uuid,
      (j->>'quantity')::numeric,
      (j->>'unit_id')::uuid,
      COALESCE((j->>'is_optional')::boolean, false),
      NULLIF(j->>'notes', ''),
      NULLIF(j->>'group_key', '')
    FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) AS j;
  END IF;

  -- Steps: transactional full replacement.
  DELETE FROM public.recipe_steps WHERE recipe_id = p_recipe_id;
  IF jsonb_typeof(COALESCE(p_steps, '[]'::jsonb)) = 'array'
     AND jsonb_array_length(COALESCE(p_steps, '[]'::jsonb)) > 0 THEN
    INSERT INTO public.recipe_steps (recipe_id, step_no, text, time_seconds)
    SELECT
      p_recipe_id,
      (j->>'step_no')::integer,
      j->>'text',
      NULLIF((j->>'time_seconds')::text, '')::integer
    FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) AS j;
  END IF;

  SELECT jsonb_build_object(
    'recipe', (SELECT to_jsonb(r) FROM public.recipes r WHERE r.id = p_recipe_id),
    'ingredients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ri.id,
        'recipe_id', ri.recipe_id,
        'ingredient_id', ri.ingredient_id,
        'quantity', ri.quantity,
        'unit_id', ri.unit_id,
        'is_optional', ri.is_optional,
        'notes', ri.prep_note,
        'group_key', ri.group_key
      )), '[]'::jsonb)
      FROM public.recipe_ingredients ri
      WHERE ri.recipe_id = p_recipe_id
    ),
    'steps', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'recipe_id', rs.recipe_id,
        'step_no', rs.step_no,
        'text', rs.text,
        'time_seconds', rs.time_seconds
      ) ORDER BY rs.step_no), '[]'::jsonb)
      FROM public.recipe_steps rs
      WHERE rs.recipe_id = p_recipe_id
    )
  )
  INTO v_result;

  RETURN v_result;
END
$fn$;


-- ===========================================================================
-- 4. Security posture -- explicit on the two reconciled functions only.
--    (admin_delete_recipe_atomic is intentionally left untouched.)
-- ===========================================================================
REVOKE ALL ON FUNCTION public.admin_create_recipe_atomic(
  text, text, text, text, text, text, integer, integer, integer, text, numeric, boolean,
  text, text, text, text, boolean, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_recipe_atomic(
  text, text, text, text, text, text, integer, integer, integer, text, numeric, boolean,
  text, text, text, text, boolean, text, text, text, jsonb, jsonb
) TO service_role;

REVOKE ALL ON FUNCTION public.admin_update_recipe_atomic(
  uuid, text, text, text, text, text, text, integer, integer, integer, text, numeric, boolean,
  text, text, text, text, boolean, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_recipe_atomic(
  uuid, text, text, text, text, text, text, integer, integer, integer, text, numeric, boolean,
  text, text, text, text, boolean, text, text, text, jsonb, jsonb
) TO service_role;


-- ===========================================================================
-- 5. Fail-closed post-check
-- ===========================================================================
DO $postcheck$
DECLARE
  spec record;
  r    record;
  n    int;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('admin_create_recipe_atomic', 22),
      ('admin_update_recipe_atomic', 23),
      ('admin_delete_recipe_atomic', 1)
    ) AS t(proname, expected_args)
  LOOP
    SELECT count(*) INTO n
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f' AND p.proname = spec.proname;
    IF n <> 1 THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: expected exactly 1 overload of public.%, found % -- rolling back',
        spec.proname, n;
    END IF;

    SELECT count(*) INTO n
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND p.proname = spec.proname AND p.pronargs = spec.expected_args;
    IF n <> 1 THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: public.% is not the expected %-arg signature -- rolling back',
        spec.proname, spec.expected_args;
    END IF;
  END LOOP;

  -- create + update must be SECURITY INVOKER, search_path pinned, and grant
  -- EXECUTE to service_role only (never PUBLIC / anon / authenticated).
  FOR r IN
    SELECT p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl, p.proowner
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND p.proname IN ('admin_create_recipe_atomic', 'admin_update_recipe_atomic')
  LOOP
    IF r.prosecdef THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: public.% is SECURITY DEFINER -- rolling back', r.proname;
    END IF;

    IF r.proconfig IS NULL
       OR NOT ('search_path=pg_catalog, public, pg_temp' = ANY (r.proconfig)) THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: public.% search_path not pinned (proconfig = %) -- rolling back',
        r.proname, r.proconfig;
    END IF;

    IF EXISTS (
      SELECT 1
        FROM aclexplode(COALESCE(r.proacl, acldefault('f', r.proowner))) a
       WHERE a.privilege_type = 'EXECUTE'
         AND (a.grantee = 0                              -- 0 == PUBLIC
              OR a.grantee = 'anon'::regrole
              OR a.grantee = 'authenticated'::regrole)
    ) THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: public.% grants EXECUTE to PUBLIC/anon/authenticated -- rolling back', r.proname;
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM aclexplode(COALESCE(r.proacl, acldefault('f', r.proowner))) a
       WHERE a.privilege_type = 'EXECUTE'
         AND a.grantee = 'service_role'::regrole
    ) THEN
      RAISE EXCEPTION
        'reconcile_admin_recipe_rpc_contract: post-check: public.% is missing EXECUTE for service_role -- rolling back', r.proname;
    END IF;
  END LOOP;
END
$postcheck$;


-- ===========================================================================
-- 6. Reload the PostgREST schema cache so the new signatures are resolvable at
--    /rest/v1/rpc/... immediately. Supabase installs a DDL event trigger that
--    also issues this NOTIFY; PostgreSQL deduplicates identical NOTIFY within a
--    transaction, so this explicit call is a harmless belt-and-braces that
--    closes the auto-reload lag window.
-- ===========================================================================
NOTIFY pgrst, 'reload schema';
