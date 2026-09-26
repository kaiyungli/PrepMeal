-- Migration: baseline_views_and_functions
--
-- PrepMeal Canonical Baseline, Slice 3 of 3 (views & functions) -- REVISED
-- SCOPE (6 objects, expanded from an original 2-view/2-function scope per
-- /home/venn/prepmeal-baseline-slice3-admin-rpc-gap-closure.md, which found
-- that closing Slice 3 at only 2 functions left later migrations
-- 20260909061735/20260910060642 unable to replay from an empty database):
--   views:     public.v_menu_plan_shopping_list, public.vw_menu_plan_grocery_items
--   functions: public.get_recipe_detail_json(p_id_or_slug text),
--              public.admin_create_recipe_atomic(22 args),
--              public.admin_update_recipe_atomic(23 args, p_recipe_id + the 22),
--              public.admin_delete_recipe_atomic(p_recipe_id uuid)
-- No other object is touched.
--
-- PROVENANCE: every definition below (view SQL text, function signatures,
-- security modes, search_path/proconfig, ACL, and full function bodies) is
-- taken verbatim from a fresh, read-only live-catalog capture of the linked
-- project (hivnajhqqvaokthzhugx) performed at implementation time -- see
-- /home/venn/prepmeal-baseline-views-functions-implementation.md. This is
-- consistent with, and independently re-verified against, the contract
-- locked by /home/venn/prepmeal-baseline-views-functions-final-design.md
-- and /home/venn/prepmeal-baseline-slice3-admin-rpc-gap-closure.md. Two of
-- the four function bodies (admin_delete_recipe_atomic,
-- get_recipe_detail_json) are stored live with CRLF line endings, the
-- other two with plain LF -- reproduced exactly as captured, not
-- normalized, since prosrc is part of each function's compared identity.
--
-- FRESH VS COMPATIBLE (standard two-state fail-closed design, matching
-- Slice 1/2's own established convention):
--   FRESH: all 6 target objects absent -> create exactly these 6, in the
--     stable creation order below.
--   COMPATIBLE: all 6 target objects present, with owner=postgres, exactly
--     1 overload per function name, and a full-identity SHA-256 hash
--     (over pg_get_viewdef+reloptions+owner for views, over
--     pg_get_functiondef for functions -- which itself encodes signature,
--     return type, language, security mode, search_path/proconfig and
--     body) exactly matching this file's embedded expected contract, PLUS
--     explicit standalone checks on security mode/search_path/
--     security_invoker (so a drift in exactly one of those properties
--     raises its own distinct message rather than only a generic hash
--     mismatch) and a full 5-field raw-ACL symmetric diff -> no-op.
--   Any other state (1-5 of 6 objects present, wrong relkind/routine kind,
--     overload drift, any identity/security/ACL drift) fails closed with
--     no third/hybrid acceptance state.
--
-- CREATION ORDER (documented as the CHOSEN STABLE ORDER, not a strict
-- dependency requirement among the 6 objects themselves, except where
-- noted): both views, then get_recipe_detail_json, then
-- admin_create_recipe_atomic, then admin_update_recipe_atomic, then
-- admin_delete_recipe_atomic. Views first preserves the original 2-object
-- Slice 3 scope's "smallest reviewable boundary"; create-before-update
-- mirrors 20260910060642's own internal ordering; delete last preserves
-- its original position in the pre-expansion scope. THE ONE REAL PROVEN
-- DEPENDENCY: both views' CREATE VIEW statements are schema-resolved at
-- creation time and therefore genuinely REQUIRE Slice 2's
-- public.menu_plan_items to already exist -- enforced below by this
-- migration's own preflight prerequisite check, not by ordering among the
-- 6 objects. None of the 4 functions has a CREATE-time dependency on
-- anything in this file or on menu_plan_items (plpgsql bodies are not
-- schema-checked at CREATE FUNCTION time); admin_delete_recipe_atomic's
-- body references menu_plan_items only at first INVOCATION, which this
-- migration's Slice-2-prerequisite preflight check already guarantees is
-- satisfied by the time this migration can ever reach its creation path.
--
-- DOWNSTREAM MIGRATIONS THIS UNBLOCKS: 20260909061735 (fail-closes on both
-- views + all 3 admin functions -- not only admin_delete_recipe_atomic),
-- 20260909135709 (view-grant preflight), 20260910060642 (fail-closes on
-- admin_create_recipe_atomic/admin_update_recipe_atomic's exact
-- identity-argument shape). All three become idempotent no-ops once this
-- migration creates the exact live shape they each expect -- the
-- identity-argument strings captured live in this migration's expected
-- contract were independently cross-checked character-for-character
-- against 20260910060642's own k_create_canon/k_update_canon constants at
-- implementation time (see the implementation report).
--
-- SECURITY / ACL GUARANTEES (reproduced exactly, neither hardened nor
-- weakened beyond the live contract):
--   v_menu_plan_shopping_list, vw_menu_plan_grocery_items: security_invoker
--     = true (no security_barrier reloption), ACL: authenticated=SELECT,
--     service_role=SELECT only -- no anon, no PUBLIC, no write grant to
--     any non-owner role. Both are explicitly REVOKEd from the project's
--     own pre-existing default-privileges rule (which would otherwise
--     grant every newly created relation, views included, ALL privileges
--     to postgres/anon/authenticated/service_role) down to this exact
--     narrower shape on the fresh path.
--   get_recipe_detail_json(text): SECURITY DEFINER, search_path=public
--     only, broad EXECUTE (PUBLIC, anon, authenticated, service_role,
--     postgres) -- matches its intended public-recipe-read purpose. This
--     is the live, working posture and is captured as-is, NOT "corrected"
--     to the narrower admin pattern (that would be scope creep beyond this
--     baseline's mandate to reproduce, not harden).
--   admin_create_recipe_atomic, admin_update_recipe_atomic,
--     admin_delete_recipe_atomic: SECURITY INVOKER, search_path=pg_catalog,
--     public, pg_temp, EXECUTE restricted to postgres + service_role only
--     -- no PUBLIC/anon/authenticated grant. This migration explicitly
--     REVOKEs the default PUBLIC EXECUTE grant PostgreSQL applies to every
--     newly created function, on the fresh path, for these three
--     functions -- they must never become publicly callable.
--
-- NO APPLICATION-DATA MUTATION: this migration contains zero INSERT/
-- UPDATE/DELETE against any application table, on either path. No
-- schema/table/index/constraint/policy/trigger object is created, altered,
-- or dropped -- only the 6 named views/functions and their own ACL. No
-- CASCADE is used anywhere. No dynamic identifier concatenation is used
-- where static DDL suffices (every CREATE/REVOKE/GRANT below is fully
-- static literal DDL text, guarded by a preceding existence check, mirroring
-- Slice 1/2's own established convention). No modification of any Slice 1
-- or Slice 2 object.
--
-- PRODUCTION HANDLING: these 6 objects are already live in production
-- today (confirmed by the live-capture audits this migration is sourced
-- from). Applying this migration through the ordinary Supabase CLI
-- migration flow will find it sorts BEFORE later-timestamped migrations
-- already in remote history and will refuse via
-- LegacyDbPushMissingRemoteError, exactly as Slice 1/2 did. Reconciling
-- production's migration-history table (a history-only `migration repair`,
-- never a `db push` of this file's DDL) is a SEPARATE, explicitly-approved
-- future task -- not performed, and not authorized, by this migration file
-- or by its implementation.
--
-- KNOWN OUT-OF-SCOPE FINDINGS (reproduced as-is here, not fixed by this
-- migration -- see the readiness/gap-closure audits for full detail):
--   - menu_plans/menu_plan_items RLS policies use the bare `auth.uid()`
--     form rather than the wrapped `(select auth.uid())` performance
--     pattern -- a documented, pre-existing style inconsistency, entirely
--     outside this migration's 6-object scope, not touched here.
--   - v_menu_plan_shopping_list and vw_menu_plan_grocery_items currently
--     have no live application caller (the app uses a separate RPC,
--     get_menu_plan_shopping_list_json, for shopping lists) -- reproduced
--     here because it is part of the intentionally-hardened live contract,
--     not because it has an active caller today.
--   - get_recipe_detail_json's broad PUBLIC/anon/authenticated EXECUTE
--     grant is intentional and is NOT narrowed by this migration.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching every other
-- migration in this repository -- a RAISE EXCEPTION inside a DO block
-- rolls back the whole implicit single-statement-protocol transaction when
-- this file is sent as one multi-statement simple-query message (the
-- mechanism Supabase's own migration runner uses; verified empirically for
-- Slice 2's own migration in isolated PostgreSQL 17 testing).

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  present_count      int;
  overload_rec       record;
  mismatch_count     int;
BEGIN
  -- A0. No object of a different kind may occupy a target name.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
       AND c.relkind <> 'v'
  ) THEN
    RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target view name is occupied by a non-view object -- refusing to proceed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
       AND p.prokind <> 'f'
  ) THEN
    RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target function name is occupied by a non-function routine -- refusing to proceed';
  END IF;

  -- A1. Global present_count across all 6 target objects (view existence by
  -- name+relkind; function existence by ANY overload of the name).
  SELECT
    (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND c.relname='v_menu_plan_shopping_list')
  + (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND c.relname='vw_menu_plan_grocery_items')
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_create_recipe_atomic') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_update_recipe_atomic') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_delete_recipe_atomic') THEN 1 ELSE 0 END)
  INTO present_count;

  IF present_count NOT IN (0, 6) THEN
    RAISE EXCEPTION 'baseline_views_and_functions: preflight: % of 6 target objects exist -- expected 0 (fresh) or 6 (compatible), refusing partial state', present_count;
  END IF;

  -- A2. Prerequisite check: required Slice 1 + Slice 2 tables must already
  -- exist (both branches -- fresh creation needs them for CREATE VIEW's
  -- schema resolution and for admin_delete_recipe_atomic's eventual first
  -- invocation; the compatible path needs them for the 6 objects to even
  -- be valid). This migration creates/alters none of them.
  IF (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r'
         AND c.relname IN ('recipes','recipe_ingredients','ingredients','units','recipe_steps','recipe_equipment')) <> 6 THEN
    RAISE EXCEPTION 'baseline_views_and_functions: preflight: one or more required Slice 1 prerequisite tables is missing -- refusing to proceed';
  END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r' AND c.relname = 'menu_plan_items') <> 1 THEN
    RAISE EXCEPTION 'baseline_views_and_functions: preflight: required Slice 2 prerequisite table public.menu_plan_items is missing -- refusing to proceed';
  END IF;

  IF present_count = 6 THEN
    -- overload count exactly 1 per function name -- reject extra overloads.
    FOR overload_rec IN
      SELECT p.proname, count(*) AS n
        FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
       GROUP BY p.proname
    LOOP
      IF overload_rec.n <> 1 THEN
        RAISE EXCEPTION 'baseline_views_and_functions: preflight: public.% has % overloads -- expected exactly 1, refusing to proceed', overload_rec.proname, overload_rec.n;
      END IF;
    END LOOP;

    -- owner must be postgres on all 6.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
         AND pg_catalog.pg_get_userbyid(c.relowner) IS DISTINCT FROM 'postgres'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target view owner is not postgres -- refusing to proceed';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
         AND pg_catalog.pg_get_userbyid(p.proowner) IS DISTINCT FROM 'postgres'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target function owner is not postgres -- refusing to proceed';
    END IF;

    -- view kind / not-materialized check (defensive, in addition to A0).
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
         AND c.relkind <> 'v'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target view is not an ordinary view (relkind<>v) -- refusing to proceed';
    END IF;

    SELECT count(*) INTO mismatch_count FROM (
      (
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','77fbadb6b924518e628382bba5aaee03c00e5d8bf542c0cb4be3b89e48102558'),
          ('view','vw_menu_plan_grocery_items','1bb9715f2a9d0d5b4615bdf2c52c0ac5e51ef90c56f7cea0676bd49f71daa261'),
          ('function','get_recipe_detail_json(text)','240402a1aa6a37995bea2d395fb11b80b2d6e3a6177b1dc06c572ebd46707b5a'),
          ('function','admin_create_recipe_atomic(22 args)','c3cc040daf6aa152bf9f186970fdc3b8a995f2dac1b240954c358f4b08ff35a3'),
          ('function','admin_update_recipe_atomic(23 args)','c19b58dfd0134ec86d8a45f47a534fc6b915ab8c943d84e7c33297b514f55718'),
          ('function','admin_delete_recipe_atomic(uuid)','ed630ed3e41fcd6d4bfff013d161e00b00558e6fa62406b01b1848619abe5572')
        ) AS expected(kind, ident, identity_hash)
        EXCEPT ALL
        (
          SELECT 'view'::text, c.relname::text,
                 encode(sha256((pg_catalog.pg_get_viewdef(c.oid, true) || '|' || array_to_string(c.reloptions,',') || '|' || pg_catalog.pg_get_userbyid(c.relowner))::bytea),'hex')
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text,
                 CASE p.proname
                   WHEN 'get_recipe_detail_json' THEN 'get_recipe_detail_json(text)'
                   WHEN 'admin_create_recipe_atomic' THEN 'admin_create_recipe_atomic(22 args)'
                   WHEN 'admin_update_recipe_atomic' THEN 'admin_update_recipe_atomic(23 args)'
                   WHEN 'admin_delete_recipe_atomic' THEN 'admin_delete_recipe_atomic(uuid)'
                 END,
                 encode(sha256(pg_catalog.pg_get_functiondef(p.oid)::bytea),'hex')
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
      )
      UNION ALL
      (
        (
          SELECT 'view'::text, c.relname::text,
                 encode(sha256((pg_catalog.pg_get_viewdef(c.oid, true) || '|' || array_to_string(c.reloptions,',') || '|' || pg_catalog.pg_get_userbyid(c.relowner))::bytea),'hex')
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text,
                 CASE p.proname
                   WHEN 'get_recipe_detail_json' THEN 'get_recipe_detail_json(text)'
                   WHEN 'admin_create_recipe_atomic' THEN 'admin_create_recipe_atomic(22 args)'
                   WHEN 'admin_update_recipe_atomic' THEN 'admin_update_recipe_atomic(23 args)'
                   WHEN 'admin_delete_recipe_atomic' THEN 'admin_delete_recipe_atomic(uuid)'
                 END,
                 encode(sha256(pg_catalog.pg_get_functiondef(p.oid)::bytea),'hex')
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
        EXCEPT ALL
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','77fbadb6b924518e628382bba5aaee03c00e5d8bf542c0cb4be3b89e48102558'),
          ('view','vw_menu_plan_grocery_items','1bb9715f2a9d0d5b4615bdf2c52c0ac5e51ef90c56f7cea0676bd49f71daa261'),
          ('function','get_recipe_detail_json(text)','240402a1aa6a37995bea2d395fb11b80b2d6e3a6177b1dc06c572ebd46707b5a'),
          ('function','admin_create_recipe_atomic(22 args)','c3cc040daf6aa152bf9f186970fdc3b8a995f2dac1b240954c358f4b08ff35a3'),
          ('function','admin_update_recipe_atomic(23 args)','c19b58dfd0134ec86d8a45f47a534fc6b915ab8c943d84e7c33297b514f55718'),
          ('function','admin_delete_recipe_atomic(uuid)','ed630ed3e41fcd6d4bfff013d161e00b00558e6fa62406b01b1848619abe5572')
        ) AS expected2(kind, ident, identity_hash)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: % object-identity mismatches found across the 6 target objects -- refusing to proceed', mismatch_count;
    END IF;

    -- Explicit standalone security-mode / search_path checks (in addition
    -- to the full-identity hash check above), so a drift in exactly these
    -- specifically-called-out properties raises its own distinct message.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json' AND p.prosecdef IS DISTINCT FROM true) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: get_recipe_detail_json must be SECURITY DEFINER -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic') AND p.prosecdef IS DISTINCT FROM false) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: an admin_*_recipe_atomic function is not SECURITY INVOKER -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json' AND (p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[])) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: get_recipe_detail_json search_path/proconfig does not exactly match search_path=public -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic') AND (p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[])) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: an admin_*_recipe_atomic function search_path/proconfig does not exactly match search_path=pg_catalog, public, pg_temp -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items') AND NOT ('security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[])))) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: a target view is missing security_invoker=true -- refusing to proceed';
    END IF;

    SELECT count(*) INTO mismatch_count FROM (
      (
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','authenticated','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','service_role','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','INSERT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','UPDATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','DELETE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRUNCATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','REFERENCES','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRIGGER','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','MAINTAIN','postgres',false),
          ('view','vw_menu_plan_grocery_items','authenticated','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','service_role','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','INSERT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','UPDATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','DELETE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRUNCATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','REFERENCES','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRIGGER','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','MAINTAIN','postgres',false),
          ('function','get_recipe_detail_json','PUBLIC','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','anon','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','authenticated','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','service_role','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','service_role','EXECUTE','postgres',false)
        ) AS expected(kind, ident, grantee, privilege, grantor, is_grantable)
        EXCEPT ALL
        (
          SELECT 'view'::text, c.relname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('v', c.relowner))) g
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text, p.proname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) g
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
      )
      UNION ALL
      (
        (
          SELECT 'view'::text, c.relname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('v', c.relowner))) g
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text, p.proname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) g
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
        EXCEPT ALL
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','authenticated','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','service_role','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','INSERT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','UPDATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','DELETE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRUNCATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','REFERENCES','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRIGGER','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','MAINTAIN','postgres',false),
          ('view','vw_menu_plan_grocery_items','authenticated','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','service_role','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','INSERT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','UPDATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','DELETE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRUNCATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','REFERENCES','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRIGGER','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','MAINTAIN','postgres',false),
          ('function','get_recipe_detail_json','PUBLIC','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','anon','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','authenticated','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','service_role','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','service_role','EXECUTE','postgres',false)
        ) AS expected2(kind, ident, grantee, privilege, grantor, is_grantable)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION 'baseline_views_and_functions: preflight: % raw-ACL-row mismatches found across the 6 target objects (expected exactly the 30-row live contract) -- refusing to proceed', mismatch_count;
    END IF;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Creation -- reached on the FRESH path only (present_count=0 was
--    already verified above). Each object is additionally guarded by its
--    own existence check. No CASCADE, no dynamic identifier
--    concatenation, no application-row DML, no object outside the 6-target
--    scope.
-- ============================================================================

