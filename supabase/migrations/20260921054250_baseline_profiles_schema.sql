-- Migration: baseline_profiles_schema
--
-- public.profiles is a live, purpose-built table (auth.users-linked user
-- profile row, one per user) that has never been captured in any tracked
-- migration -- confirmed by a repository-wide search finding zero
-- references anywhere in supabase/migrations or elsewhere in this repo.
-- This is the same untracked-base-table gap already documented for
-- public.recipes, public.menu_plans and public.menu_plan_items (see
-- docs/database/legacy-migrations-untracked/README.md) -- this migration
-- closes that gap for profiles only.
--
-- Scope of this migration: public.profiles itself only -- its table
-- shape, constraints, comments, RLS enablement, its three named
-- self-access policies, and its single updated_at trigger binding. It
-- does NOT grant or revoke any table privilege (anon/authenticated/
-- service_role ACLs) -- that is the deliberately separate concern of
-- 20260921054256_revoke_profiles_unneeded_privileges.sql, which runs
-- immediately after this one and depends on the shape this migration
-- guarantees. It does NOT touch auth.users, does NOT modify
-- public.set_updated_at() (only reads its already-hardened contract,
-- established by 20260920072450_baseline_and_harden_set_updated_at.sql,
-- to bind a trigger to it), and does NOT touch any other table.
--
-- Order of operations (each step gated on the previous):
--   A. Read-only preflight: first confirm public.set_updated_at() itself
--      already carries the exact, COMPLETE hardened contract
--      20260920072450 established -- every behavior-affecting property
--      that migration's own postcheck asserts (signature, return type,
--      volatility/strictness/parallel-safety/leakproof, owner, the
--      pinned search_path, the exact canonical body, and a generic scan
--      proving no non-owner grantee retains EXECUTE or a grant option)
--      -- not just a subset (this migration only ever binds a trigger to
--      that function -- it never creates or alters it, so every property
--      the trigger's correctness could depend on must be verified, not
--      only the ones convenient to check). Then inspect public.profiles:
--      accept either "absent" (fresh-database path) or "present and
--      matches the complete audited catalog contract" (columns, types,
--      nullability, defaults, owner, comments, constraints incl. FK
--      actions, index set, RLS enablement, the three named policies with
--      their exact role/command/USING/WITH CHECK expressions, and the
--      single trigger's complete binding to set_updated_at -- name, the
--      verified function OID, event/timing bitmask, enabled state, and
--      zero arguments). Fail closed (RAISE EXCEPTION, rolling back the
--      whole migration) on any other shape, rather than silently
--      normalizing it. This block never performs a write itself -- it
--      only inspects and may abort.
--   B. Only once preflight has either found nothing or confirmed
--      compatibility: CREATE TABLE IF NOT EXISTS with every constraint
--      declared inline and canonically named, set owner, apply the two
--      audited comments, enable (never force) RLS, then guardedly create
--      each of the three policies and the trigger ONLY if individually
--      absent -- so an already-compatible production table is left
--      completely untouched at the constraint/policy/trigger level, and
--      a fresh database gets the identical shape. Postgres has no
--      "CREATE POLICY IF NOT EXISTS" / "CREATE TRIGGER IF NOT EXISTS",
--      so those two creations use a pg_catalog existence check plus a
--      single fully-static EXECUTE string each -- no user or catalog
--      value is ever interpolated into that string.
--   C. Read-only postcondition: assert the complete final shape again,
--      including the complete public.set_updated_at() contract (its
--      final trigger dependency is part of this migration's own final
--      contract, not merely a precondition) -- same contract as
--      preflight, minus the "or absent" branch (a profiles table
--      matching the contract must now exist). Does NOT assert table
--      ACLs -- that is 20260921054256's postcondition.
--
-- Every catalog/helper function this file's own DO blocks call is
-- schema-qualified with pg_catalog. explicitly, for the same
-- search_path-independence reason documented in 20260920072450.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching this repo's
-- established convention (see 20260920072450's header) of relying on a
-- RAISE EXCEPTION inside a DO block to roll back the whole file via the
-- implicit single-statement-string transaction, rather than adding
-- transaction-control statements of its own.
--
-- Does NOT touch auth.users, public.set_updated_at(), or any table other
-- than public.profiles. Does NOT grant/revoke any profiles privilege.
-- Does NOT run ALTER DEFAULT PRIVILEGES. Does NOT insert, update, delete,
-- or read any row of profiles -- every check here is catalog-only.

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  fn_count          int;
  fn                record;
  fn_acl_row        record;
  rel_count         int;
  rel               record;
  col_mismatches    int;
  con_mismatches    int;
  idx_mismatches    int;
  pol_mismatches    int;
  trg_count         int;
  trg               record;
BEGIN
  -- --------------------------------------------------------------------
  -- Prerequisite: public.set_updated_at() must already carry exactly the
  -- COMPLETE hardened contract 20260920072450 established -- every
  -- behavior-affecting property that migration's own postcheck asserts,
  -- including the exact canonical body and a generic non-owner ACL scan.
  -- This migration only ever binds a trigger to it -- it never
  -- creates/replaces the function itself, so an incompatible or absent
  -- function must abort before any table work is even considered.
  -- --------------------------------------------------------------------
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: % objects named public.set_updated_at exist -- expected exactly 1 (from 20260920072450), refusing to proceed',
      fn_count;
  END IF;

  SELECT p.oid                                              AS fn_oid,
         p.prokind                                            AS prokind,
         pg_catalog.pg_get_function_identity_arguments(p.oid)  AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL)            AS rettype,
         p.proretset                                            AS proretset,
         l.lanname                                              AS lang,
         p.prosecdef                                            AS secdef,
         p.provolatile                                          AS volatility,
         p.proisstrict                                          AS is_strict,
         p.proparallel                                          AS parallel,
         p.proleakproof                                         AS leakproof,
         pg_catalog.pg_get_userbyid(p.proowner)                 AS owner,
         p.proowner                                              AS owner_oid,
         p.proconfig                                            AS proconfig,
         p.proacl                                               AS proacl,
         pg_catalog.btrim(pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g')) AS body_norm
    INTO fn
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn.prokind IS DISTINCT FROM 'f'
     OR fn.identity_args IS DISTINCT FROM ''
     OR fn.rettype IS DISTINCT FROM 'trigger'
     OR fn.proretset IS DISTINCT FROM false
     OR fn.lang IS DISTINCT FROM 'plpgsql'
     OR fn.secdef IS DISTINCT FROM false
     OR fn.volatility IS DISTINCT FROM 'v'
     OR fn.is_strict IS DISTINCT FROM false
     OR fn.parallel IS DISTINCT FROM 'u'
     OR fn.leakproof IS DISTINCT FROM false
     OR fn.owner IS DISTINCT FROM 'postgres'
     OR fn.proconfig IS NULL
     OR pg_catalog.array_length(fn.proconfig, 1) <> 1
     OR NOT ('search_path=pg_catalog' = ANY (fn.proconfig))
     OR fn.body_norm IS DISTINCT FROM 'BEGIN NEW.updated_at = pg_catalog.now(); RETURN NEW; END;'
  THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.set_updated_at does not carry the complete hardened contract from 20260920072450 (prokind=%, identity_args=%, rettype=%, proretset=%, lang=%, secdef=%, volatility=%, is_strict=%, parallel=%, leakproof=%, owner=%, proconfig=%, body=%) -- refusing to bind a trigger to an unverified function',
      fn.prokind, fn.identity_args, fn.rettype, fn.proretset, fn.lang, fn.secdef, fn.volatility, fn.is_strict, fn.parallel, fn.leakproof, fn.owner, fn.proconfig, fn.body_norm;
  END IF;

  -- Generic non-owner ACL scan on set_updated_at: no grantee other than
  -- the owner may hold EXECUTE or a grant option. grantee = 0 denotes
  -- PUBLIC and is included automatically since it is never equal to
  -- owner_oid -- so this single loop covers PUBLIC, anon, authenticated,
  -- service_role, and any other role generically, matching the same
  -- principle 20260920072450's own postcheck already established for
  -- this exact function, rather than a fixed list of role names.
  FOR fn_acl_row IN
    SELECT a.grantee, a.privilege_type, a.is_grantable
      FROM pg_catalog.aclexplode(
             COALESCE(fn.proacl, pg_catalog.acldefault('f', fn.owner_oid))
           ) a
     WHERE a.grantee IS DISTINCT FROM fn.owner_oid
  LOOP
    IF fn_acl_row.privilege_type = 'EXECUTE' THEN
      RAISE EXCEPTION
        'baseline_profiles_schema: preflight: non-owner grantee (role oid %) still has EXECUTE on public.set_updated_at -- the hardened contract from 20260920072450 is not intact, refusing to proceed',
        fn_acl_row.grantee;
    END IF;

    IF fn_acl_row.is_grantable THEN
      RAISE EXCEPTION
        'baseline_profiles_schema: preflight: non-owner grantee (role oid %) holds a grant option on public.set_updated_at -- the hardened contract from 20260920072450 is not intact, refusing to proceed',
        fn_acl_row.grantee;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_function_privilege('postgres', fn.fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: postgres (owner) unexpectedly lacks effective EXECUTE on public.set_updated_at -- refusing to proceed';
  END IF;

  -- --------------------------------------------------------------------
  -- public.profiles: accept absent, or present-and-exactly-matching.
  -- --------------------------------------------------------------------
  SELECT pg_catalog.count(*) INTO rel_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel_count = 0 THEN
    -- Absent: nothing further to validate, step B creates it fresh.
    RETURN;
  END IF;

  IF rel_count > 1 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: % objects named public.profiles exist -- expected 0 or 1, refusing to proceed',
      rel_count;
  END IF;

  SELECT c.relkind                                    AS relkind,
         pg_catalog.pg_get_userbyid(c.relowner)          AS owner,
         c.relrowsecurity                                AS rls_enabled,
         c.relforcerowsecurity                            AS force_rls,
         pg_catalog.obj_description(c.oid, 'pg_class')     AS table_comment
    INTO rel
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel.relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles relkind is % -- expected an ordinary table (r), refusing to alter an incompatible object',
      rel.relkind;
  END IF;

  IF rel.owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles owner is % -- expected postgres, refusing to alter an incompatible object',
      rel.owner;
  END IF;

  IF rel.table_comment IS DISTINCT FROM 'Application user profile table linked to auth.users' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles table comment is % -- does not match the audited comment, refusing to alter an incompatible object',
      rel.table_comment;
  END IF;

  IF (SELECT pg_catalog.col_description(('public.profiles'::regclass)::oid, a.attnum)
        FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = 'default_servings')
     IS DISTINCT FROM 'Default serving size for the user, PrepMeal uses 1 by default'
  THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles.default_servings comment does not match the audited comment, refusing to alter an incompatible object';
  END IF;

  -- Exact ordered six-column shape: name, type, nullability, default
  -- (normalized case/whitespace -- "semantically equivalent catalog
  -- rendering" is the only tolerated variance), identity, generated.
  -- A FULL OUTER JOIN on ordinal position catches both a missing
  -- expected column and any extra actual column in one count.
  SELECT pg_catalog.count(*) INTO col_mismatches
  FROM (
    VALUES
      (1, 'id',               'uuid',                      'NO',  NULL::text),
      (2, 'display_name',     'text',                       'YES', NULL::text),
      (3, 'avatar_url',       'text',                        'YES', NULL::text),
      (4, 'default_servings', 'integer',                     'NO',  '1'),
      (5, 'created_at',       'timestamp with time zone',    'NO',  'now()'),
      (6, 'updated_at',       'timestamp with time zone',    'NO',  'now()')
  ) AS expected(ord, col_name, col_type, col_nullable, col_default)
  FULL OUTER JOIN (
    SELECT a.attnum                                                       AS ord,
           a.attname                                                      AS col_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod)                 AS col_type,
           CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END                 AS col_nullable,
           CASE WHEN ad.adbin IS NOT NULL
                THEN pg_catalog.lower(pg_catalog.btrim(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)))
                ELSE NULL END                                              AS col_default,
           a.attidentity                                                   AS attidentity,
           a.attgenerated                                                  AS attgenerated
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef ad
        ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE a.attrelid = 'public.profiles'::regclass
       AND a.attnum > 0 AND NOT a.attisdropped
  ) AS actual USING (ord)
  WHERE actual.ord IS NULL
     OR expected.ord IS NULL
     OR actual.col_name IS DISTINCT FROM expected.col_name
     OR actual.col_type IS DISTINCT FROM expected.col_type
     OR actual.col_nullable IS DISTINCT FROM expected.col_nullable
     OR actual.col_default IS DISTINCT FROM expected.col_default
     OR actual.attidentity IS DISTINCT FROM ''
     OR actual.attgenerated IS DISTINCT FROM '';

  IF col_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles column shape does not match the audited six-column contract (% mismatched ordinal position(s)) -- refusing to alter an incompatible object',
      col_mismatches;
  END IF;

  -- Exact three named constraints (PK, FK incl. action, CHECK) -- exact
  -- definition text, no extra constraint.
  SELECT pg_catalog.count(*) INTO con_mismatches
  FROM (
    VALUES
      ('profiles_pkey',                  'PRIMARY KEY (id)'),
      ('profiles_id_fkey',                'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('profiles_default_servings_check', 'CHECK ((default_servings > 0))')
  ) AS expected(con_name, con_def)
  FULL OUTER JOIN (
    SELECT conname AS con_name, pg_catalog.pg_get_constraintdef(oid) AS con_def
      FROM pg_catalog.pg_constraint
     WHERE conrelid = 'public.profiles'::regclass
  ) AS actual USING (con_name)
  WHERE actual.con_name IS NULL
     OR expected.con_name IS NULL
     OR actual.con_def IS DISTINCT FROM expected.con_def;

  IF con_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles constraints do not match the audited contract (% mismatch(es)) -- refusing to alter an incompatible object',
      con_mismatches;
  END IF;

  -- Exactly the PK btree index, no other index.
  SELECT pg_catalog.count(*) INTO idx_mismatches
  FROM (VALUES ('profiles_pkey', 'CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)'))
    AS expected(idx_name, idx_def)
  FULL OUTER JOIN (
    SELECT indexname AS idx_name, indexdef AS idx_def
      FROM pg_catalog.pg_indexes
     WHERE schemaname = 'public' AND tablename = 'profiles'
  ) AS actual USING (idx_name)
  WHERE actual.idx_name IS NULL
     OR expected.idx_name IS NULL
     OR actual.idx_def IS DISTINCT FROM expected.idx_def;

  IF idx_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles index set does not match the audited contract (% mismatch(es)) -- refusing to alter an incompatible object',
      idx_mismatches;
  END IF;

  IF rel.rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles has row level security disabled -- refusing to alter an incompatible object';
  END IF;

  IF rel.force_rls IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles has FORCE ROW LEVEL SECURITY enabled -- expected not forced, refusing to alter an incompatible object';
  END IF;

  -- Exactly three named policies, permissive, role {authenticated}, with
  -- the audited self-ownership predicate on USING/WITH CHECK as
  -- appropriate for each command. No DELETE policy, no extra policy.
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
      'baseline_profiles_schema: preflight: public.profiles policies do not match the audited three-policy contract (% mismatch(es)) -- refusing to alter an incompatible object',
      pol_mismatches;
  END IF;

  -- Exactly one non-internal trigger, bound by OID to the already-
  -- verified public.set_updated_at(), with the complete audited event/
  -- timing/enabled/argument-count shape.
  SELECT pg_catalog.count(*) INTO trg_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles has % non-internal trigger(s) -- expected exactly 1, refusing to alter an incompatible object',
      trg_count;
  END IF;

  SELECT t.tgname AS tgname, t.tgfoid AS tgfoid,
         t.tgtype AS tgtype, t.tgenabled AS tgenabled, t.tgnargs AS tgnargs
    INTO trg
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg.tgname IS DISTINCT FROM 'trg_profiles_updated_at' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: public.profiles single trigger is named % -- expected trg_profiles_updated_at, refusing to alter an incompatible object',
      trg.tgname;
  END IF;

  IF trg.tgfoid IS DISTINCT FROM fn.fn_oid THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: trg_profiles_updated_at does not point to the verified public.set_updated_at() (oid % vs %) -- refusing to alter an incompatible object',
      trg.tgfoid, fn.fn_oid;
  END IF;

  -- tgtype bitmask: BEFORE(2) | UPDATE(16) | ROW(1) = 19, no other bit.
  IF trg.tgtype IS DISTINCT FROM 19 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: trg_profiles_updated_at tgtype is % -- expected 19 (BEFORE UPDATE FOR EACH ROW only), refusing to alter an incompatible object',
      trg.tgtype;
  END IF;

  IF trg.tgenabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: trg_profiles_updated_at tgenabled is % -- expected O (enabled, fires in origin/local mode), refusing to alter an incompatible object',
      trg.tgenabled;
  END IF;

  IF trg.tgnargs IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: preflight: trg_profiles_updated_at tgnargs is % -- expected 0, refusing to alter an incompatible object',
      trg.tgnargs;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Compatibility confirmed (or object absent) -- create/reconcile as
--    static, schema-neutral SQL. An already-compatible production table
--    is left untouched at the constraint/policy/trigger level.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid NOT NULL,
  display_name      text,
  avatar_url        text,
  default_servings  integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at        timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_default_servings_check CHECK (default_servings > 0)
);

-- CREATE TABLE has no OWNER clause; ownership defaults to the executing
-- role, so this stays a separate, deterministic, idempotent statement.
ALTER TABLE public.profiles OWNER TO postgres;

COMMENT ON TABLE public.profiles IS
  'Application user profile table linked to auth.users';
COMMENT ON COLUMN public.profiles.default_servings IS
  'Default serving size for the user, PrepMeal uses 1 by default';

-- Idempotent: no error if already enabled. Never FORCE -- table owner
-- and superuser bypass RLS by design, matching the audited contract.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Postgres has no CREATE POLICY IF NOT EXISTS. Each guard below is a
-- read-only pg_catalog existence check followed by exactly one fully
-- static EXECUTE string -- no user or catalog value is interpolated.
DO $create_policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
       AND policyname = 'Users can view own profile'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id)
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
       AND policyname = 'Users can insert own profile'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT TO authenticated
        WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id)
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
       AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE TO authenticated
        USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id)
        WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = id)
    $sql$;
  END IF;
