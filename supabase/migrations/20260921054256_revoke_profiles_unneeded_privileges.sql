-- Migration: revoke_profiles_unneeded_privileges
--
-- Least-privilege cleanup for public.profiles, mirroring the pattern
-- already established for menu_plans/menu_plan_items by
-- 011_revoke_plans_unneeded_privileges.sql (now archived, but its
-- rationale and shape are the precedent this migration follows). A fresh
-- catalog check on the linked project (immediately before authoring this
-- file) found anon and authenticated both holding the full default table
-- privilege set on public.profiles -- SELECT, INSERT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES, TRIGGER, MAINTAIN -- none of which beyond
-- SELECT/INSERT/UPDATE for `authenticated` are used by any application
-- path: PostgREST only ever issues SELECT/INSERT/UPDATE/DELETE, the
-- three RLS policies from 20260921054250_baseline_profiles_schema.sql
-- gate SELECT/INSERT/UPDATE to the owning row only, there is deliberately
-- no DELETE policy (profiles are never deleted directly by a client --
-- the profiles_id_fkey ON DELETE CASCADE from auth.users handles
-- removal), and no client role runs DDL (REFERENCES/TRIGGER/MAINTAIN) or
-- TRUNCATE. `anon` has no legitimate access to profiles at all: every
-- policy requires `(select auth.uid()) IS NOT NULL`, which is never true
-- for an anonymous caller, so anon's grants were always dead access that
-- RLS already blocked -- this migration removes the now-provably-unused
-- grant itself, not just relying on RLS to keep blocking it.
--
-- This migration touches privileges ONLY. It does not alter table
-- schema, FK constraints, RLS enablement, RLS policies, the trigger, or
-- any SELECT/INSERT/UPDATE grant for `authenticated`. It does not touch
-- `service_role` (full access, matching every other table's
-- service-role-bypasses-RLS convention in this project) or `postgres`
-- (owner). It does not touch PUBLIC -- a fresh catalog check found no
-- PUBLIC-specific grant on public.profiles (the ACL holds only
-- anon/authenticated/postgres/service_role entries), so there is nothing
-- for a PUBLIC revoke to remove; per this slice's authorization, adding
-- one anyway without such evidence is out of scope. The preflight below
-- fails closed rather than touching PUBLIC or an unrecognized role if
-- the live pre-state ever differs from this audited assumption.
--
-- Order of operations:
--   A. Read-only preflight: confirm public.profiles exists with the
--      baseline SECURITY SUBSET 20260921054250 established -- table
--      owner is exactly postgres (verified explicitly, since the raw
--      ACL comparison below expresses its expected grantor as this
--      verified owner rather than a silently-guessed literal), RLS
--      enabled/not forced, the three named policies, and the
--      updated_at trigger's complete binding (name, the resolved
--      public.set_updated_at() OID, event/timing bitmask, enabled
--      state, argument count). This does NOT re-validate the complete
--      680-line table shape (columns/constraints/index) that migration
--      already owns -- only the subset this migration's own
--      correctness depends on. It also proves the exact RAW pre-state
--      ACL matches the audited assumption above -- anon, authenticated
--      and service_role each holding exactly the full 8-privilege
--      default set, each granted by the verified owner and not
--      grantable, no PUBLIC grant, no unrecognized non-owner grantee,
--      no duplicate or extra row (including a second row for the same
--      grantee/privilege from a different grantor), and no
--      column-level ACL -- before touching any privilege. This
--      comparison is a genuinely multiplicity-sensitive symmetric
--      EXCEPT ALL over the complete row identity (grantee,
--      privilege_type, grantor, is_grantable), NOT a FULL OUTER JOIN on
--      (grantee, privilege_type) alone -- a join on that reduced key
--      cannot distinguish one correct row from two rows for the same
--      grantee/privilege granted by different grantors (or one
--      grantable and one not), since both would independently satisfy
--      the same join condition and appear matched. Fail closed on any
--      mismatch (including an already-partially-revoked or otherwise-
--      drifted pre-state); never attempt to normalize PUBLIC or an
--      unknown role by altering it.
--   B. Two static REVOKE statements, no dynamic SQL -- REVOKE is
--      idempotent (revoking a privilege a role does not hold is a
--      documented no-op, not an error), so no existence guard is needed.
--   C. Read-only postcondition: re-verify the owner is still postgres,
--      then assert BOTH the effective has_table_privilege boundary per
--      role AND the exact raw post-state ACL via the same symmetric
--      EXCEPT ALL comparison (anon: no entry; authenticated: exactly
--      SELECT, INSERT, UPDATE, each granted by the verified owner and
--      not grantable; service_role: exactly the full 8-privilege set,
--      same grantor/grantable shape; PUBLIC: no entry; no unrecognized
--      non-owner grantee; no duplicate/extra row; no column-level ACL
--      escape hatch), and that the schema/RLS/policy/trigger contract
--      this migration deliberately does not touch is still completely
--      intact.
--
-- Every catalog/helper function this file's own DO blocks call is
-- schema-qualified with pg_catalog. explicitly, matching this repo's
-- established convention.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching this repo's
-- convention of relying on RAISE EXCEPTION inside a DO block to roll
-- back the whole file via the implicit single-statement-string
-- transaction.
--
-- Does NOT run ALTER DEFAULT PRIVILEGES. Does NOT grant anything to
-- anon or authenticated. Does NOT touch any table, column, constraint,
-- index, RLS policy, or trigger. Does NOT touch service_role or
-- postgres privileges.

