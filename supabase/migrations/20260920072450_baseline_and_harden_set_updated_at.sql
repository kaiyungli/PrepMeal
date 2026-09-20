-- Migration: baseline_and_harden_set_updated_at
--
-- Prerequisite for the future public.profiles security-hardening baseline.
-- public.set_updated_at() is a live, actively-used BEFORE UPDATE trigger
-- function that has never been captured in any tracked migration --
-- confirmed by a repository-wide search finding zero references anywhere
-- in supabase/migrations or elsewhere in this repo.
--
-- Scope of this migration: public.set_updated_at() itself only -- its own
-- definition, owner, security mode, search_path, and ACL. It does NOT
-- create, alter, or assert the existence of any table or trigger,
-- including public.recipes, public.profiles, and public.user_preferences
-- (three tables a prior audit found live triggers on, none tracked in any
-- migration). Asserting those live-only trigger bindings inside this
-- migration would make fresh-database replay depend on objects this
-- migration chain does not (yet) create, defeating the point of a
-- prerequisite baseline. That verification belongs at deployment time
-- against the linked project instead:
--
--   DEPLOYMENT VERIFICATION REQUIREMENT (not executable migration SQL --
--   run as a separate read-only catalog check before and after applying
--   this migration to the linked project):
--     SELECT n.nspname, c.relname, t.tgname
--       FROM pg_catalog.pg_trigger t
--       JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
--       JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
--      WHERE NOT t.tgisinternal
--        AND t.tgfoid = 'public.set_updated_at()'::regprocedure;
--   Confirm the same three rows (public.recipes.trg_recipes_updated_at,
--   public.profiles.trg_profiles_updated_at,
--   public.user_preferences.trg_user_preferences_updated_at) are present
--   and still reference this function both before and after applying this
--   migration to the linked project.
--
-- Order of operations (each step gated on the previous):
--   A. Read-only preflight: if an object named public.set_updated_at
--      already exists, verify EVERY behavior-affecting property is
--      exactly one of two accepted states -- the exact audited live
--      definition (unhardened: proconfig NULL, unqualified now()), or the
--      already-hardened canonical definition (idempotent re-run) -- BEFORE
--      any write. Fail closed (RAISE EXCEPTION, rolling back the whole
--      migration) on any other value, rather than silently normalizing it
--      via CREATE OR REPLACE. This block never performs a write itself --
--      it only inspects and may abort.
--   B. Only once preflight has either found nothing or confirmed
--      compatibility: CREATE OR REPLACE the canonical function with every
--      security/behavior property declared explicitly (no reliance on
--      CREATE FUNCTION defaults), then ALTER its owner and REVOKE the
--      unnecessary EXECUTE grants -- as separate static statements, no
--      dynamic SQL.
--   C. Read-only postcondition: assert the complete final state of the
--      function itself, including a generic non-owner ACL scan (not a
--      fixed list of role names). Fail closed on any mismatch.
--
-- Every catalog/helper function called by this file's own DO blocks is
-- schema-qualified with pg_catalog. explicitly. These DO blocks run under
-- whatever search_path the migration-applying session already has (the
-- DO statement has no SET-search_path clause of its own, unlike CREATE
-- FUNCTION) -- so unlike the trigger function itself, they cannot be
-- protected by pinning their own search_path, and are protected only by
-- qualifying every call site instead.
--
-- Hardening rationale (unchanged from the prerequisite audit):
--   * search_path is pinned to pg_catalog ONLY (no public, no pg_temp --
--     the function needs neither: its sole unqualified-resolution
--     dependency was the builtin now(), and the canonical body below
--     schema-qualifies that call explicitly as pg_catalog.now(), so even
--     the pg_catalog entry in search_path is now redundant for
--     correctness and kept only as defense-in-depth / documentation of
--     intent, not because the body still relies on it to resolve now()).
--   * now() is preserved exactly as the live function already uses it --
--     current transaction timestamp semantics -- not changed to
--     statement_timestamp() or clock_timestamp().
--   * EXECUTE is revoked from PUBLIC, anon, authenticated, and
--     service_role: trigger firing never checks EXECUTE privilege on the
--     trigger function (only UPDATE privilege on the table, gated
--     separately by table grants/RLS, out of this migration's scope),
--     and direct RPC invocation of a RETURNS trigger function is
--     unconditionally rejected by PL/pgSQL's call handler regardless of
--     any grant. No role has a legitimate use for direct EXECUTE here.
--     The postcondition below asserts this generically (no non-owner
--     grantee at all), not just for these four named roles.
--   * SECURITY INVOKER is preserved: no elevated privilege is concretely
--     necessary for a function that only ever writes one column of the
--     very row already being updated.
--
-- Transactionality: this file adds no explicit BEGIN/COMMIT. Every other
-- fail-closed migration already in this repository (e.g.
-- 20260909061735_harden_admin_rpcs_and_plan_views.sql and
-- 20260910060642_reconcile_admin_recipe_rpc_contract.sql) relies on
-- RAISE EXCEPTION inside a DO block to "roll back" the whole file without
-- ever adding explicit transaction-control statements themselves -- grep
-- across supabase/migrations/*.sql confirms zero top-level BEGIN;/COMMIT;
-- statements anywhere in this tracked history. This matches documented
-- PostgreSQL simple-query-protocol behavior: a query string containing
-- multiple statements is executed as a single implicit transaction unless
-- the string itself includes explicit transaction-control commands. This
-- migration follows that same established, already-relied-upon
-- convention rather than introducing a new one. This is a static
-- conclusion from documented protocol behavior and this repo's own
-- precedent, not an empirical test against this exact CLI version --
-- empirical proof (that a preflight/postcheck exception leaves no partial
-- mutation) is deferred to the isolated local Docker verification pass.
--
-- Does NOT touch public.profiles or any other table, does NOT create or
-- alter any trigger, and does NOT run ALTER DEFAULT PRIVILEGES
-- project-wide.

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  fn_count               int;
  pre                    record;
  canonical_body_norm    text := 'BEGIN NEW.updated_at = now(); RETURN NEW; END;';
  pre_body_norm          text;
BEGIN
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count = 0 THEN
    -- Absent: nothing to validate, step B will create it fresh.
    RETURN;
  END IF;

  IF fn_count > 1 THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: % objects named public.set_updated_at exist -- expected 0 or 1, refusing to proceed',
      fn_count;
  END IF;

  SELECT p.prokind                                                       AS prokind,
         p.pronargs                                                       AS pronargs,
         pg_catalog.pg_get_function_identity_arguments(p.oid)              AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL)                        AS rettype,
         p.proretset                                                        AS proretset,
         l.lanname                                                          AS lang,
         p.prosecdef                                                        AS secdef,
         p.provolatile                                                      AS volatility,
         p.proisstrict                                                      AS is_strict,
         p.proparallel                                                      AS parallel,
         p.proleakproof                                                     AS leakproof,
         pg_catalog.pg_get_userbyid(p.proowner)                             AS owner,
         p.proconfig                                                        AS proconfig,
         -- Narrow, targeted equivalence: only the specific known call
         -- pg_catalog.now() is treated as identical to unqualified now()
         -- (the one and only call this body ever makes). This does NOT
         -- strip "pg_catalog." from arbitrary source text -- an unrelated
         -- qualified reference anywhere else in the body would NOT be
         -- normalized away and would correctly fail the comparison below.
         pg_catalog.btrim(
           pg_catalog.regexp_replace(
             pg_catalog.regexp_replace(
               pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g'),
               'pg_catalog\.now\(\)', 'now()', 'gi'
             ),
             '^\s+|\s+$', '', 'g'
           )
         )                                                                  AS body_norm
    INTO pre
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  pre_body_norm := pre.body_norm;

  IF pre.prokind IS DISTINCT FROM 'f' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at has prokind % -- expected an ordinary function (f), refusing to alter an incompatible object',
      pre.prokind;
  END IF;

  IF pre.pronargs IS DISTINCT FROM 0 OR pre.identity_args IS DISTINCT FROM '' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at has identity arguments (%) -- expected zero-argument signature, refusing to alter an incompatible object',
      pre.identity_args;
  END IF;

  IF pre.rettype IS DISTINCT FROM 'trigger' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at return type is % -- expected trigger, refusing to alter an incompatible object',
      pre.rettype;
  END IF;

  IF pre.proretset IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at proretset is % -- expected false, refusing to alter an incompatible object',
      pre.proretset;
  END IF;

  IF pre.lang IS DISTINCT FROM 'plpgsql' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at language is % -- expected plpgsql, refusing to alter an incompatible object',
      pre.lang;
  END IF;

  IF pre.secdef IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at is SECURITY DEFINER -- expected SECURITY INVOKER, refusing to alter an incompatible object';
  END IF;

  IF pre.volatility IS DISTINCT FROM 'v' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at volatility is % -- expected v (VOLATILE), refusing to alter an incompatible object',
      pre.volatility;
  END IF;

  IF pre.is_strict IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at proisstrict is % -- expected false (CALLED ON NULL INPUT), refusing to alter an incompatible object',
      pre.is_strict;
  END IF;

  IF pre.parallel IS DISTINCT FROM 'u' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at proparallel is % -- expected u (PARALLEL UNSAFE), refusing to alter an incompatible object',
      pre.parallel;
  END IF;

  IF pre.leakproof IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at proleakproof is % -- expected false, refusing to alter an incompatible object',
      pre.leakproof;
  END IF;

  IF pre.owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at owner is % -- only postgres is an accepted compatible owner, refusing to alter an incompatible object',
      pre.owner;
  END IF;

  -- proconfig must be exactly one of the two accepted states: NULL (the
  -- audited live/unhardened state) or exactly {search_path=pg_catalog}
  -- (an idempotent re-run of this same migration's hardened state).
  IF NOT (
    pre.proconfig IS NULL
    OR (
      pg_catalog.array_length(pre.proconfig, 1) = 1
      AND 'search_path=pg_catalog' = ANY (pre.proconfig)
    )
  ) THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at proconfig is % -- expected NULL or exactly {search_path=pg_catalog}, refusing to alter an incompatible object',
      pre.proconfig;
  END IF;

  IF pre_body_norm IS DISTINCT FROM canonical_body_norm THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: preflight: public.set_updated_at body does not match the canonical NEW.updated_at = now(); RETURN NEW; definition -- refusing to alter an incompatible object (normalized body: %)',
      pre_body_norm;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Compatibility confirmed (or object absent) -- apply the canonical
--    definition and hardening as static SQL, no dynamic SQL. Every
--    security/behavior property is declared explicitly; none relies on
--    CREATE FUNCTION's defaults.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
CALLED ON NULL INPUT
PARALLEL UNSAFE
SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$fn$;

-- CREATE FUNCTION has no OWNER clause; ownership defaults to the
-- executing role, so this stays a separate, deterministic statement.
ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION, and
-- this project's public-schema default ACL separately re-grants it to
-- anon/authenticated/service_role -- both are revoked here so this is the
-- complete, auditable access list regardless of whether step A found the
-- function absent or already present.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;

-- ============================================================================
-- C. Read-only postcondition -- assert the complete final state of the
--    function itself only. Fail closed on any mismatch.
-- ============================================================================
DO $postcheck$
DECLARE
  fn_count             int;
  post                 record;
  canonical_body_norm  text := 'BEGIN NEW.updated_at = now(); RETURN NEW; END;';
  post_body_norm       text;
  acl_row              record;
BEGIN
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: % objects named public.set_updated_at exist -- expected exactly 1, rolling back',
      fn_count;
  END IF;

  SELECT p.oid                                                            AS fn_oid,
         p.prokind                                                         AS prokind,
         pg_catalog.pg_get_function_identity_arguments(p.oid)               AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL)                         AS rettype,
         p.proretset                                                        AS proretset,
         l.lanname                                                          AS lang,
         p.prosecdef                                                        AS secdef,
         p.provolatile                                                      AS volatility,
         p.proisstrict                                                      AS is_strict,
         p.proparallel                                                      AS parallel,
         p.proleakproof                                                     AS leakproof,
         pg_catalog.pg_get_userbyid(p.proowner)                             AS owner,
         p.proowner                                                         AS owner_oid,
         p.proconfig                                                        AS proconfig,
         p.proacl                                                           AS proacl,
         pg_catalog.btrim(
           pg_catalog.regexp_replace(
             pg_catalog.regexp_replace(
               pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g'),
               'pg_catalog\.now\(\)', 'now()', 'gi'
             ),
             '^\s+|\s+$', '', 'g'
           )
         )                                                                  AS body_norm
    INTO post
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  post_body_norm := post.body_norm;

  IF post.prokind IS DISTINCT FROM 'f' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: prokind is % -- expected an ordinary function (f), rolling back',
      post.prokind;
  END IF;

  IF post.identity_args IS DISTINCT FROM '' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: identity arguments are % -- expected zero-argument signature, rolling back',
      post.identity_args;
  END IF;

  IF post.rettype IS DISTINCT FROM 'trigger' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: return type is % -- expected trigger, rolling back',
      post.rettype;
  END IF;

  IF post.proretset IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: proretset is % -- expected false, rolling back',
      post.proretset;
  END IF;

  IF post.lang IS DISTINCT FROM 'plpgsql' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: language is % -- expected plpgsql, rolling back',
      post.lang;
  END IF;

  IF post.secdef IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: function is SECURITY DEFINER -- expected SECURITY INVOKER, rolling back';
  END IF;

  IF post.volatility IS DISTINCT FROM 'v' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: volatility is % -- expected v (VOLATILE), rolling back',
      post.volatility;
  END IF;

  IF post.is_strict IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: proisstrict is % -- expected false (CALLED ON NULL INPUT), rolling back',
      post.is_strict;
  END IF;

  IF post.parallel IS DISTINCT FROM 'u' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: proparallel is % -- expected u (PARALLEL UNSAFE), rolling back',
      post.parallel;
  END IF;

  IF post.leakproof IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: proleakproof is % -- expected false, rolling back',
      post.leakproof;
  END IF;

  IF post.owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: owner is % -- expected postgres, rolling back',
      post.owner;
  END IF;

  IF post_body_norm IS DISTINCT FROM canonical_body_norm THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: body is % -- expected the canonical NEW.updated_at = now(); RETURN NEW; definition, rolling back',
      post_body_norm;
  END IF;

  -- After this migration's own CREATE OR REPLACE + SET search_path, the
  -- final state must be exactly the hardened value -- not the two-state
  -- acceptance the preflight allows for a pre-existing object.
  IF post.proconfig IS NULL
     OR pg_catalog.array_length(post.proconfig, 1) <> 1
     OR NOT ('search_path=pg_catalog' = ANY (post.proconfig)) THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: proconfig is % -- expected exactly {search_path=pg_catalog}, rolling back',
      post.proconfig;
  END IF;

  -- Generic non-owner ACL scan: reject EXECUTE or a grant option for ANY
  -- grantee other than the owner -- not just a fixed list of role names.
  -- grantee = 0 denotes PUBLIC and is included automatically since it is
  -- never equal to owner_oid.
  FOR acl_row IN
    SELECT a.grantee, a.privilege_type, a.is_grantable
      FROM pg_catalog.aclexplode(
             COALESCE(post.proacl, pg_catalog.acldefault('f', post.owner_oid))
           ) a
     WHERE a.grantee IS DISTINCT FROM post.owner_oid
  LOOP
    IF acl_row.privilege_type = 'EXECUTE' THEN
      RAISE EXCEPTION
        'baseline_and_harden_set_updated_at: postcheck: non-owner grantee (role oid %) still has EXECUTE on public.set_updated_at -- rolling back',
        acl_row.grantee;
    END IF;

    IF acl_row.is_grantable THEN
      RAISE EXCEPTION
        'baseline_and_harden_set_updated_at: postcheck: non-owner grantee (role oid %) holds a grant option on public.set_updated_at -- rolling back',
        acl_row.grantee;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_function_privilege('postgres', post.fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION
      'baseline_and_harden_set_updated_at: postcheck: postgres (owner) unexpectedly lacks effective EXECUTE on public.set_updated_at -- rolling back';
  END IF;
END;
$postcheck$;