END;
$create_policies$;

-- Postgres has no CREATE TRIGGER IF NOT EXISTS either -- same guarded,
-- fully static pattern. Binds to public.set_updated_at() by name; the
-- preflight above already proved that name currently resolves to the
-- one hardened function this migration verified.
DO $create_trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
     WHERE t.tgrelid = 'public.profiles'::regclass
       AND t.tgname = 'trg_profiles_updated_at'
       AND NOT t.tgisinternal
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER trg_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $sql$;
  END IF;
END;
$create_trigger$;

-- ============================================================================
-- C. Read-only postcondition -- assert the complete final shape. Fail
--    closed on any mismatch. Does NOT assert table ACLs.
-- ============================================================================
DO $postcheck$
DECLARE
  fn                record;
  fn_acl_row        record;
  rel_count         int;
  rel               record;
  col_mismatches    int;
  con_mismatches    int;
  idx_mismatches    int;
  pol_mismatches    int;
  trg_count         int;
  trg               record;
BEGIN
  -- The final trigger this migration guarantees depends on
  -- public.set_updated_at() by OID and by its complete hardened
  -- contract -- both are therefore part of THIS migration's own final
  -- contract, not merely a precondition checked once in the preflight.
  SELECT p.oid                                              AS fn_oid,
         p.prokind                                            AS prokind,
         pg_catalog.pg_get_function_identity_arguments(p.oid)  AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL)            AS rettype,
         p.proretset                                            AS proretset,
         l.lanname                                              AS lang,
         p.prosecdef                                            AS secdef,
         p.provolatile                                          AS volatility,
         p.proisstrict                                          AS is_strict,
         p.proparallel                                          AS parallel,
         p.proleakproof                                         AS leakproof,
         pg_catalog.pg_get_userbyid(p.proowner)                 AS owner,
         p.proowner                                              AS owner_oid,
         p.proconfig                                            AS proconfig,
         p.proacl                                               AS proacl,
         pg_catalog.btrim(pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g')) AS body_norm
    INTO fn
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn.fn_oid IS NULL THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.set_updated_at no longer exists, rolling back';
  END IF;

  IF fn.prokind IS DISTINCT FROM 'f'
     OR fn.identity_args IS DISTINCT FROM ''
     OR fn.rettype IS DISTINCT FROM 'trigger'
     OR fn.proretset IS DISTINCT FROM false
     OR fn.lang IS DISTINCT FROM 'plpgsql'
     OR fn.secdef IS DISTINCT FROM false
     OR fn.volatility IS DISTINCT FROM 'v'
     OR fn.is_strict IS DISTINCT FROM false
     OR fn.parallel IS DISTINCT FROM 'u'
     OR fn.leakproof IS DISTINCT FROM false
     OR fn.owner IS DISTINCT FROM 'postgres'
     OR fn.proconfig IS NULL
     OR pg_catalog.array_length(fn.proconfig, 1) <> 1
     OR NOT ('search_path=pg_catalog' = ANY (fn.proconfig))
     OR fn.body_norm IS DISTINCT FROM 'BEGIN NEW.updated_at = pg_catalog.now(); RETURN NEW; END;'
  THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.set_updated_at no longer carries the complete hardened contract from 20260920072450 (prokind=%, identity_args=%, rettype=%, proretset=%, lang=%, secdef=%, volatility=%, is_strict=%, parallel=%, leakproof=%, owner=%, proconfig=%, body=%), rolling back',
      fn.prokind, fn.identity_args, fn.rettype, fn.proretset, fn.lang, fn.secdef, fn.volatility, fn.is_strict, fn.parallel, fn.leakproof, fn.owner, fn.proconfig, fn.body_norm;
  END IF;

  FOR fn_acl_row IN
    SELECT a.grantee, a.privilege_type, a.is_grantable
      FROM pg_catalog.aclexplode(
             COALESCE(fn.proacl, pg_catalog.acldefault('f', fn.owner_oid))
           ) a
     WHERE a.grantee IS DISTINCT FROM fn.owner_oid
  LOOP
    IF fn_acl_row.privilege_type = 'EXECUTE' THEN
      RAISE EXCEPTION
        'baseline_profiles_schema: postcheck: non-owner grantee (role oid %) has EXECUTE on public.set_updated_at, rolling back',
        fn_acl_row.grantee;
    END IF;

    IF fn_acl_row.is_grantable THEN
      RAISE EXCEPTION
        'baseline_profiles_schema: postcheck: non-owner grantee (role oid %) holds a grant option on public.set_updated_at, rolling back',
        fn_acl_row.grantee;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_function_privilege('postgres', fn.fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: postgres (owner) unexpectedly lacks effective EXECUTE on public.set_updated_at, rolling back';
  END IF;

  SELECT pg_catalog.count(*) INTO rel_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: % objects named public.profiles exist -- expected exactly 1, rolling back',
      rel_count;
  END IF;

  SELECT c.relkind                                    AS relkind,
         pg_catalog.pg_get_userbyid(c.relowner)          AS owner,
         c.relrowsecurity                                AS rls_enabled,
         c.relforcerowsecurity                            AS force_rls,
         pg_catalog.obj_description(c.oid, 'pg_class')     AS table_comment
    INTO rel
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF rel.relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles relkind is % -- expected an ordinary table (r), rolling back',
      rel.relkind;
  END IF;

  IF rel.owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles owner is % -- expected postgres, rolling back',
      rel.owner;
  END IF;

  IF rel.table_comment IS DISTINCT FROM 'Application user profile table linked to auth.users' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles table comment is % -- expected the audited comment, rolling back',
      rel.table_comment;
  END IF;

  IF (SELECT pg_catalog.col_description(('public.profiles'::regclass)::oid, a.attnum)
        FROM pg_catalog.pg_attribute a
       WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = 'default_servings')
     IS DISTINCT FROM 'Default serving size for the user, PrepMeal uses 1 by default'
  THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles.default_servings comment does not match the audited comment, rolling back';
  END IF;

  SELECT pg_catalog.count(*) INTO col_mismatches
  FROM (
    VALUES
      (1, 'id',               'uuid',                      'NO',  NULL::text),
      (2, 'display_name',     'text',                       'YES', NULL::text),
      (3, 'avatar_url',       'text',                        'YES', NULL::text),
      (4, 'default_servings', 'integer',                     'NO',  '1'),
      (5, 'created_at',       'timestamp with time zone',    'NO',  'now()'),
      (6, 'updated_at',       'timestamp with time zone',    'NO',  'now()')
  ) AS expected(ord, col_name, col_type, col_nullable, col_default)
  FULL OUTER JOIN (
    SELECT a.attnum                                                       AS ord,
           a.attname                                                      AS col_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod)                 AS col_type,
           CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END                 AS col_nullable,
           CASE WHEN ad.adbin IS NOT NULL
                THEN pg_catalog.lower(pg_catalog.btrim(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)))
                ELSE NULL END                                              AS col_default,
           a.attidentity                                                   AS attidentity,
           a.attgenerated                                                  AS attgenerated
      FROM pg_catalog.pg_attribute a
      LEFT JOIN pg_catalog.pg_attrdef ad
        ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE a.attrelid = 'public.profiles'::regclass
       AND a.attnum > 0 AND NOT a.attisdropped
  ) AS actual USING (ord)
  WHERE actual.ord IS NULL
     OR expected.ord IS NULL
     OR actual.col_name IS DISTINCT FROM expected.col_name
     OR actual.col_type IS DISTINCT FROM expected.col_type
     OR actual.col_nullable IS DISTINCT FROM expected.col_nullable
     OR actual.col_default IS DISTINCT FROM expected.col_default
     OR actual.attidentity IS DISTINCT FROM ''
     OR actual.attgenerated IS DISTINCT FROM '';

  IF col_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles column shape does not match the audited six-column contract (% mismatched ordinal position(s)), rolling back',
      col_mismatches;
  END IF;

  SELECT pg_catalog.count(*) INTO con_mismatches
  FROM (
    VALUES
      ('profiles_pkey',                  'PRIMARY KEY (id)'),
      ('profiles_id_fkey',                'FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('profiles_default_servings_check', 'CHECK ((default_servings > 0))')
  ) AS expected(con_name, con_def)
  FULL OUTER JOIN (
    SELECT conname AS con_name, pg_catalog.pg_get_constraintdef(oid) AS con_def
      FROM pg_catalog.pg_constraint
     WHERE conrelid = 'public.profiles'::regclass
  ) AS actual USING (con_name)
  WHERE actual.con_name IS NULL
     OR expected.con_name IS NULL
     OR actual.con_def IS DISTINCT FROM expected.con_def;

  IF con_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles constraints do not match the audited contract (% mismatch(es)), rolling back',
      con_mismatches;
  END IF;

  SELECT pg_catalog.count(*) INTO idx_mismatches
  FROM (VALUES ('profiles_pkey', 'CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)'))
    AS expected(idx_name, idx_def)
  FULL OUTER JOIN (
    SELECT indexname AS idx_name, indexdef AS idx_def
      FROM pg_catalog.pg_indexes
     WHERE schemaname = 'public' AND tablename = 'profiles'
  ) AS actual USING (idx_name)
  WHERE actual.idx_name IS NULL
     OR expected.idx_name IS NULL
     OR actual.idx_def IS DISTINCT FROM expected.idx_def;

  IF idx_mismatches <> 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles index set does not match the audited contract (% mismatch(es)), rolling back',
      idx_mismatches;
  END IF;

  IF rel.rls_enabled IS DISTINCT FROM true THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles row level security is not enabled, rolling back';
  END IF;

  IF rel.force_rls IS DISTINCT FROM false THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles has FORCE ROW LEVEL SECURITY enabled -- expected not forced, rolling back';
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
      'baseline_profiles_schema: postcheck: public.profiles policies do not match the audited three-policy contract (% mismatch(es)), rolling back',
      pol_mismatches;
  END IF;

  SELECT pg_catalog.count(*) INTO trg_count
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles has % non-internal trigger(s) -- expected exactly 1, rolling back',
      trg_count;
  END IF;

  SELECT t.tgname AS tgname, t.tgfoid AS tgfoid, t.tgtype AS tgtype,
         t.tgenabled AS tgenabled, t.tgnargs AS tgnargs
    INTO trg
    FROM pg_catalog.pg_trigger t
   WHERE t.tgrelid = 'public.profiles'::regclass AND NOT t.tgisinternal;

  IF trg.tgname IS DISTINCT FROM 'trg_profiles_updated_at' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: public.profiles single trigger is named % -- expected trg_profiles_updated_at, rolling back',
      trg.tgname;
  END IF;

  IF trg.tgfoid IS DISTINCT FROM fn.fn_oid THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: trg_profiles_updated_at does not point to public.set_updated_at() (oid % vs %), rolling back',
      trg.tgfoid, fn.fn_oid;
  END IF;

  IF trg.tgtype IS DISTINCT FROM 19 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: trg_profiles_updated_at tgtype is % -- expected 19 (BEFORE UPDATE FOR EACH ROW only), rolling back',
      trg.tgtype;
  END IF;

  IF trg.tgenabled IS DISTINCT FROM 'O' THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: trg_profiles_updated_at tgenabled is % -- expected O (enabled, fires in origin/local mode), rolling back',
      trg.tgenabled;
  END IF;

  IF trg.tgnargs IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION
      'baseline_profiles_schema: postcheck: trg_profiles_updated_at tgnargs is % -- expected 0, rolling back',
      trg.tgnargs;
  END IF;
END;
$postcheck$;