-- B1. v_menu_plan_shopping_list
DO $create_view_shopping_list$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='v_menu_plan_shopping_list'
  ) THEN
    EXECUTE $sql$
      CREATE VIEW public.v_menu_plan_shopping_list
      WITH (security_invoker=true) AS
      SELECT mpi.menu_plan_id,
          i.id AS ingredient_id,
          i.name AS ingredient_name,
          i.shopping_category,
          u.code AS unit_code,
          sum(ri.quantity * mpi.servings) AS total_quantity
         FROM menu_plan_items mpi
           JOIN recipe_ingredients ri ON ri.recipe_id = mpi.recipe_id
           JOIN ingredients i ON i.id = ri.ingredient_id
           JOIN units u ON u.id = ri.unit_id
        GROUP BY mpi.menu_plan_id, i.id, i.name, i.shopping_category, u.code
    $sql$;
    EXECUTE $sql$ ALTER VIEW public.v_menu_plan_shopping_list OWNER TO postgres $sql$;
    EXECUTE $sql$ REVOKE ALL ON public.v_menu_plan_shopping_list FROM anon $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.v_menu_plan_shopping_list FROM authenticated, service_role $sql$;
  END IF;
END;
$create_view_shopping_list$;

-- B2. vw_menu_plan_grocery_items
DO $create_view_grocery_items$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname='vw_menu_plan_grocery_items'
  ) THEN
    EXECUTE $sql$
      CREATE VIEW public.vw_menu_plan_grocery_items
      WITH (security_invoker=true) AS
      SELECT mpi.menu_plan_id,
          ri.ingredient_id,
          ing.name AS ingredient_name,
          u.unit_type,
              CASE u.unit_type
                  WHEN 'mass'::text THEN 'g'::text
                  WHEN 'volume'::text THEN 'ml'::text
                  WHEN 'count'::text THEN 'pc'::text
                  ELSE NULL::text
              END AS base_unit_code,
          sum(ri.quantity * (mpi.servings / NULLIF(r.base_servings, 0)::numeric) * u.to_base) AS total_base_quantity
         FROM menu_plan_items mpi
           JOIN recipes r ON r.id = mpi.recipe_id
           JOIN recipe_ingredients ri ON ri.recipe_id = r.id
           JOIN ingredients ing ON ing.id = ri.ingredient_id
           JOIN units u ON u.id = ri.unit_id
        WHERE ri.is_optional = false
        GROUP BY mpi.menu_plan_id, ri.ingredient_id, ing.name, u.unit_type
    $sql$;
    EXECUTE $sql$ ALTER VIEW public.vw_menu_plan_grocery_items OWNER TO postgres $sql$;
    EXECUTE $sql$ REVOKE ALL ON public.vw_menu_plan_grocery_items FROM anon $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.vw_menu_plan_grocery_items FROM authenticated, service_role $sql$;
  END IF;
