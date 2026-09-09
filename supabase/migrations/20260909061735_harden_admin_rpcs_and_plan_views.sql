-- Migration: harden_admin_rpcs_and_plan_views
--
-- Security hardening for the admin recipe RPCs and the two plan shopping-list
-- views. A read-only audit of production found:
--
--   1. anon can SELECT public.v_menu_plan_shopping_list and read rows.
--   2. anon can SELECT public.vw_menu_plan_grocery_items and read rows.
--   3. anon / authenticated can directly EXECUTE:
--        - public.admin_create_recipe_atomic
--        - public.admin_update_recipe_atomic
--        - public.admin_delete_recipe_atomic
--   4. Those three functions are SECURITY DEFINER with NO fixed search_path,
--      so a caller-controlled search_path can influence the definer-privileged
--      body.
--
-- This migration:
--   * Flips the three admin functions to SECURITY INVOKER, pins their
--     search_path, strips EXECUTE from PUBLIC / anon / authenticated, and
--     leaves EXECUTE only for service_role. The web admin API is the only
--     caller (src/pages/api/admin/recipes/index.js) and, after the paired
--     code change, only ever calls them through the service-role client --
--     which bypasses RLS on its own, so INVOKER loses it nothing.
--   * Sets security_invoker = true on the two views and reduces their grants
--     to SELECT-for-authenticated / SELECT-for-service_role, with nothing for
--     PUBLIC or anon.
--
-- It does NOT: drop or redefine either view, change any view's query, change
-- table RLS enablement or policies, or touch any other object. It is written
-- to run inside the single migration transaction, so any failure below rolls
-- the whole thing back (fail closed).
--
--
-- LIVE / REPO SIGNATURE DRIFT
-- ---------------------------------------------------------------------------
-- The repo migrations (006, 007) define one signature each for these
-- functions, but the live catalog has drifted and may carry a different or
-- additional overload. Hard-coding any single argument list would silently
-- miss overloads and leave them exploitable. So the function hardening below
-- is DYNAMIC: it discovers every overload from pg_catalog.pg_proc and applies
-- the same treatment to each, identifying every overload by
-- pg_get_function_identity_arguments(oid).
--
--
-- FAIL CLOSED ON A MISSING FUNCTION
-- ---------------------------------------------------------------------------
-- If ANY of the three names has zero overloads in schema public, the DO block
-- RAISEs and the migration aborts -- it does not silently "succeed" having
-- hardened nothing.

DO $harden_admin_rpcs$
DECLARE
  target_names   CONSTANT text[] := ARRAY[
    'admin_create_recipe_atomic',
    'admin_update_recipe_atomic',
    'admin_delete_recipe_atomic'
  ];
  fn_name        text;
  overload_count int;
  overload       record;
  qualified      text;
BEGIN
  FOREACH fn_name IN ARRAY target_names
  LOOP
    SELECT count(*)
      INTO overload_count
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = fn_name
       AND p.prokind = 'f';

    IF overload_count = 0 THEN
      RAISE EXCEPTION
        'harden_admin_rpcs_and_plan_views: expected public.% to exist, found 0 overload(s) -- refusing to apply (fail closed)',
        fn_name;
    END IF;

    FOR overload IN
      SELECT p.oid,
             pg_catalog.pg_get_function_identity_arguments(p.oid) AS ident_args
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname = fn_name
         AND p.prokind = 'f'
    LOOP
      qualified := format('public.%I(%s)', fn_name, overload.ident_args);

      -- Run with the CALLER's privileges, not the definer's. The only caller
      -- is the service-role client, which already bypasses RLS, so this
      -- removes the definer-privilege-escalation surface at no functional
      -- cost.
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', qualified);

      -- Pin the search_path so a caller-controlled search_path cannot resolve
      -- unqualified names in the body to attacker objects.
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = pg_catalog, public, pg_temp',
        qualified
      );

      -- Strip EXECUTE from every role that should never call these directly.
      -- (EXECUTE is the only privilege a function has, so REVOKE ALL == that.)
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
        qualified
      );

      -- The web admin API (service-role client) is the sole legitimate caller.
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', qualified);

      RAISE NOTICE 'hardened function %', qualified;
    END LOOP;
  END LOOP;
END
$harden_admin_rpcs$;


-- ===========================================================================
-- Plan shopping-list views
-- ===========================================================================
-- ALTER VIEW on a non-existent relation errors and rolls the migration back,
-- so the existence guard below is only to give a clearer message; the effect
-- is fail-closed either way.

DO $harden_plan_views$
DECLARE
  view_names CONSTANT text[] := ARRAY[
    'v_menu_plan_shopping_list',
    'vw_menu_plan_grocery_items'
  ];
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY view_names
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname = v_name
         AND c.relkind = 'v'
    ) THEN
      RAISE EXCEPTION
        'harden_admin_rpcs_and_plan_views: expected view public.% to exist -- refusing to apply (fail closed)',
        v_name;
    END IF;
  END LOOP;
END
$harden_plan_views$;

-- public.v_menu_plan_shopping_list
--   security_invoker: the view now reads its base tables as the querying role,
--   so those tables' RLS applies to view queries instead of the view owner's
--   privileges masking it.
ALTER VIEW public.v_menu_plan_shopping_list SET (security_invoker = true);
REVOKE ALL ON TABLE public.v_menu_plan_shopping_list FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.v_menu_plan_shopping_list FROM authenticated;
GRANT SELECT ON TABLE public.v_menu_plan_shopping_list TO authenticated;
GRANT SELECT ON TABLE public.v_menu_plan_shopping_list TO service_role;

-- public.vw_menu_plan_grocery_items
ALTER VIEW public.vw_menu_plan_grocery_items SET (security_invoker = true);
REVOKE ALL ON TABLE public.vw_menu_plan_grocery_items FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.vw_menu_plan_grocery_items FROM authenticated;
GRANT SELECT ON TABLE public.vw_menu_plan_grocery_items TO authenticated;
GRANT SELECT ON TABLE public.vw_menu_plan_grocery_items TO service_role;