-- ============================================================================
-- A. Read-only preflight -- confirm the baseline security subset and the
--    exact raw pre-state ACL this migration depends on, before touching
--    any privilege.
-- ============================================================================
DO $preflight$
DECLARE
  rel_count       int;
  rel             record;
  pol_mismatches  int;
  fn_count        int;
  fn_oid          oid;
  trg_count       int;
  trg             record;
  acl_mismatches  int;
  attacl_count    int;
BEGIN
  SELECT pg_catalog.count(*) INTO rel_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel_count <> 1 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: % objects named public.profiles exist -- expected exactly 1 (from 20260921054250), refusing to proceed',
      rel_count;
  END IF;

  SELECT c.relkind                                    AS relkind,
         pg_catalog.pg_get_userbyid(c.relowner)::text    AS owner,
         c.relrowsecurity                                AS rls_enabled,
         c.relforcerowsecurity                            AS force_rls
    INTO rel
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel.relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles relkind is % -- expected an ordinary table (r), refusing to proceed',
      rel.relkind;
  END IF;

  -- The raw ACL comparison below expresses its expected grantor as this
  -- verified owner -- so the owner itself must be confirmed postgres
  -- first, rather than silently assuming it.
  IF rel.owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles owner is % -- expected postgres, refusing to proceed',
      rel.owner;
  END IF;

  IF rel.rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles row level security is not enabled -- the baseline security contract this migration depends on is not present, refusing to proceed';
  END IF;

  IF rel.force_rls IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles has FORCE ROW LEVEL SECURITY enabled -- expected not forced, refusing to proceed';
  END IF;

  SELECT pg_catalog.count(*) INTO pol_mismatches
  FROM (
    VALUES
      ('Users can view own profile',   'SELECT',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))', NULL::text),
      ('Users can insert own profile', 'INSERT', NULL::text,
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))'),
      ('Users can update own profile', 'UPDATE',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))')
  ) AS expected(pol_name, pol_cmd, pol_qual, pol_check)
  FULL OUTER JOIN (
    SELECT policyname AS pol_name, cmd AS pol_cmd, permissive, roles, qual AS pol_qual, with_check AS pol_check
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
  ) AS actual USING (pol_name)
  WHERE actual.pol_name IS NULL
     OR expected.pol_name IS NULL
     OR actual.pol_cmd IS DISTINCT FROM expected.pol_cmd
     OR actual.permissive IS DISTINCT FROM 'PERMISSIVE'
     OR actual.roles IS DISTINCT FROM ARRAY['authenticated']::name[]
     OR actual.pol_qual IS DISTINCT FROM expected.pol_qual
     OR actual.pol_check IS DISTINCT FROM expected.pol_check;

  IF pol_mismatches <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles policies do not match the baseline three-policy contract (% mismatch(es)) -- the baseline security contract this migration depends on is not present, refusing to proceed',
      pol_mismatches;
  END IF;

  -- Resolve public.set_updated_at() once, to compare the trigger's
  -- tgfoid against below -- the exact same function the baseline
  -- migration verified and bound the trigger to.
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: % objects named public.set_updated_at exist -- expected exactly 1, refusing to proceed',
      fn_count;
  END IF;

  SELECT p.oid INTO fn_oid
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  -- Count EVERY non-internal trigger on the table, not only one matching
  -- the expected name -- an extra, differently-named trigger would be a
  -- shape drift this migration must not proceed past.
  SELECT pg_catalog.count(*) INTO trg_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg_count <> 1 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles has % non-internal trigger(s) -- expected exactly 1, the baseline security contract this migration depends on is not present, refusing to proceed',
      trg_count;
  END IF;

  SELECT t.tgname AS tgname, t.tgfoid AS tgfoid, t.tgtype AS tgtype,
         t.tgenabled AS tgenabled, t.tgnargs AS tgnargs
    INTO trg
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg.tgname IS DISTINCT FROM 'trg_profiles_updated_at'
     OR trg.tgfoid IS DISTINCT FROM fn_oid
     OR trg.tgtype IS DISTINCT FROM 19
     OR trg.tgenabled IS DISTINCT FROM 'O'
     OR trg.tgnargs IS DISTINCT FROM 0
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles single trigger does not match the baseline contract (name=%, tgfoid=% vs expected %, tgtype=% vs expected 19, tgenabled=% vs expected O, tgnargs=% vs expected 0) -- the baseline security contract this migration depends on is not present, refusing to proceed',
      trg.tgname, trg.tgfoid, fn_oid, trg.tgtype, trg.tgenabled, trg.tgnargs;
  END IF;

  -- Exact raw pre-state ACL: fail closed before any REVOKE unless the
  -- live table carries EXACTLY the audited pre-state -- anon,
  -- authenticated and service_role each holding the full 8-privilege
  -- default set, each granted by the verified owner (rel.owner, proven
  -- postgres above) and not grantable, no PUBLIC grant, and no other
  -- non-owner grantee or duplicate row. This migration must never alter
  -- PUBLIC or an unrecognized role; if either is present, or the
  -- pre-state otherwise differs (e.g. it has already been partially
  -- revoked by a prior partial run, or a row was granted by some other
  -- role), it aborts rather than silently proceeding past an unaudited
  -- configuration.
  --
  -- Symmetric EXCEPT ALL over the complete row identity (grantee,
  -- privilege_type, grantor, is_grantable) -- NOT a FULL OUTER JOIN on
  -- (grantee, privilege_type) alone, which cannot detect two rows for
  -- the same grantee/privilege from different grantors (or a grantable
  -- vs. non-grantable duplicate): both would independently satisfy the
  -- same reduced join key and appear matched. EXCEPT ALL is
  -- multiplicity-sensitive, so it also catches an exact duplicate row.
  SELECT pg_catalog.count(*) INTO acl_mismatches
  FROM (
    WITH expected(grantee, privilege_type, grantor, is_grantable) AS (
      VALUES
        ('anon',          'SELECT',     rel.owner, false),
        ('anon',          'INSERT',     rel.owner, false),
        ('anon',          'UPDATE',     rel.owner, false),
        ('anon',          'DELETE',     rel.owner, false),
        ('anon',          'TRUNCATE',   rel.owner, false),
        ('anon',          'REFERENCES', rel.owner, false),
        ('anon',          'TRIGGER',    rel.owner, false),
        ('anon',          'MAINTAIN',   rel.owner, false),
        ('authenticated', 'SELECT',     rel.owner, false),
        ('authenticated', 'INSERT',     rel.owner, false),
        ('authenticated', 'UPDATE',     rel.owner, false),
        ('authenticated', 'DELETE',     rel.owner, false),
        ('authenticated', 'TRUNCATE',   rel.owner, false),
        ('authenticated', 'REFERENCES', rel.owner, false),
        ('authenticated', 'TRIGGER',    rel.owner, false),
        ('authenticated', 'MAINTAIN',   rel.owner, false),
        ('service_role',  'SELECT',     rel.owner, false),
        ('service_role',  'INSERT',     rel.owner, false),
        ('service_role',  'UPDATE',     rel.owner, false),
        ('service_role',  'DELETE',     rel.owner, false),
        ('service_role',  'TRUNCATE',   rel.owner, false),
        ('service_role',  'REFERENCES', rel.owner, false),
        ('service_role',  'TRIGGER',    rel.owner, false),
        ('service_role',  'MAINTAIN',   rel.owner, false)
    ),
    actual(grantee, privilege_type, grantor, is_grantable) AS (
      SELECT
          CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,
          a.privilege_type,
          CASE WHEN a.grantor = 0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END,
          a.is_grantable
        FROM pg_catalog.pg_class c,
             pg_catalog.aclexplode(
               COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
             ) a
       WHERE c.oid = 'public.profiles'::regclass
         AND a.grantee IS DISTINCT FROM c.relowner
    )
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) AS diff;

  IF acl_mismatches <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: public.profiles pre-state ACL does not match the audited baseline (% row(s) differ in the symmetric grantee/privilege_type/grantor/is_grantable comparison against the expected anon/authenticated/service_role 8-privilege set granted by %, no PUBLIC entry, no unrecognized grantee, no duplicate row) -- refusing to proceed; PUBLIC and unrecognized roles are never altered by this migration',
      acl_mismatches, rel.owner;
  END IF;

  -- No column-level ACL on any column, pre-REVOKE.
  SELECT pg_catalog.count(*) INTO attacl_count
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.profiles'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND a.attacl IS NOT NULL;

  IF attacl_count <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: preflight: % column(s) of public.profiles carry a column-level ACL pre-REVOKE -- refusing to proceed',
      attacl_count;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Explicit, reviewable privilege changes. REVOKE is idempotent (a
--    no-op if the role never held the privilege), so no existence guard
--    is needed. No dynamic SQL.
-- ============================================================================
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;

REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.profiles FROM authenticated;

-- ============================================================================
-- C. Read-only postcondition -- assert both the effective per-role
--    privilege boundary and the exact raw ACL. Fail closed on any
--    mismatch. Does not assert schema/RLS/policy/trigger shape beyond
--    confirming this migration left it untouched.
-- ============================================================================
DO $postcheck$
DECLARE
  attacl_count    int;
  pol_mismatches  int;
  trg_count       int;
  rel             record;
  fn_oid          oid;
  trg             record;
  acl_mismatches  int;
  owner_name      text;
BEGIN
  -- anon: zero effective privileges of every kind, on this table.
  IF pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'INSERT')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'UPDATE')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'DELETE')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'TRUNCATE')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'REFERENCES')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'TRIGGER')
     OR pg_catalog.has_table_privilege('anon', 'public.profiles', 'MAINTAIN')
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: anon still has an effective privilege on public.profiles -- rolling back';
  END IF;

  -- authenticated: exactly SELECT/INSERT/UPDATE, nothing else.
  IF NOT pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     OR NOT pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: authenticated is missing SELECT/INSERT/UPDATE on public.profiles -- rolling back';
  END IF;

  IF pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'DELETE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'REFERENCES')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'TRIGGER')
     OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'MAINTAIN')
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: authenticated still has DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on public.profiles -- rolling back';
  END IF;

  -- service_role: unchanged, full access.
  IF NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'INSERT')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'UPDATE')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'DELETE')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'TRUNCATE')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'REFERENCES')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'TRIGGER')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.profiles', 'MAINTAIN')
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: service_role no longer has full privileges on public.profiles -- rolling back';
  END IF;

  -- postgres (owner): unchanged, full effective access (owner bypass).
  IF NOT pg_catalog.has_table_privilege('postgres', 'public.profiles', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('postgres', 'public.profiles', 'UPDATE')
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: postgres (owner) unexpectedly lacks effective access to public.profiles -- rolling back';
  END IF;

  -- The raw post-state ACL comparison below expresses its expected
  -- grantor as the verified owner -- re-confirm the owner is still
  -- postgres (unchanged by this migration) before relying on it.
  SELECT pg_catalog.pg_get_userbyid(c.relowner)::text INTO owner_name
    FROM pg_catalog.pg_class c
   WHERE c.oid = 'public.profiles'::regclass;

  IF owner_name IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles owner is % -- expected postgres, rolling back',
      owner_name;
  END IF;

  -- Exact raw post-state ACL: authenticated exactly {SELECT, INSERT,
  -- UPDATE}; service_role exactly the full 8-privilege set; both
  -- granted by the verified owner and not grantable; anon: no entry;
  -- PUBLIC: no entry; no unrecognized non-owner grantee; no duplicate
  -- row. This proves the DIRECT grant list, not merely effective access
  -- (which has_table_privilege above already covers, but which alone
  -- cannot rule out a stray extra direct grant that happens not to
  -- change what has_table_privilege reports, e.g. a duplicate ACL entry
  -- from a different grantor, or a redundant grantable copy).
  --
  -- Symmetric EXCEPT ALL over the complete row identity (grantee,
  -- privilege_type, grantor, is_grantable) -- NOT a FULL OUTER JOIN on
  -- (grantee, privilege_type) alone, which cannot detect two rows for
  -- the same grantee/privilege from different grantors (or a grantable
  -- vs. non-grantable duplicate): both would independently satisfy the
  -- same reduced join key and appear matched. EXCEPT ALL is
  -- multiplicity-sensitive, so it also catches an exact duplicate row.
  SELECT pg_catalog.count(*) INTO acl_mismatches
  FROM (
    WITH expected(grantee, privilege_type, grantor, is_grantable) AS (
      VALUES
        ('authenticated', 'SELECT',     owner_name, false),
        ('authenticated', 'INSERT',     owner_name, false),
        ('authenticated', 'UPDATE',     owner_name, false),
        ('service_role',  'SELECT',     owner_name, false),
        ('service_role',  'INSERT',     owner_name, false),
        ('service_role',  'UPDATE',     owner_name, false),
        ('service_role',  'DELETE',     owner_name, false),
        ('service_role',  'TRUNCATE',   owner_name, false),
        ('service_role',  'REFERENCES', owner_name, false),
        ('service_role',  'TRIGGER',    owner_name, false),
        ('service_role',  'MAINTAIN',   owner_name, false)
    ),
    actual(grantee, privilege_type, grantor, is_grantable) AS (
      SELECT
          CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END,
          a.privilege_type,
          CASE WHEN a.grantor = 0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END,
          a.is_grantable
        FROM pg_catalog.pg_class c,
             pg_catalog.aclexplode(
               COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
             ) a
       WHERE c.oid = 'public.profiles'::regclass
         AND a.grantee IS DISTINCT FROM c.relowner
    )
    (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
    UNION ALL
    (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
  ) AS diff;

  IF acl_mismatches <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles post-state ACL does not match the exact expected direct grant list (% row(s) differ in the symmetric grantee/privilege_type/grantor/is_grantable comparison: authenticated must be exactly SELECT/INSERT/UPDATE, service_role must be exactly the full 8-privilege set, both granted by % and not grantable, anon and PUBLIC must have no entry, no unrecognized grantee, no duplicate row), rolling back',
      acl_mismatches, owner_name;
  END IF;

  -- No column-level ACL on any column could bypass the table-level
  -- boundary just asserted above.
  SELECT pg_catalog.count(*) INTO attacl_count
    FROM pg_catalog.pg_attribute a
   WHERE a.attrelid = 'public.profiles'::regclass
     AND a.attnum > 0 AND NOT a.attisdropped
     AND a.attacl IS NOT NULL;

  IF attacl_count <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: % column(s) of public.profiles carry a column-level ACL that could bypass the table-level privilege boundary -- rolling back',
      attacl_count;
  END IF;

  -- RLS untouched: still enabled, still not forced.
  SELECT c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
    INTO rel
    FROM pg_catalog.pg_class c
   WHERE c.oid = 'public.profiles'::regclass;

  IF rel.rls_enabled IS DISTINCT FROM true OR rel.force_rls IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles RLS state changed unexpectedly (enabled=%, forced=%) -- rolling back',
      rel.rls_enabled, rel.force_rls;
  END IF;

  -- Policies untouched: exactly the same three, no DELETE policy.
  SELECT pg_catalog.count(*) INTO pol_mismatches
  FROM (
    VALUES
      ('Users can view own profile',   'SELECT',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))', NULL::text),
      ('Users can insert own profile', 'INSERT', NULL::text,
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))'),
      ('Users can update own profile', 'UPDATE',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))',
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = id))')
  ) AS expected(pol_name, pol_cmd, pol_qual, pol_check)
  FULL OUTER JOIN (
    SELECT policyname AS pol_name, cmd AS pol_cmd, permissive, roles, qual AS pol_qual, with_check AS pol_check
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
  ) AS actual USING (pol_name)
  WHERE actual.pol_name IS NULL
     OR expected.pol_name IS NULL
     OR actual.pol_cmd IS DISTINCT FROM expected.pol_cmd
     OR actual.permissive IS DISTINCT FROM 'PERMISSIVE'
     OR actual.roles IS DISTINCT FROM ARRAY['authenticated']::name[]
     OR actual.pol_qual IS DISTINCT FROM expected.pol_qual
     OR actual.pol_check IS DISTINCT FROM expected.pol_check;

  IF pol_mismatches <> 0 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles policies changed unexpectedly (% mismatch(es)) -- rolling back',
      pol_mismatches;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'DELETE'
  ) THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: a DELETE policy now exists on public.profiles -- expected none, rolling back';
  END IF;

  -- Trigger untouched: exactly one non-internal trigger total (not only
  -- one matching the expected name), with the complete audited shape.
  SELECT p.oid INTO fn_oid
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_oid IS NULL THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.set_updated_at no longer exists, rolling back';
  END IF;

  SELECT pg_catalog.count(*) INTO trg_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg_count <> 1 THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles has % non-internal trigger(s) -- expected exactly 1, rolling back',
      trg_count;
  END IF;

  SELECT t.tgname AS tgname, t.tgfoid AS tgfoid, t.tgtype AS tgtype,
         t.tgenabled AS tgenabled, t.tgnargs AS tgnargs
    INTO trg
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg.tgname IS DISTINCT FROM 'trg_profiles_updated_at'
     OR trg.tgfoid IS DISTINCT FROM fn_oid
     OR trg.tgtype IS DISTINCT FROM 19
     OR trg.tgenabled IS DISTINCT FROM 'O'
     OR trg.tgnargs IS DISTINCT FROM 0
  THEN
    RAISE EXCEPTION
      'revoke_profiles_unneeded_privileges: postcheck: public.profiles single trigger does not match the baseline contract (name=%, tgfoid=% vs expected %, tgtype=% vs expected 19, tgenabled=% vs expected O, tgnargs=% vs expected 0), rolling back',
      trg.tgname, trg.tgfoid, fn_oid, trg.tgtype, trg.tgenabled, trg.tgnargs;
  END IF;
END;
$postcheck$;