END;
$create_view_grocery_items$;

-- B3. get_recipe_detail_json(text) -- SECURITY DEFINER, search_path=public,
--     broad EXECUTE (matches its public-recipe-read purpose; NOT narrowed).
DO $create_fn_get_recipe_detail_json$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='get_recipe_detail_json'
  ) THEN
    CREATE FUNCTION public.get_recipe_detail_json(p_id_or_slug text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $function_body$
DECLARE
  v_result jsonb;
  v_recipe_id uuid;
BEGIN
  -- Detect if input is UUID by pattern
  IF p_id_or_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    SELECT r.id
    INTO v_recipe_id
    FROM public.recipes r
    WHERE r.id = p_id_or_slug::uuid
      AND r.is_public = true
    LIMIT 1;
  ELSE
    SELECT r.id
    INTO v_recipe_id
    FROM public.recipes r
    WHERE r.slug = p_id_or_slug
      AND r.is_public = true
    LIMIT 1;
  END IF;

  IF v_recipe_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'image_url', r.image_url,
    'description', r.description,
    'difficulty', r.difficulty,
    'method', r.method,
    'speed', r.speed,
    'calories_per_serving', r.calories_per_serving,
    'protein_g', r.protein_g,
    'carbs_g', r.carbs_g,
    'fat_g', r.fat_g,
    'total_time_minutes', r.total_time_minutes,
    'cook_time_minutes', r.cook_time_minutes,
    'prep_time_minutes', r.prep_time_minutes,
    'cuisine', r.cuisine,
    'primary_protein', r.primary_protein,
    'dish_type', r.dish_type,
    'diet', r.diet,
    'is_complete_meal', r.is_complete_meal,
    'created_at', r.created_at,

    'ingredients', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'slug', i.slug,
            'shopping_category', i.shopping_category,
            'quantity', ri.quantity,
            'unit', CASE
              WHEN u.id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'code', u.code,
                'name', u.name
              )
            END
          )
          ORDER BY ri.created_at ASC, ri.id ASC
        )
        FROM public.recipe_ingredients ri
        JOIN public.ingredients i
          ON i.id = ri.ingredient_id
        LEFT JOIN public.units u
          ON u.id = ri.unit_id
        WHERE ri.recipe_id = v_recipe_id
      ),
      '[]'::jsonb
    ),

    'steps', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_no', rs.step_no,
            'text', rs.text,
            'time_seconds', rs.time_seconds
          )
          ORDER BY rs.step_no ASC
        )
        FROM public.recipe_steps rs
        WHERE rs.recipe_id = v_recipe_id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.recipes r
  WHERE r.id = v_recipe_id;

  RETURN v_result;
