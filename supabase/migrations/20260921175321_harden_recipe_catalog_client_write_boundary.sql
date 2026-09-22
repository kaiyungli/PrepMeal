-- Migration: harden_recipe_catalog_client_write_boundary
--
-- SECURITY HOTFIX for the 8 tables baselined by
-- 20260904060000_baseline_core_recipe_catalog_schema.sql:
--   public.ingredients, public.units, public.equipment, public.recipes,
--   public.recipe_ingredients, public.recipe_steps, public.recipe_equipment,
--   public.ingredient_substitutions
--
-- WHY THIS MIGRATION EXISTS -- confirmed live via independent read-only
-- catalog inspection of the linked project (see
-- /home/venn/prepmeal-recipes-insert-authorization-confirmation.md,
-- "LIVE CONFIRMATION PASS", outside this repo), NOT merely a static-text
-- claim: public.recipes carries two simultaneous PERMISSIVE INSERT
-- policies -- "insert own recipes" (WITH CHECK (author_id = auth.uid()))
-- and "Allow insert for authenticated users" (TO authenticated,
-- WITH CHECK (true)). Per documented PostgreSQL semantics
-- (https://www.postgresql.org/docs/current/ddl-rowsecurity.html --
-- "When multiple policies apply to a given query, they are combined using
-- either OR (for permissive policies, which are the default)"), the second
-- policy's unconditional WITH CHECK(true) makes the first policy's
-- ownership predicate non-binding for any authenticated caller: any
-- authenticated user can INSERT an arbitrary public.recipes row with any
-- author_id and is_public=true. Neither a CHECK constraint, an FK, nor the
-- one live trigger (trg_recipes_updated_at, which only ever writes
-- updated_at) constrains author_id or is_public. A companion,
-- independently-run code-search audit found zero Web/Mobile application
-- code path that references author_id or writes to recipes/
-- recipe_ingredients/recipe_steps/recipe_equipment directly -- every
-- legitimate recipe create/update/delete already goes through
-- admin_create_recipe_atomic / admin_update_recipe_atomic /
-- admin_delete_recipe_atomic, which are already correctly restricted to
-- service_role only (20260909061735_harden_admin_rpcs_and_plan_views.sql,
-- 20260910060642_reconcile_admin_recipe_rpc_contract.sql -- neither
-- touched by this migration). This migration therefore adopts
-- Target A (admin-only writes): it removes ordinary-user write access to
-- all 8 tables entirely, since no shipped feature depends on it, rather
-- than trying to correctly re-scope the ownership predicate for a feature
-- that does not exist.
--
-- SCOPE: exactly these 8 tables' RLS write-policies and anon/authenticated
-- table privileges. It does NOT touch columns, defaults, data, constraints,
-- indexes, comments, any SELECT policy, service_role/postgres/PUBLIC
-- grants, RLS enablement state, any function/RPC/view, or any table outside
-- this list. It does NOT touch
-- src/pages/api/recipes/[id]/track-view.js's unauthenticated
-- increment_recipe_times_shown RPC call -- that is a separate, already-
-- flagged risk (unauthenticated write via a service-role client, no
-- caller-identity check) tracked as a distinct follow-up, out of scope for
-- this table-privilege hotfix.
--
-- TARGET CLIENT BOUNDARY (post-migration, both anon and authenticated):
--   - SELECT only, exactly the pre-existing read policies/grants
--     (unchanged) -- no INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/
--     MAINTAIN, at either the RLS-policy layer or the raw table-ACL layer.
--   - service_role and postgres: unchanged, full access (service_role
--     bypasses RLS entirely for the admin RPC path above; postgres is
--     table owner).
--   - No PUBLIC grant, no grant option, no column ACL, RLS enablement
--     state unchanged (enabled, not forced) -- none of this migration's
--     concern is ever created/altered/asserted differently than it already
--     is; only the 7 removed policies and the 7 revoked privileges change.
--
-- FRESH-REPLAY CONTRACT DECISION -- binding, not merely descriptive:
-- ---------------------------------------------------------------------------
-- This migration accepts exactly two global states across the complete
-- 8-table subset, and no others:
--   (1) VULNERABLE_PRE_STATE -- the exact live-audited pre-state -- is the
--       PRODUCTION REMEDIATION path: applying this migration to a database
--       that still carries the 7 vulnerable write policies and the
--       ambient full-privilege ACL performs the hardening.
--   (2) HARDENED_FINAL_STATE -- exactly the 8 surviving SELECT policies
--       AND the narrowed 144-row ACL (anon/authenticated reduced to
--       SELECT-only; postgres/service_role unchanged) -- is the
--       CORRECTED-SLICE-1 FRESH-REPLAY / NO-OP path. A future correction to
--       20260904060000_baseline_core_recipe_catalog_schema.sql (NOT edited
--       by this migration) MUST create this exact final contract directly
--       -- both the policy state AND the ACL state -- for a fresh replay to
--       reach this migration in a state it recognizes. Omitting the 7
--       vulnerable CREATE POLICY statements from Slice 1 while leaving
--       Slice 1's ACL to fall out of the Supabase project's ambient
--       default-privilege template (as Slice 1 does today) produces a
--       policy-hardened-but-ACL-vulnerable HYBRID that this migration
--       deliberately does NOT accept -- it is neither state (1) nor state
--       (2), and this migration fails closed against it rather than
--       normalizing it, exactly as it fails closed against every other
--       partial/mixed state. This is an intentional design choice, not an
--       oversight: accepting a policy-only or ACL-only hardened baseline
--       would mean this migration no longer proves the complete final
--       contract it exists to guarantee. When Slice 1 is corrected, its
--       correction must emit the identical HARDENED_FINAL_STATE this
--       migration already defines (including narrowing anon/authenticated
--       to SELECT-only itself), not merely drop the 4+3 vulnerable policy
--       statements.
--
-- Order of operations (each step gated on the previous, matching this
-- repository's established fail-closed convention):
--   A. Read-only preflight: accept only the exact VULNERABLE_PRE_STATE
--      (independently captured live, immediately before authoring this
--      file) or the exact HARDENED_FINAL_STATE this migration produces --
--      for the complete 8-table policy/ACL/column-ACL/RLS/owner subset.
--      Owner is independently verified first (all 8 tables share one
--      owner, and that owner is exactly postgres) and the resulting
--      verified value -- not a hardcoded literal -- is used as the
--      expected grantor in every raw-ACL comparison row. The raw-ACL
--      comparison itself is a single multiplicity-sensitive symmetric
--      EXCEPT ALL over the complete row identity (table, grantee,
--      privilege_type, grantor, is_grantable) -- matching the pattern this
--      repository's own 20260921054256_revoke_profiles_unneeded_privileges.sql
--      already established (verified-owner-as-grantor included), extended
--      across all 8 tables -- so a wrong grantor, a grant option, an
--      unrecognized grantee, or a PUBLIC grant is caught by the same
--      comparison as a missing/extra privilege, not by a separate check
--      that could itself drift out of sync. Any partial/mixed state,
--      unknown policy, changed RLS state, changed owner, column ACL, or
--      extra/missing table fails closed. This block performs no write.
--   B. Static mutation: DROP exactly the 7 confirmed-vulnerable write
--      policies (guarded -- DROP POLICY has no native IF NOT EXISTS, so
--      each is a read-only pg_catalog existence check followed by exactly
--      one fully static EXECUTE string, matching this repository's
--      established existence-check-then-EXECUTE-static-literal pattern)
--      and REVOKE exactly the 7 non-SELECT table privileges from
--      anon/authenticated on all 8 tables in one static, idempotent
--      statement. No SELECT policy is touched. No SELECT privilege is
--      revoked. No GRANT is issued. No dynamic SQL string is built from a
--      catalog or variable value anywhere in this file.
--   C. Read-only postcheck: reassert the exact HARDENED_FINAL_STATE for
--      the complete 8-table subset, including the complete raw ACL
--      (grantor/grantable, via the same multiplicity-sensitive 5-field
--      EXCEPT ALL) and effective per-role privilege polarity. Fail closed
--      on any mismatch.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching every other
-- migration in this repository -- a RAISE EXCEPTION inside a DO block
-- rolls back the whole implicit single-statement-protocol transaction.

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  target_tables        text[] := ARRAY['ingredients','units','equipment','recipes',
                                        'recipe_ingredients','recipe_steps',
                                        'recipe_equipment','ingredient_substitutions'];
  present_count         int;
  distinct_owner_count  int;
  verified_owner        text;
  policy_mismatch_vuln  int;
  policy_mismatch_hard  int;
  acl_mismatch_vuln     int;
  acl_mismatch_hard     int;
BEGIN
  -- A0. Exactly 8 ordinary tables occupy these names.
  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count <> 8 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: % of 8 target tables exist as ordinary/partitioned tables -- expected exactly 8, refusing to proceed',
      present_count;
  END IF;

  -- Owner verification, independently derived (not a guessed literal):
  -- first prove all 8 owners are the SAME role, then prove that shared
  -- role is exactly 'postgres', then capture it once as `verified_owner`.
  -- Every ACL comparison below uses this variable as the expected grantor
  -- -- the literal 'postgres' appears only in this verification step and
  -- in diagnostic text, never repeated as a guessed expected-row value.
  SELECT pg_catalog.count(DISTINCT pg_catalog.pg_get_userbyid(c.relowner))
    INTO distinct_owner_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY (target_tables);

  IF distinct_owner_count <> 1 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: the 8 target tables have % distinct owner(s) -- expected exactly 1 shared owner, refusing to proceed',
      distinct_owner_count;
  END IF;

  SELECT DISTINCT pg_catalog.pg_get_userbyid(c.relowner) INTO verified_owner
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY (target_tables);

  IF verified_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: the 8 target tables'' verified shared owner is % -- expected postgres, refusing to proceed',
      verified_owner;
  END IF;

  -- RLS state is identical in both accepted states (this migration never
  -- changes it) -- checked unconditionally.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY (target_tables)
       AND (c.relrowsecurity, c.relforcerowsecurity) IS DISTINCT FROM (true, false)
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: an RLS state among the 8 target tables is not exactly enabled/not-forced -- refusing to proceed';
  END IF;

  -- Zero column ACL in both accepted states -- checked unconditionally.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables) AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: a column ACL exists among the 8 target tables -- refusing to proceed (none are audited in either accepted state)';
  END IF;

  -- --------------------------------------------------------------------
  -- VULNERABLE_PRE_STATE candidate: exactly the 15 live-audited policies
  -- and the plain 256-row default ACL shape (8 tables x 4 roles x 8
  -- privileges, every row grantor=postgres, not grantable), independently
  -- re-captured live immediately before authoring this migration (see
  -- this migration's header).
  -- --------------------------------------------------------------------
  -- PostgreSQL set operations are left-associative with no implicit
  -- precedence between EXCEPT ALL and UNION ALL, so each symmetric-diff
  -- direction below is wrapped in its own parentheses; omitting either
  -- pair would silently regroup this into ((A EXCEPT ALL B) UNION ALL C)
  -- EXCEPT ALL D instead of (A EXCEPT ALL B) UNION ALL (C EXCEPT ALL D).
  SELECT count(*) INTO policy_mismatch_vuln FROM (
    (
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_equipment','write recipe_equipment for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','write recipe_ingredients for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','write steps for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipes','Allow insert for authenticated users','INSERT','PERMISSIVE','{authenticated}','NULL','true'),
      ('recipes','delete own recipes','DELETE','PERMISSIVE','{public}','(author_id = auth.uid())','NULL'),
      ('recipes','insert own recipes','INSERT','PERMISSIVE','{public}','NULL','(author_id = auth.uid())'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('recipes','update own recipes','UPDATE','PERMISSIVE','{public}','(author_id = auth.uid())','(author_id = auth.uid())'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected(tbl, polname, cmd, permissive, roles, qual, withcheck)
    EXCEPT ALL
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_equipment','write recipe_equipment for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','write recipe_ingredients for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','write steps for own recipes','ALL','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))'),
      ('recipes','Allow insert for authenticated users','INSERT','PERMISSIVE','{authenticated}','NULL','true'),
      ('recipes','delete own recipes','DELETE','PERMISSIVE','{public}','(author_id = auth.uid())','NULL'),
      ('recipes','insert own recipes','INSERT','PERMISSIVE','{public}','NULL','(author_id = auth.uid())'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('recipes','update own recipes','UPDATE','PERMISSIVE','{public}','(author_id = auth.uid())','(author_id = auth.uid())'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected2(tbl, polname, cmd, permissive, roles, qual, withcheck)
    )
  ) AS symmetric_diff;

  -- Complete raw-ACL row identity: table, grantee, privilege_type,
  -- grantor, is_grantable -- one multiplicity-sensitive symmetric EXCEPT
  -- ALL, not a reduced key plus a separate scan.
  SELECT count(*) INTO acl_mismatch_vuln FROM (
    WITH expected(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      SELECT t, r, p, verified_owner, false
        FROM unnest(target_tables) AS t,
             unnest(ARRAY['anon','authenticated','postgres','service_role']) AS r,
             unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
    ),
    actual(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      SELECT c.relname,
             (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
             a.privilege_type,
             (CASE WHEN a.grantor = 0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
             a.is_grantable
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname = 'public' AND c.relname = ANY (target_tables)
    )
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) AS diff;

  -- --------------------------------------------------------------------
  -- HARDENED_FINAL_STATE candidate: exactly the 8 surviving SELECT
  -- policies, and anon/authenticated reduced to SELECT-only while
  -- postgres/service_role retain the full 8-privilege set, every row
  -- still grantor=postgres/not grantable.
  -- --------------------------------------------------------------------
  -- Each symmetric-diff direction is independently parenthesized -- see
  -- the associativity note above policy_mismatch_vuln.
  SELECT count(*) INTO policy_mismatch_hard FROM (
    (
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected(tbl, polname, cmd, permissive, roles, qual, withcheck)
    EXCEPT ALL
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected2(tbl, polname, cmd, permissive, roles, qual, withcheck)
    )
  ) AS symmetric_diff;

  SELECT count(*) INTO acl_mismatch_hard FROM (
    WITH expected(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      (SELECT t, r, p, verified_owner, false
         FROM unnest(target_tables) AS t,
              unnest(ARRAY['postgres','service_role']) AS r,
              unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p)
      UNION ALL
      (SELECT t, r, 'SELECT', verified_owner, false
         FROM unnest(target_tables) AS t,
              unnest(ARRAY['anon','authenticated']) AS r)
    ),
    actual(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      SELECT c.relname,
             (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
             a.privilege_type,
             (CASE WHEN a.grantor = 0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
             a.is_grantable
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname = 'public' AND c.relname = ANY (target_tables)
    )
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) AS diff;

  IF NOT (
    (policy_mismatch_vuln = 0 AND acl_mismatch_vuln = 0)
    OR (policy_mismatch_hard = 0 AND acl_mismatch_hard = 0)
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: preflight: the 8 target tables'' policy/ACL state matches neither the exact audited vulnerable pre-state (policy mismatches=%, ACL mismatches=%) nor the exact hardened final state (policy mismatches=%, ACL mismatches=%) -- refusing to proceed on a partial/mixed/unknown state',
      policy_mismatch_vuln, acl_mismatch_vuln, policy_mismatch_hard, acl_mismatch_hard;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Static mutation -- safe to run from either accepted preflight state:
--    the vulnerable state converges to hardened; the already-hardened state
--    is a no-op (DROP POLICY is guarded by existence; REVOKE of a privilege
--    a role does not hold is a documented no-op, not an error).
-- ============================================================================

-- B1. Drop exactly the 7 confirmed-vulnerable write policies. Each guard is
-- a read-only pg_catalog existence check followed by exactly one fully
-- static EXECUTE string -- no user or catalog value is ever interpolated.
DO $drop_write_policies$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='insert own recipes') THEN
    EXECUTE $sql$ DROP POLICY "insert own recipes" ON public.recipes $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='Allow insert for authenticated users') THEN
    EXECUTE $sql$ DROP POLICY "Allow insert for authenticated users" ON public.recipes $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='update own recipes') THEN
    EXECUTE $sql$ DROP POLICY "update own recipes" ON public.recipes $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='delete own recipes') THEN
    EXECUTE $sql$ DROP POLICY "delete own recipes" ON public.recipes $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_ingredients' AND policyname='write recipe_ingredients for own recipes') THEN
    EXECUTE $sql$ DROP POLICY "write recipe_ingredients for own recipes" ON public.recipe_ingredients $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_steps' AND policyname='write steps for own recipes') THEN
    EXECUTE $sql$ DROP POLICY "write steps for own recipes" ON public.recipe_steps $sql$;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_equipment' AND policyname='write recipe_equipment for own recipes') THEN
    EXECUTE $sql$ DROP POLICY "write recipe_equipment for own recipes" ON public.recipe_equipment $sql$;
  END IF;
END;
$drop_write_policies$;

-- B2. Revoke exactly the 7 non-SELECT table privileges from anon and
-- authenticated on all 8 tables, in one static statement. REVOKE of a
-- privilege a role does not currently hold is a documented Postgres no-op,
-- so this is safe whether the tables are currently in the vulnerable or the
-- already-hardened ACL shape. SELECT is never named here and is therefore
-- never touched; service_role, postgres, and PUBLIC are never named here
-- either.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE
    public.ingredients,
    public.units,
    public.equipment,
    public.recipes,
    public.recipe_ingredients,
    public.recipe_steps,
    public.recipe_equipment,
    public.ingredient_substitutions
  FROM anon, authenticated;

-- ============================================================================
-- C. Read-only postcheck -- reassert the exact hardened final state for the
--    complete 8-table subset. Fail closed on any mismatch.
-- ============================================================================
DO $postcheck$
DECLARE
  target_tables         text[] := ARRAY['ingredients','units','equipment','recipes',
                                         'recipe_ingredients','recipe_steps',
                                         'recipe_equipment','ingredient_substitutions'];
  present_count         int;
  distinct_owner_count  int;
  verified_owner        text;
  mismatch_count        int;
  tname                 text;
  rname                 text;
BEGIN
  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count <> 8 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: % of 8 target tables exist -- expected exactly 8, rolling back',
      present_count;
  END IF;

  -- Owner verification, independently re-derived (not reused from
  -- preflight -- separate DO blocks do not share variables, and this
  -- migration's own final contract depends on the post-mutation owner,
  -- not merely the pre-mutation one): all 8 owners must still be the same
  -- single role, and that role must still be exactly 'postgres'. Every ACL
  -- comparison below uses `verified_owner`, never a hardcoded literal.
  SELECT pg_catalog.count(DISTINCT pg_catalog.pg_get_userbyid(c.relowner))
    INTO distinct_owner_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY (target_tables);

  IF distinct_owner_count <> 1 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: the 8 target tables have % distinct owner(s) -- expected exactly 1 shared owner, rolling back',
      distinct_owner_count;
  END IF;

  SELECT DISTINCT pg_catalog.pg_get_userbyid(c.relowner) INTO verified_owner
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = ANY (target_tables);

  IF verified_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: the 8 target tables'' verified shared owner is % -- expected postgres, rolling back',
      verified_owner;
  END IF;

  -- RLS state unchanged.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = ANY (target_tables)
       AND (c.relrowsecurity, c.relforcerowsecurity) IS DISTINCT FROM (true, false)
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: an RLS state among the 8 target tables changed from enabled/not-forced -- rolling back';
  END IF;

  -- Zero column ACL.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND a.attnum > 0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables) AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: a column ACL exists among the 8 target tables -- rolling back';
  END IF;

  -- Exactly the 8 surviving SELECT policies remain -- full symmetric diff.
  -- Each direction is independently parenthesized -- see the associativity
  -- note above policy_mismatch_vuln in the preflight block.
  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected(tbl, polname, cmd, permissive, roles, qual, withcheck)
    EXCEPT ALL
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT tablename, policyname, cmd, permissive, roles::text, COALESCE(qual,'NULL'), COALESCE(with_check,'NULL')
      FROM pg_catalog.pg_policies
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('equipment','read equipment','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredient_substitutions','read ingredient substitutions','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('ingredients','read ingredients','SELECT','PERMISSIVE','{public}','true','NULL'),
      ('recipe_equipment','read equipment for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_ingredients','read ingredients for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipe_steps','read steps for visible recipes','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM recipes r' || chr(10) || '  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))','NULL'),
      ('recipes','read public recipes','SELECT','PERMISSIVE','{public}','(is_public = true)','NULL'),
      ('units','read units','SELECT','PERMISSIVE','{public}','true','NULL')
    ) AS expected2(tbl, polname, cmd, permissive, roles, qual, withcheck)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: % policy-row mismatches found against the exact hardened 8-policy set -- rolling back',
      mismatch_count;
  END IF;

  -- Generic: zero non-SELECT policies remain among the 8 tables.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = ANY (target_tables) AND cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: a non-SELECT policy still exists among the 8 target tables -- rolling back';
  END IF;

  -- Exact raw ACL: postgres/service_role retain the full 8-privilege set;
  -- anon/authenticated hold exactly SELECT; every row still
  -- grantor=postgres/not grantable. One multiplicity-sensitive symmetric
  -- EXCEPT ALL over the complete row identity (table, grantee,
  -- privilege_type, grantor, is_grantable).
  SELECT count(*) INTO mismatch_count FROM (
    WITH expected(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      (SELECT t, r, p, verified_owner, false
         FROM unnest(target_tables) AS t,
              unnest(ARRAY['postgres','service_role']) AS r,
              unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p)
      UNION ALL
      (SELECT t, r, 'SELECT', verified_owner, false
         FROM unnest(target_tables) AS t,
              unnest(ARRAY['anon','authenticated']) AS r)
    ),
    actual(tbl, grantee, privilege_type, grantor, is_grantable) AS (
      SELECT c.relname,
             (CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
             a.privilege_type,
             (CASE WHEN a.grantor = 0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
             a.is_grantable
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname = 'public' AND c.relname = ANY (target_tables)
    )
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) AS diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'harden_recipe_catalog_client_write_boundary: postcheck: % raw-ACL-row mismatches found against the exact hardened ACL shape -- rolling back',
      mismatch_count;
  END IF;

  -- Effective privilege polarity, per role per table per privilege --
  -- anon/authenticated: SELECT only; service_role/postgres: unchanged full
  -- access.
  FOREACH tname IN ARRAY target_tables LOOP
    FOREACH rname IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF NOT pg_catalog.has_table_privilege(rname, 'public.' || tname, 'SELECT') THEN
        RAISE EXCEPTION
          'harden_recipe_catalog_client_write_boundary: postcheck: % lost effective SELECT on public.% -- rolling back',
          rname, tname;
      END IF;
      IF pg_catalog.has_table_privilege(rname, 'public.' || tname, 'INSERT')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'UPDATE')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'DELETE')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'TRUNCATE')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'REFERENCES')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'TRIGGER')
         OR pg_catalog.has_table_privilege(rname, 'public.' || tname, 'MAINTAIN')
      THEN
        RAISE EXCEPTION
          'harden_recipe_catalog_client_write_boundary: postcheck: % retains an effective write/DDL privilege on public.% -- expected SELECT only, rolling back',
          rname, tname;
      END IF;
    END LOOP;

    FOREACH rname IN ARRAY ARRAY['service_role','postgres'] LOOP
      IF NOT (
        pg_catalog.has_table_privilege(rname, 'public.' || tname, 'SELECT')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'INSERT')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'UPDATE')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'DELETE')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'TRUNCATE')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'REFERENCES')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'TRIGGER')
        AND pg_catalog.has_table_privilege(rname, 'public.' || tname, 'MAINTAIN')
      ) THEN
        RAISE EXCEPTION
          'harden_recipe_catalog_client_write_boundary: postcheck: % unexpectedly lacks full effective privileges on public.% -- rolling back',
          rname, tname;
      END IF;
    END LOOP;
  END LOOP;
END;
$postcheck$;