END;
$function_body$;
    ALTER FUNCTION public.get_recipe_detail_json(text) OWNER TO postgres;
    GRANT EXECUTE ON FUNCTION public.get_recipe_detail_json(text) TO PUBLIC, anon, authenticated, service_role, postgres;
  END IF;
END;
$create_fn_get_recipe_detail_json$;

-- B4. admin_create_recipe_atomic(22 args) -- SECURITY INVOKER,
--     search_path=pg_catalog, public, pg_temp, EXECUTE restricted to
--     postgres + service_role only (never PUBLIC/anon/authenticated).
DO $create_fn_admin_create$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='admin_create_recipe_atomic'
  ) THEN
    CREATE FUNCTION public.admin_create_recipe_atomic(
      p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text,
      p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer,
      p_base_servings integer, p_image_url text, p_calories_per_serving numeric,
      p_is_public boolean, p_method text, p_speed text, p_servings_unit text,
      p_meal_role text, p_is_complete_meal boolean, p_primary_protein text,
      p_budget_level text, p_reuse_group text, p_ingredients jsonb, p_steps jsonb
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $function_body$
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
$function_body$;
    ALTER FUNCTION public.admin_create_recipe_atomic(text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) OWNER TO postgres;
    REVOKE EXECUTE ON FUNCTION public.admin_create_recipe_atomic(text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.admin_create_recipe_atomic(text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) TO postgres, service_role;
  END IF;
END;
$create_fn_admin_create$;

-- B5. admin_update_recipe_atomic(23 args) -- same posture as B4.
DO $create_fn_admin_update$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='admin_update_recipe_atomic'
  ) THEN
    CREATE FUNCTION public.admin_update_recipe_atomic(
      p_recipe_id uuid,
      p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text,
      p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer,
      p_base_servings integer, p_image_url text, p_calories_per_serving numeric,
      p_is_public boolean, p_method text, p_speed text, p_servings_unit text,
      p_meal_role text, p_is_complete_meal boolean, p_primary_protein text,
      p_budget_level text, p_reuse_group text, p_ingredients jsonb, p_steps jsonb
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $function_body$
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
$function_body$;
    ALTER FUNCTION public.admin_update_recipe_atomic(uuid,text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) OWNER TO postgres;
    REVOKE EXECUTE ON FUNCTION public.admin_update_recipe_atomic(uuid,text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.admin_update_recipe_atomic(uuid,text,text,text,text,text,text,integer,integer,integer,text,numeric,boolean,text,text,text,text,boolean,text,text,text,jsonb,jsonb) TO postgres, service_role;
  END IF;
END;
$create_fn_admin_update$;

-- B6. admin_delete_recipe_atomic(uuid) -- same posture as B4/B5. Depends on
--     Slice 1 tables AND Slice 2's menu_plan_items at first INVOCATION only
--     (not at CREATE FUNCTION time) -- guaranteed present by this
--     migration's own preflight prerequisite check (A2).
DO $create_fn_admin_delete$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='admin_delete_recipe_atomic'
  ) THEN
    CREATE FUNCTION public.admin_delete_recipe_atomic(p_recipe_id uuid)
    RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'pg_temp'
    AS $function_body$
BEGIN
  -- Delete related data first (avoid FK issues)

  DELETE FROM recipe_ingredients WHERE recipe_id = p_recipe_id;

  DELETE FROM recipe_steps WHERE recipe_id = p_recipe_id;

  DELETE FROM recipe_equipment WHERE recipe_id = p_recipe_id;

  DELETE FROM menu_plan_items WHERE recipe_id = p_recipe_id;

  -- Delete main recipe
  DELETE FROM recipes WHERE id = p_recipe_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_id', p_recipe_id
  );
END;
$function_body$;
    ALTER FUNCTION public.admin_delete_recipe_atomic(uuid) OWNER TO postgres;
    REVOKE EXECUTE ON FUNCTION public.admin_delete_recipe_atomic(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.admin_delete_recipe_atomic(uuid) TO postgres, service_role;
  END IF;
END;
$create_fn_admin_delete$;

-- ============================================================================
-- C. Read-only postcheck -- reassert the complete final contract for every
--    object in scope, unconditionally (this file's own creation path, if
--    it ran, must have produced exactly this state; if the compatible path
--    ran, this independently reasserts the same identity preflight already
--    confirmed). Fail closed on any mismatch, rolling back the whole
--    migration.
-- ============================================================================
DO $postcheck$
DECLARE
  present_count      int;
  overload_rec       record;
  mismatch_count     int;
BEGIN
  SELECT
    (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND c.relname='v_menu_plan_shopping_list')
  + (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND c.relname='vw_menu_plan_grocery_items')
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_create_recipe_atomic') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_update_recipe_atomic') THEN 1 ELSE 0 END)
  + (CASE WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='admin_delete_recipe_atomic') THEN 1 ELSE 0 END)
  INTO present_count;

  IF present_count <> 6 THEN
    RAISE EXCEPTION 'baseline_views_and_functions: postcheck: expected exactly 6 target objects to exist after this migration, found % -- rolling back', present_count;
  END IF;

    -- overload count exactly 1 per function name -- reject extra overloads.
    FOR overload_rec IN
      SELECT p.proname, count(*) AS n
        FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
       GROUP BY p.proname
    LOOP
      IF overload_rec.n <> 1 THEN
        RAISE EXCEPTION 'baseline_views_and_functions: postcheck: public.% has % overloads -- expected exactly 1, refusing to proceed', overload_rec.proname, overload_rec.n;
      END IF;
    END LOOP;

    -- owner must be postgres on all 6.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
         AND pg_catalog.pg_get_userbyid(c.relowner) IS DISTINCT FROM 'postgres'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: a target view owner is not postgres -- refusing to proceed';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
         AND pg_catalog.pg_get_userbyid(p.proowner) IS DISTINCT FROM 'postgres'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: a target function owner is not postgres -- refusing to proceed';
    END IF;

    -- view kind / not-materialized check (defensive, in addition to A0).
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
         AND c.relkind <> 'v'
    ) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: a target view is not an ordinary view (relkind<>v) -- refusing to proceed';
    END IF;

    SELECT count(*) INTO mismatch_count FROM (
      (
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','77fbadb6b924518e628382bba5aaee03c00e5d8bf542c0cb4be3b89e48102558'),
          ('view','vw_menu_plan_grocery_items','1bb9715f2a9d0d5b4615bdf2c52c0ac5e51ef90c56f7cea0676bd49f71daa261'),
          ('function','get_recipe_detail_json(text)','240402a1aa6a37995bea2d395fb11b80b2d6e3a6177b1dc06c572ebd46707b5a'),
          ('function','admin_create_recipe_atomic(22 args)','c3cc040daf6aa152bf9f186970fdc3b8a995f2dac1b240954c358f4b08ff35a3'),
          ('function','admin_update_recipe_atomic(23 args)','c19b58dfd0134ec86d8a45f47a534fc6b915ab8c943d84e7c33297b514f55718'),
          ('function','admin_delete_recipe_atomic(uuid)','ed630ed3e41fcd6d4bfff013d161e00b00558e6fa62406b01b1848619abe5572')
        ) AS expected(kind, ident, identity_hash)
        EXCEPT ALL
        (
          SELECT 'view'::text, c.relname::text,
                 encode(sha256((pg_catalog.pg_get_viewdef(c.oid, true) || '|' || array_to_string(c.reloptions,',') || '|' || pg_catalog.pg_get_userbyid(c.relowner))::bytea),'hex')
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text,
                 CASE p.proname
                   WHEN 'get_recipe_detail_json' THEN 'get_recipe_detail_json(text)'
                   WHEN 'admin_create_recipe_atomic' THEN 'admin_create_recipe_atomic(22 args)'
                   WHEN 'admin_update_recipe_atomic' THEN 'admin_update_recipe_atomic(23 args)'
                   WHEN 'admin_delete_recipe_atomic' THEN 'admin_delete_recipe_atomic(uuid)'
                 END,
                 encode(sha256(pg_catalog.pg_get_functiondef(p.oid)::bytea),'hex')
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
      )
      UNION ALL
      (
        (
          SELECT 'view'::text, c.relname::text,
                 encode(sha256((pg_catalog.pg_get_viewdef(c.oid, true) || '|' || array_to_string(c.reloptions,',') || '|' || pg_catalog.pg_get_userbyid(c.relowner))::bytea),'hex')
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text,
                 CASE p.proname
                   WHEN 'get_recipe_detail_json' THEN 'get_recipe_detail_json(text)'
                   WHEN 'admin_create_recipe_atomic' THEN 'admin_create_recipe_atomic(22 args)'
                   WHEN 'admin_update_recipe_atomic' THEN 'admin_update_recipe_atomic(23 args)'
                   WHEN 'admin_delete_recipe_atomic' THEN 'admin_delete_recipe_atomic(uuid)'
                 END,
                 encode(sha256(pg_catalog.pg_get_functiondef(p.oid)::bytea),'hex')
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
        EXCEPT ALL
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','77fbadb6b924518e628382bba5aaee03c00e5d8bf542c0cb4be3b89e48102558'),
          ('view','vw_menu_plan_grocery_items','1bb9715f2a9d0d5b4615bdf2c52c0ac5e51ef90c56f7cea0676bd49f71daa261'),
          ('function','get_recipe_detail_json(text)','240402a1aa6a37995bea2d395fb11b80b2d6e3a6177b1dc06c572ebd46707b5a'),
          ('function','admin_create_recipe_atomic(22 args)','c3cc040daf6aa152bf9f186970fdc3b8a995f2dac1b240954c358f4b08ff35a3'),
          ('function','admin_update_recipe_atomic(23 args)','c19b58dfd0134ec86d8a45f47a534fc6b915ab8c943d84e7c33297b514f55718'),
          ('function','admin_delete_recipe_atomic(uuid)','ed630ed3e41fcd6d4bfff013d161e00b00558e6fa62406b01b1848619abe5572')
        ) AS expected2(kind, ident, identity_hash)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: % object-identity mismatches found across the 6 target objects -- refusing to proceed', mismatch_count;
    END IF;

    -- Explicit standalone security-mode / search_path checks (in addition
    -- to the full-identity hash check above), so a drift in exactly these
    -- specifically-called-out properties raises its own distinct message.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json' AND p.prosecdef IS DISTINCT FROM true) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: get_recipe_detail_json must be SECURITY DEFINER -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic') AND p.prosecdef IS DISTINCT FROM false) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: an admin_*_recipe_atomic function is not SECURITY INVOKER -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_recipe_detail_json' AND (p.proconfig IS DISTINCT FROM ARRAY['search_path=public']::text[])) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: get_recipe_detail_json search_path/proconfig does not exactly match search_path=public -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic') AND (p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, pg_temp']::text[])) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: an admin_*_recipe_atomic function search_path/proconfig does not exactly match search_path=pg_catalog, public, pg_temp -- refusing to proceed';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items') AND NOT ('security_invoker=true' = ANY(COALESCE(c.reloptions, ARRAY[]::text[])))) THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: a target view is missing security_invoker=true -- refusing to proceed';
    END IF;

    SELECT count(*) INTO mismatch_count FROM (
      (
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','authenticated','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','service_role','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','INSERT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','UPDATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','DELETE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRUNCATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','REFERENCES','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRIGGER','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','MAINTAIN','postgres',false),
          ('view','vw_menu_plan_grocery_items','authenticated','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','service_role','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','INSERT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','UPDATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','DELETE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRUNCATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','REFERENCES','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRIGGER','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','MAINTAIN','postgres',false),
          ('function','get_recipe_detail_json','PUBLIC','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','anon','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','authenticated','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','service_role','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','service_role','EXECUTE','postgres',false)
        ) AS expected(kind, ident, grantee, privilege, grantor, is_grantable)
        EXCEPT ALL
        (
          SELECT 'view'::text, c.relname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('v', c.relowner))) g
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text, p.proname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) g
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
      )
      UNION ALL
      (
        (
          SELECT 'view'::text, c.relname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('v', c.relowner))) g
           WHERE n.nspname='public' AND c.relname IN ('v_menu_plan_shopping_list','vw_menu_plan_grocery_items')
          UNION ALL
          SELECT 'function'::text, p.proname::text,
                 (CASE WHEN g.grantee=0 THEN 'PUBLIC' ELSE g.grantee::regrole::text END),
                 g.privilege_type, COALESCE(g.grantor::regrole::text,'NULL'), g.is_grantable
            FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace,
                 LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) g
           WHERE n.nspname='public' AND p.proname IN ('get_recipe_detail_json','admin_create_recipe_atomic','admin_update_recipe_atomic','admin_delete_recipe_atomic')
        )
        EXCEPT ALL
        SELECT * FROM (VALUES
          ('view','v_menu_plan_shopping_list','authenticated','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','service_role','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','SELECT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','INSERT','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','UPDATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','DELETE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRUNCATE','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','REFERENCES','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','TRIGGER','postgres',false),
          ('view','v_menu_plan_shopping_list','postgres','MAINTAIN','postgres',false),
          ('view','vw_menu_plan_grocery_items','authenticated','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','service_role','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','SELECT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','INSERT','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','UPDATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','DELETE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRUNCATE','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','REFERENCES','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','TRIGGER','postgres',false),
          ('view','vw_menu_plan_grocery_items','postgres','MAINTAIN','postgres',false),
          ('function','get_recipe_detail_json','PUBLIC','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','anon','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','authenticated','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','service_role','EXECUTE','postgres',false),
          ('function','get_recipe_detail_json','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_create_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_update_recipe_atomic','service_role','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','postgres','EXECUTE','postgres',false),
          ('function','admin_delete_recipe_atomic','service_role','EXECUTE','postgres',false)
        ) AS expected2(kind, ident, grantee, privilege, grantor, is_grantable)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION 'baseline_views_and_functions: postcheck: % raw-ACL-row mismatches found across the 6 target objects (expected exactly the 30-row live contract) -- refusing to proceed', mismatch_count;
    END IF;
END;
$postcheck$;
