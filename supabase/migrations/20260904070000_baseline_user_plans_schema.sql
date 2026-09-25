-- Migration: baseline_user_plans_schema
--
-- PrepMeal Canonical Baseline, Slice 2 of 3 (user/plans schema).
--
-- SCOPE: exactly 4 tables:
--   public.menu_plans, public.menu_plan_items,
--   public.user_favorites, public.user_preferences
-- plus only the constraints/indexes/RLS/policies/ACLs/comments/trigger that
-- belong directly to those 4 tables. No other object is created or altered.
--
-- WHY THIS MIGRATION EXISTS: the combined Slice 2/3 canonical-baseline
-- readiness audit (see /home/venn/prepmeal-baseline-slices2-3-implementation-
-- readiness.md, outside this repo, SHA-256
-- f9efbfc3ab022674a4038fb3e558f8cfb6cee707cc339288f1532040e5fa641b) found
-- these 4 tables live in the linked production project but created by NO
-- migration anywhere in this repository, tracked or archived. This slice
-- closes that gap for exactly these 4 tables, timestamped immediately after
-- Slice 1 (20260904060000_baseline_core_recipe_catalog_schema.sql) and
-- before every other active migration, so it runs second on a fresh replay.
--
-- set_updated_at() PREREQUISITE: public.user_preferences carries a live
-- BEFORE UPDATE trigger bound to public.set_updated_at(). That function is
-- NOT created by this migration -- Slice 1
-- (20260904060000_baseline_core_recipe_catalog_schema.sql), which runs
-- immediately before this one on any replay, already defensively creates
-- the exact final hardened public.set_updated_at() contract for its own
-- recipes trigger (see that migration's own "B0" section and header
-- comment). This migration only VERIFIES that exact contract is present
-- (same acceptance predicate Slice 1's own preflight uses for the
-- "already compatible" branch) and binds its own trigger to it -- it never
-- creates, replaces, or alters public.set_updated_at() itself. If Slice 1
-- has not run first (or set_updated_at() is otherwise absent/incompatible),
-- this migration's preflight fails closed rather than silently creating a
-- second, possibly-divergent copy of a function it does not own.
--
-- FOREIGN KEYS: every ownership FK on all 4 tables targets auth.users(id)
-- directly (ON DELETE CASCADE) -- a Supabase-managed schema, referenced but
-- never recreated. menu_plan_items additionally FKs to menu_plans(id)
-- (internal to this slice, ON DELETE CASCADE) and to recipes(id) (a Slice 1
-- table, NO ACTION). user_favorites additionally FKs to recipes(id) (ON
-- DELETE CASCADE). None of the 4 tables references public.profiles -- the
-- combined readiness audit confirmed this by full live FK enumeration and
-- full-repo code search; public.profiles (created much later by
-- 20260921054250_baseline_profiles_schema.sql) is not a prerequisite here.
--
-- ACL: the project's own pre-existing `ALTER DEFAULT PRIVILEGES FOR ROLE
-- postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon,
-- authenticated, service_role` (Supabase project template configuration,
-- NOT anything this migration sets or touches) produces, on a fresh CREATE
-- TABLE, the full 8-privilege default (DELETE, INSERT, MAINTAIN,
-- REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) for all 4 roles. The
-- audited live contract keeps that full default UNCHANGED on
-- user_favorites/user_preferences (32 ACL rows each), but has
-- anon/authenticated already narrowed to a 5-privilege subset (DELETE,
-- INSERT, MAINTAIN, SELECT, UPDATE -- i.e. missing REFERENCES, TRIGGER,
-- TRUNCATE) on menu_plans/menu_plan_items (26 ACL rows each; postgres/
-- service_role keep the full 8-privilege default there too) -- 116 raw ACL
-- rows total across the 4 tables, re-verified live this session
-- (BEGIN READ ONLY query, 2026-09-24). This is NOT a hardening pass (unlike
-- Slice 1's recipes-catalog hardening) -- it reproduces the exact
-- already-live shape, narrower on 2 tables and full-default on the other 2,
-- verbatim. On the fresh path, this migration issues explicit, static,
-- literal `REVOKE` statements (guarded, idempotent, never `ALTER DEFAULT
-- PRIVILEGES`) narrowing anon/authenticated on menu_plans/menu_plan_items
-- only, immediately after creating those two tables and their policies.
-- user_favorites/user_preferences are left at the untouched project
-- default, matching live exactly with zero ACL statements needed for them.
--
-- POLICY ROLE-SCOPING NOTE (captured verbatim, not "fixed"): menu_plans and
-- menu_plan_items policies are scoped to PostgreSQL's `public` pseudo-role
-- (applies to `anon` too) with a plain `user_id = auth.uid()` /
-- `EXISTS (... p.user_id = auth.uid())` qual and no explicit
-- `auth.uid() IS NOT NULL` guard, while user_favorites/user_preferences
-- policies are scoped to `authenticated` only with an explicit
-- `auth.uid() IS NOT NULL AND auth.uid() = user_id` guard. The combined
-- readiness audit confirmed this is a live style inconsistency, not a
-- security defect: `auth.uid()` returns NULL for any anon-role request, and
-- Postgres RLS treats a NULL policy-expression result as "not satisfied"
-- for both USING and WITH CHECK, so an anonymous caller is filtered out of
-- every row and rejected from every write on both tables regardless of the
-- different-looking boolean logic. This migration reproduces both live
-- shapes exactly as audited -- it does not re-word or harden either one.
--
-- Order of operations (matching this repository's established fail-closed
-- convention, set by Slice 1):
--   A. Read-only preflight: accept only "all 4 tables absent, and
--      set_updated_at() present in its exact final hardened shape" (fresh
--      path) or "all 4 tables present and each matches the complete
--      audited live contract" (compatible path). Any partial presence,
--      wrong relkind, wrong owner, wrong column/constraint/index/policy/
--      trigger/ACL set, any column ACL, or a missing/incompatible
--      set_updated_at() fails closed. This block performs no write.
--   B. Static creation: fresh path only, in FK-safe dependency order
--      (menu_plans -> menu_plan_items; user_favorites and user_preferences
--      are independent of both and of each other). Every CREATE is guarded
--      with IF NOT EXISTS (tables, indexes) or a guarded dynamic-SQL DO
--      block that checks pg_policies/pg_trigger existence before an
--      EXECUTE of fully static, literal DDL text (policies, the one
--      trigger); the ACL-narrowing REVOKE statements are themselves guarded
--      on a live scan for any non-expected anon/authenticated grant still
--      present on menu_plans/menu_plan_items, so they never execute at all
--      on the compatible path. No row is read or written. No DROP, no
--      CASCADE, no ALTER DEFAULT PRIVILEGES, no GRANT OPTION, no
--      catalog/user-controlled value interpolated into any dynamic SQL
--      string.
--   C. Read-only postcheck: reassert the complete final contract for every
--      object in scope -- the same full symmetric-content comparisons
--      preflight performs (not a bare count) for columns, constraints,
--      indexes, policies, and triggers, plus the complete raw ACL (all 5
--      fields: table, grantee, privilege, grantor, is_grantable) and a
--      generic zero-column-ACL scan. Fail closed on any mismatch. On an
--      exact compatible state, this migration's compatible path is
--      catalog-idempotent, not read-only: part B's guarded creation,
--      policy, and privilege operations make no catalog change, but the
--      unconditional per-table ALTER TABLE ... OWNER TO / ENABLE ROW LEVEL
--      SECURITY statements still execute on every path, including this
--      one -- a zero-net-catalog-change guarantee, not a transaction in
--      which no write-capable SQL statement executes. This block does not
--      itself capture or compare object OIDs before/after; OID stability
--      across a compatible-path no-op run is a claim for out-of-band
--      runtime verification, not this file's SQL.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching every other
-- migration in this repository -- a RAISE EXCEPTION inside a DO block rolls
-- back the whole implicit single-statement-protocol transaction.

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  target_tables      text[] := ARRAY['menu_plans','menu_plan_items','user_favorites','user_preferences'];
  tname              text;
  wrong_kind         record;
  present_count      int;
  mismatch_count     int;
  fn_count           int;
  fn_pre             record;
  fn_canonical_body  text := 'BEGIN NEW.updated_at = now(); RETURN NEW; END;';
  fn_pre_body_norm   text;
BEGIN
  -- A0. No object of any OTHER kind may occupy one of these 4 names in
  -- public -- an unexpected non-table object with a target name fails
  -- closed immediately, before absence/presence is even classified.
  FOR wrong_kind IN
    SELECT c.relname, c.relkind
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = ANY (target_tables)
       AND c.relkind NOT IN ('r','p')
  LOOP
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: public.% exists but is relkind % (expected an ordinary or partitioned table) -- refusing to proceed',
      wrong_kind.relname, wrong_kind.relkind;
  END LOOP;

  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count NOT IN (0, 4) THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: % of 4 target tables exist -- expected 0 (fresh) or 4 (compatible), refusing partial state',
      present_count;
  END IF;

  IF present_count = 4 THEN
    -- Owner must be postgres on every table.
    FOR tname IN SELECT unnest(target_tables) LOOP
      IF (SELECT pg_catalog.pg_get_userbyid(c.relowner) FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname=tname) IS DISTINCT FROM 'postgres' THEN
        RAISE EXCEPTION
          'baseline_user_plans_schema: preflight: public.% owner is not postgres -- refusing to proceed', tname;
      END IF;
    END LOOP;

    -- RLS must be enabled, not forced, on every table.
    FOR tname IN SELECT unnest(target_tables) LOOP
      IF (SELECT (c.relrowsecurity, c.relforcerowsecurity) FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname=tname) IS DISTINCT FROM (true, false) THEN
        RAISE EXCEPTION
          'baseline_user_plans_schema: preflight: public.% RLS state is not exactly enabled/not-forced -- refusing to proceed', tname;
      END IF;
    END LOOP;

    -- Exact column set: symmetric difference against the audited live
    -- contract must be empty. Fully parenthesized:
    -- (expected EXCEPT ALL actual) UNION ALL (actual EXCEPT ALL expected).
    SELECT count(*) INTO mismatch_count
    FROM (
      (
      SELECT * FROM (VALUES
        ('menu_plans',1,'id','uuid',true,'gen_random_uuid()'),
        ('menu_plans',2,'user_id','uuid',true,'NULL'),
        ('menu_plans',3,'title','text',false,'NULL'),
        ('menu_plans',4,'start_date','date',true,'NULL'),
        ('menu_plans',5,'end_date','date',true,'NULL'),
        ('menu_plans',6,'created_at','timestamp with time zone',true,'now()'),
        ('menu_plans',7,'avg_servings','integer',false,'NULL'),
        ('menu_plans',8,'item_count','integer',true,'0'),
        ('menu_plans',9,'preview_items','jsonb',true,'''[]''::jsonb'),
        ('menu_plan_items',1,'id','uuid',true,'gen_random_uuid()'),
        ('menu_plan_items',2,'menu_plan_id','uuid',true,'NULL'),
        ('menu_plan_items',3,'date','date',true,'NULL'),
        ('menu_plan_items',4,'meal_slot','text',true,'NULL'),
        ('menu_plan_items',5,'recipe_id','uuid',false,'NULL'),
        ('menu_plan_items',6,'servings','numeric',true,'1'),
        ('menu_plan_items',7,'notes','text',false,'NULL'),
        ('menu_plan_items',8,'created_at','timestamp with time zone',true,'now()'),
        ('menu_plan_items',9,'item_order','integer',true,'1'),
        ('menu_plan_items',10,'dish_role','text',false,'NULL'),
        ('menu_plan_items',11,'is_locked','boolean',true,'false'),
        ('menu_plan_items',12,'source','text',true,'''manual''::text'),
        ('user_favorites',1,'id','uuid',true,'gen_random_uuid()'),
        ('user_favorites',2,'user_id','uuid',true,'NULL'),
        ('user_favorites',3,'recipe_id','uuid',true,'NULL'),
        ('user_favorites',4,'created_at','timestamp with time zone',true,'now()'),
        ('user_preferences',1,'user_id','uuid',true,'NULL'),
        ('user_preferences',2,'default_servings','integer',true,'1'),
        ('user_preferences',3,'preferred_cuisines','text[]',true,'''{}''::text[]'),
        ('user_preferences',4,'preferred_proteins','text[]',true,'''{}''::text[]'),
        ('user_preferences',5,'excluded_ingredients','text[]',true,'''{}''::text[]'),
        ('user_preferences',6,'max_cook_time','integer',false,'NULL'),
        ('user_preferences',7,'difficulty_level','text',false,'NULL'),
        ('user_preferences',8,'created_at','timestamp with time zone',true,'now()'),
        ('user_preferences',9,'updated_at','timestamp with time zone',true,'now()'),
        ('user_preferences',10,'unit_language','text',true,'''en''::text')
      ) AS expected(tbl, attnum, attname, atttype, is_notnull, def)
      EXCEPT ALL
      SELECT c.relname, a.attnum, a.attname,
             pg_catalog.format_type(a.atttypid, a.atttypmod),
             a.attnotnull,
             COALESCE(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid), 'NULL')
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
       WHERE n.nspname='public' AND a.attnum > 0 AND NOT a.attisdropped
         AND c.relname = ANY (target_tables)
      )

      UNION ALL

      (
      SELECT c.relname, a.attnum, a.attname,
             pg_catalog.format_type(a.atttypid, a.atttypmod),
             a.attnotnull,
             COALESCE(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid), 'NULL')
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
       WHERE n.nspname='public' AND a.attnum > 0 AND NOT a.attisdropped
         AND c.relname = ANY (target_tables)
      EXCEPT ALL
      SELECT * FROM (VALUES
        ('menu_plans',1,'id','uuid',true,'gen_random_uuid()'),
        ('menu_plans',2,'user_id','uuid',true,'NULL'),
        ('menu_plans',3,'title','text',false,'NULL'),
        ('menu_plans',4,'start_date','date',true,'NULL'),
        ('menu_plans',5,'end_date','date',true,'NULL'),
        ('menu_plans',6,'created_at','timestamp with time zone',true,'now()'),
        ('menu_plans',7,'avg_servings','integer',false,'NULL'),
        ('menu_plans',8,'item_count','integer',true,'0'),
        ('menu_plans',9,'preview_items','jsonb',true,'''[]''::jsonb'),
        ('menu_plan_items',1,'id','uuid',true,'gen_random_uuid()'),
        ('menu_plan_items',2,'menu_plan_id','uuid',true,'NULL'),
        ('menu_plan_items',3,'date','date',true,'NULL'),
        ('menu_plan_items',4,'meal_slot','text',true,'NULL'),
        ('menu_plan_items',5,'recipe_id','uuid',false,'NULL'),
        ('menu_plan_items',6,'servings','numeric',true,'1'),
        ('menu_plan_items',7,'notes','text',false,'NULL'),
        ('menu_plan_items',8,'created_at','timestamp with time zone',true,'now()'),
        ('menu_plan_items',9,'item_order','integer',true,'1'),
        ('menu_plan_items',10,'dish_role','text',false,'NULL'),
        ('menu_plan_items',11,'is_locked','boolean',true,'false'),
        ('menu_plan_items',12,'source','text',true,'''manual''::text'),
        ('user_favorites',1,'id','uuid',true,'gen_random_uuid()'),
        ('user_favorites',2,'user_id','uuid',true,'NULL'),
        ('user_favorites',3,'recipe_id','uuid',true,'NULL'),
        ('user_favorites',4,'created_at','timestamp with time zone',true,'now()'),
        ('user_preferences',1,'user_id','uuid',true,'NULL'),
        ('user_preferences',2,'default_servings','integer',true,'1'),
        ('user_preferences',3,'preferred_cuisines','text[]',true,'''{}''::text[]'),
        ('user_preferences',4,'preferred_proteins','text[]',true,'''{}''::text[]'),
        ('user_preferences',5,'excluded_ingredients','text[]',true,'''{}''::text[]'),
        ('user_preferences',6,'max_cook_time','integer',false,'NULL'),
        ('user_preferences',7,'difficulty_level','text',false,'NULL'),
        ('user_preferences',8,'created_at','timestamp with time zone',true,'now()'),
        ('user_preferences',9,'updated_at','timestamp with time zone',true,'now()'),
        ('user_preferences',10,'unit_language','text',true,'''en''::text')
      ) AS expected2(tbl, attnum, attname, atttype, is_notnull, def)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: % column-row mismatches found across the 4 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Identity/generated must be empty on every column in scope (generic).
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
         AND c.relname = ANY (target_tables)
         AND (a.attidentity <> '' OR a.attgenerated <> '')
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: an identity or generated column exists among the 4 target tables -- refusing to proceed (none are audited as identity/generated)';
    END IF;

    -- Exact constraint set (name, type, definition).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT * FROM (VALUES
        ('menu_plans','menu_plans_pkey','p','PRIMARY KEY (id)'),
        ('menu_plans','menu_plans_check','c','CHECK ((end_date >= start_date))'),
        ('menu_plans','menu_plans_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('menu_plan_items','menu_plan_items_pkey','p','PRIMARY KEY (id)'),
        ('menu_plan_items','menu_plan_items_unique_slot_order','u','UNIQUE (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','menu_plan_items_menu_plan_id_fkey','f','FOREIGN KEY (menu_plan_id) REFERENCES menu_plans(id) ON DELETE CASCADE'),
        ('menu_plan_items','menu_plan_items_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id)'),
        ('menu_plan_items','menu_plan_items_dish_role_check','c','CHECK (((dish_role IS NULL) OR (dish_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
        ('menu_plan_items','menu_plan_items_item_order_check','c','CHECK ((item_order > 0))'),
        ('menu_plan_items','menu_plan_items_meal_slot_check','c','CHECK ((meal_slot = ANY (ARRAY[''breakfast''::text, ''lunch''::text, ''dinner''::text, ''snack''::text])))'),
        ('menu_plan_items','menu_plan_items_servings_check','c','CHECK ((servings > (0)::numeric))'),
        ('menu_plan_items','menu_plan_items_servings_positive','c','CHECK (((servings IS NULL) OR (servings > (0)::numeric)))'),
        ('menu_plan_items','menu_plan_items_source_check','c','CHECK ((source = ANY (ARRAY[''manual''::text, ''generated''::text, ''replaced''::text])))'),
        ('user_favorites','user_favorites_pkey','p','PRIMARY KEY (id)'),
        ('user_favorites','user_favorites_user_recipe_unique','u','UNIQUE (user_id, recipe_id)'),
        ('user_favorites','user_favorites_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('user_favorites','user_favorites_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('user_preferences','user_preferences_pkey','p','PRIMARY KEY (user_id)'),
        ('user_preferences','user_preferences_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('user_preferences','user_preferences_default_servings_check','c','CHECK ((default_servings > 0))'),
        ('user_preferences','user_preferences_difficulty_level_check','c','CHECK (((difficulty_level IS NULL) OR (difficulty_level = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text]))))'),
        ('user_preferences','user_preferences_max_cook_time_positive','c','CHECK (((max_cook_time IS NULL) OR (max_cook_time > 0)))'),
        ('user_preferences','user_preferences_unit_language_check','c','CHECK ((unit_language = ANY (ARRAY[''en''::text, ''zh''::text])))')
      ) AS expected(tbl, conname, contype, condef)
      EXCEPT ALL
      SELECT c.relname, co.conname, co.contype::text, pg_catalog.pg_get_constraintdef(co.oid)
        FROM pg_catalog.pg_constraint co
        JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
      )

      UNION ALL

      (
      SELECT c.relname, co.conname, co.contype::text, pg_catalog.pg_get_constraintdef(co.oid)
        FROM pg_catalog.pg_constraint co
        JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
      EXCEPT ALL
      SELECT * FROM (VALUES
        ('menu_plans','menu_plans_pkey','p','PRIMARY KEY (id)'),
        ('menu_plans','menu_plans_check','c','CHECK ((end_date >= start_date))'),
        ('menu_plans','menu_plans_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('menu_plan_items','menu_plan_items_pkey','p','PRIMARY KEY (id)'),
        ('menu_plan_items','menu_plan_items_unique_slot_order','u','UNIQUE (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','menu_plan_items_menu_plan_id_fkey','f','FOREIGN KEY (menu_plan_id) REFERENCES menu_plans(id) ON DELETE CASCADE'),
        ('menu_plan_items','menu_plan_items_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id)'),
        ('menu_plan_items','menu_plan_items_dish_role_check','c','CHECK (((dish_role IS NULL) OR (dish_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
        ('menu_plan_items','menu_plan_items_item_order_check','c','CHECK ((item_order > 0))'),
        ('menu_plan_items','menu_plan_items_meal_slot_check','c','CHECK ((meal_slot = ANY (ARRAY[''breakfast''::text, ''lunch''::text, ''dinner''::text, ''snack''::text])))'),
        ('menu_plan_items','menu_plan_items_servings_check','c','CHECK ((servings > (0)::numeric))'),
        ('menu_plan_items','menu_plan_items_servings_positive','c','CHECK (((servings IS NULL) OR (servings > (0)::numeric)))'),
        ('menu_plan_items','menu_plan_items_source_check','c','CHECK ((source = ANY (ARRAY[''manual''::text, ''generated''::text, ''replaced''::text])))'),
        ('user_favorites','user_favorites_pkey','p','PRIMARY KEY (id)'),
        ('user_favorites','user_favorites_user_recipe_unique','u','UNIQUE (user_id, recipe_id)'),
        ('user_favorites','user_favorites_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('user_favorites','user_favorites_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('user_preferences','user_preferences_pkey','p','PRIMARY KEY (user_id)'),
        ('user_preferences','user_preferences_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
        ('user_preferences','user_preferences_default_servings_check','c','CHECK ((default_servings > 0))'),
        ('user_preferences','user_preferences_difficulty_level_check','c','CHECK (((difficulty_level IS NULL) OR (difficulty_level = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text]))))'),
        ('user_preferences','user_preferences_max_cook_time_positive','c','CHECK (((max_cook_time IS NULL) OR (max_cook_time > 0)))'),
        ('user_preferences','user_preferences_unit_language_check','c','CHECK ((unit_language = ANY (ARRAY[''en''::text, ''zh''::text])))')
      ) AS expected2(tbl, conname, contype, condef)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: % constraint-row mismatches found across the 4 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Every FK/PK/UNIQUE must be validated, non-deferrable, non-deferred.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint co
        JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
         AND (co.convalidated IS DISTINCT FROM true
              OR co.condeferrable IS DISTINCT FROM false
              OR co.condeferred IS DISTINCT FROM false)
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: a constraint among the 4 target tables is not validated/non-deferrable/non-deferred -- refusing to proceed';
    END IF;

    -- Exact index set (table, name, def).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT * FROM (VALUES
        ('menu_plans','menu_plans_pkey','CREATE UNIQUE INDEX menu_plans_pkey ON public.menu_plans USING btree (id)'),
        ('menu_plans','idx_menu_plans_user_created','CREATE INDEX idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC)'),
        ('menu_plans','idx_menu_plans_user_created_at','CREATE INDEX idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC)'),
        ('menu_plans','idx_menu_plans_user_id','CREATE INDEX idx_menu_plans_user_id ON public.menu_plans USING btree (user_id)'),
        ('menu_plans','menu_plans_user_idx','CREATE INDEX menu_plans_user_idx ON public.menu_plans USING btree (user_id)'),
        ('menu_plan_items','menu_plan_items_pkey','CREATE UNIQUE INDEX menu_plan_items_pkey ON public.menu_plan_items USING btree (id)'),
        ('menu_plan_items','menu_plan_items_unique_slot_order','CREATE UNIQUE INDEX menu_plan_items_unique_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_locked','CREATE INDEX idx_menu_plan_items_locked ON public.menu_plan_items USING btree (is_locked)'),
        ('menu_plan_items','idx_menu_plan_items_menu_plan_date','CREATE INDEX idx_menu_plan_items_menu_plan_date ON public.menu_plan_items USING btree (menu_plan_id, date)'),
        ('menu_plan_items','idx_menu_plan_items_menu_plan_id','CREATE INDEX idx_menu_plan_items_menu_plan_id ON public.menu_plan_items USING btree (menu_plan_id)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_order','CREATE INDEX idx_menu_plan_items_plan_date_order ON public.menu_plan_items USING btree (menu_plan_id, date, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_slot','CREATE INDEX idx_menu_plan_items_plan_date_slot ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_slot_order','CREATE INDEX idx_menu_plan_items_plan_date_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_recipe_id','CREATE INDEX idx_menu_plan_items_recipe_id ON public.menu_plan_items USING btree (recipe_id)'),
        ('menu_plan_items','menu_plan_items_plan_date_idx','CREATE INDEX menu_plan_items_plan_date_idx ON public.menu_plan_items USING btree (menu_plan_id, date)'),
        ('menu_plan_items','menu_plan_items_recipe_idx','CREATE INDEX menu_plan_items_recipe_idx ON public.menu_plan_items USING btree (recipe_id)'),
        ('user_favorites','user_favorites_pkey','CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)'),
        ('user_favorites','user_favorites_user_recipe_unique','CREATE UNIQUE INDEX user_favorites_user_recipe_unique ON public.user_favorites USING btree (user_id, recipe_id)'),
        ('user_favorites','idx_user_favorites_recipe_id','CREATE INDEX idx_user_favorites_recipe_id ON public.user_favorites USING btree (recipe_id)'),
        ('user_favorites','idx_user_favorites_user_created_at','CREATE INDEX idx_user_favorites_user_created_at ON public.user_favorites USING btree (user_id, created_at DESC)'),
        ('user_favorites','idx_user_favorites_user_id','CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)'),
        ('user_preferences','user_preferences_pkey','CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id)')
      ) AS expected(tbl, idxname, idxdef)
      EXCEPT ALL
      SELECT tablename, indexname, indexdef
        FROM pg_catalog.pg_indexes
       WHERE schemaname='public' AND tablename = ANY (target_tables)
      )

      UNION ALL

      (
      SELECT tablename, indexname, indexdef
        FROM pg_catalog.pg_indexes
       WHERE schemaname='public' AND tablename = ANY (target_tables)
      EXCEPT ALL
      SELECT * FROM (VALUES
        ('menu_plans','menu_plans_pkey','CREATE UNIQUE INDEX menu_plans_pkey ON public.menu_plans USING btree (id)'),
        ('menu_plans','idx_menu_plans_user_created','CREATE INDEX idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC)'),
        ('menu_plans','idx_menu_plans_user_created_at','CREATE INDEX idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC)'),
        ('menu_plans','idx_menu_plans_user_id','CREATE INDEX idx_menu_plans_user_id ON public.menu_plans USING btree (user_id)'),
        ('menu_plans','menu_plans_user_idx','CREATE INDEX menu_plans_user_idx ON public.menu_plans USING btree (user_id)'),
        ('menu_plan_items','menu_plan_items_pkey','CREATE UNIQUE INDEX menu_plan_items_pkey ON public.menu_plan_items USING btree (id)'),
        ('menu_plan_items','menu_plan_items_unique_slot_order','CREATE UNIQUE INDEX menu_plan_items_unique_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_locked','CREATE INDEX idx_menu_plan_items_locked ON public.menu_plan_items USING btree (is_locked)'),
        ('menu_plan_items','idx_menu_plan_items_menu_plan_date','CREATE INDEX idx_menu_plan_items_menu_plan_date ON public.menu_plan_items USING btree (menu_plan_id, date)'),
        ('menu_plan_items','idx_menu_plan_items_menu_plan_id','CREATE INDEX idx_menu_plan_items_menu_plan_id ON public.menu_plan_items USING btree (menu_plan_id)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_order','CREATE INDEX idx_menu_plan_items_plan_date_order ON public.menu_plan_items USING btree (menu_plan_id, date, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_slot','CREATE INDEX idx_menu_plan_items_plan_date_slot ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot)'),
        ('menu_plan_items','idx_menu_plan_items_plan_date_slot_order','CREATE INDEX idx_menu_plan_items_plan_date_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
        ('menu_plan_items','idx_menu_plan_items_recipe_id','CREATE INDEX idx_menu_plan_items_recipe_id ON public.menu_plan_items USING btree (recipe_id)'),
        ('menu_plan_items','menu_plan_items_plan_date_idx','CREATE INDEX menu_plan_items_plan_date_idx ON public.menu_plan_items USING btree (menu_plan_id, date)'),
        ('menu_plan_items','menu_plan_items_recipe_idx','CREATE INDEX menu_plan_items_recipe_idx ON public.menu_plan_items USING btree (recipe_id)'),
        ('user_favorites','user_favorites_pkey','CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)'),
        ('user_favorites','user_favorites_user_recipe_unique','CREATE UNIQUE INDEX user_favorites_user_recipe_unique ON public.user_favorites USING btree (user_id, recipe_id)'),
        ('user_favorites','idx_user_favorites_recipe_id','CREATE INDEX idx_user_favorites_recipe_id ON public.user_favorites USING btree (recipe_id)'),
        ('user_favorites','idx_user_favorites_user_created_at','CREATE INDEX idx_user_favorites_user_created_at ON public.user_favorites USING btree (user_id, created_at DESC)'),
        ('user_favorites','idx_user_favorites_user_id','CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)'),
        ('user_preferences','user_preferences_pkey','CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id)')
      ) AS expected2(tbl, idxname, idxdef)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: % index-row mismatches found across the 4 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Exact policy set (table, name, cmd, permissive, roles, qual, with_check).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT * FROM (VALUES
        ('menu_plans','read own menu plans','SELECT','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
        ('menu_plans','insert own menu plans','INSERT','PERMISSIVE','{public}','NULL','(user_id = auth.uid())'),
        ('menu_plans','update own menu plans','UPDATE','PERMISSIVE','{public}','(user_id = auth.uid())','(user_id = auth.uid())'),
        ('menu_plans','delete own menu plans','DELETE','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
        ('menu_plan_items','read own menu plan items','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
        ('menu_plan_items','insert own menu plan items','INSERT','PERMISSIVE','{public}','NULL','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
        ('menu_plan_items','update own menu plan items','UPDATE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
        ('menu_plan_items','delete own menu plan items','DELETE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
        ('user_favorites','Users can view own favorites','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_favorites','Users can insert own favorites','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_favorites','Users can delete own favorites','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_preferences','Users can view own preferences','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_preferences','Users can insert own preferences','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_preferences','Users can update own preferences','UPDATE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_preferences','Users can delete own preferences','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL')
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
        ('menu_plans','read own menu plans','SELECT','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
        ('menu_plans','insert own menu plans','INSERT','PERMISSIVE','{public}','NULL','(user_id = auth.uid())'),
        ('menu_plans','update own menu plans','UPDATE','PERMISSIVE','{public}','(user_id = auth.uid())','(user_id = auth.uid())'),
        ('menu_plans','delete own menu plans','DELETE','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
        ('menu_plan_items','read own menu plan items','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
        ('menu_plan_items','insert own menu plan items','INSERT','PERMISSIVE','{public}','NULL','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
        ('menu_plan_items','update own menu plan items','UPDATE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
        ('menu_plan_items','delete own menu plan items','DELETE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
        ('user_favorites','Users can view own favorites','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_favorites','Users can insert own favorites','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_favorites','Users can delete own favorites','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_preferences','Users can view own preferences','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
        ('user_preferences','Users can insert own preferences','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_preferences','Users can update own preferences','UPDATE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
        ('user_preferences','Users can delete own preferences','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL')
      ) AS expected2(tbl, polname, cmd, permissive, roles, qual, withcheck)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: % policy-row mismatches found across the 4 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Exact trigger: only public.user_preferences.trg_user_preferences_updated_at,
    -- BEFORE UPDATE FOR EACH ROW, enabled, zero args, bound to set_updated_at().
    IF (SELECT count(*) FROM pg_catalog.pg_trigger t
          JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
          JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND NOT t.tgisinternal
           AND c.relname = ANY (target_tables)) <> 1 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: expected exactly 1 non-internal trigger across the 4 target tables, found a different count -- refusing to proceed';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
        JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
       WHERE n.nspname='public' AND NOT t.tgisinternal
         AND c.relname = 'user_preferences' AND t.tgname = 'trg_user_preferences_updated_at'
         AND pn.nspname = 'public' AND p.proname = 'set_updated_at'
         AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: public.user_preferences.trg_user_preferences_updated_at does not exactly match the expected BEFORE UPDATE FOR EACH ROW binding to public.set_updated_at() -- refusing to proceed';
    END IF;

    -- Exact raw ACL: full 5-field identity (table, grantee, privilege,
    -- grantor, is_grantable), 116 rows total -- menu_plans/menu_plan_items
    -- narrowed (anon/authenticated: 5-privilege subset, postgres/
    -- service_role: full 8), user_favorites/user_preferences untouched
    -- (all 4 roles: full 8). Fully parenthesized symmetric diff.
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
        FROM (
          SELECT t, r, p
            FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
                 unnest(ARRAY['anon','authenticated']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','SELECT','UPDATE']) AS p
          UNION ALL
          SELECT t, r, p
            FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
                 unnest(ARRAY['postgres','service_role']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
          UNION ALL
          SELECT t, r, p
            FROM unnest(ARRAY['user_favorites','user_preferences']) AS t,
                 unnest(ARRAY['anon','authenticated','postgres','service_role']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
        ) AS expected(tbl, grantee, priv)
      EXCEPT ALL
      SELECT c.relname,
             (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
             a.privilege_type,
             (CASE WHEN a.grantor=0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
             a.is_grantable
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
      )

      UNION ALL

      (
      SELECT c.relname,
             (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
             a.privilege_type,
             (CASE WHEN a.grantor=0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
             a.is_grantable
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
      EXCEPT ALL
      SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
        FROM (
          SELECT t, r, p
            FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
                 unnest(ARRAY['anon','authenticated']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','SELECT','UPDATE']) AS p
          UNION ALL
          SELECT t, r, p
            FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
                 unnest(ARRAY['postgres','service_role']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
          UNION ALL
          SELECT t, r, p
            FROM unnest(ARRAY['user_favorites','user_preferences']) AS t,
                 unnest(ARRAY['anon','authenticated','postgres','service_role']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
        ) AS expected2(tbl, grantee, priv)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: % raw-ACL-row mismatches found across the 4 target tables (expected exactly the 116-row live contract) -- refusing to proceed',
        mismatch_count;
    END IF;

    -- No unrecognized grantee anywhere among the 4 tables' ACL (defense in
    -- depth; the symmetric diff above already pins every grantee).
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
         AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END) NOT IN ('anon','authenticated','postgres','service_role')
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: an ACL row among the 4 target tables has an unrecognized grantee -- refusing to proceed';
    END IF;

    -- Zero column ACL anywhere in scope.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
         AND c.relname = ANY (target_tables) AND a.attacl IS NOT NULL
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: preflight: a column ACL exists among the 4 target tables -- refusing to proceed (none are audited)';
    END IF;
  END IF;

  -- set_updated_at() prerequisite: must already exist in exactly the final
  -- hardened shape Slice 1 creates -- this migration never creates or
  -- replaces it. Absent, wrong shape, or more than 1 match fails closed.
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: expected exactly 1 public.set_updated_at (created by Slice 1, a required prior prerequisite this migration does not create), found % -- refusing to proceed',
      fn_count;
  END IF;

  SELECT p.prokind, p.pronargs,
         pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL) AS rettype,
         p.proretset, l.lanname, p.prosecdef, p.provolatile, p.proisstrict,
         p.proparallel, p.proleakproof, pg_catalog.pg_get_userbyid(p.proowner) AS owner,
         p.proconfig,
         pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
           pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g'),
           'pg_catalog\.now\(\)', 'now()', 'gi'), '^\s+|\s+$', '', 'g')) AS body_norm
    INTO fn_pre
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  fn_pre_body_norm := fn_pre.body_norm;

  IF fn_pre.prokind IS DISTINCT FROM 'f'
     OR fn_pre.pronargs IS DISTINCT FROM 0
     OR fn_pre.identity_args IS DISTINCT FROM ''
     OR fn_pre.rettype IS DISTINCT FROM 'trigger'
     OR fn_pre.proretset IS DISTINCT FROM false
     OR fn_pre.lanname IS DISTINCT FROM 'plpgsql'
     OR fn_pre.prosecdef IS DISTINCT FROM false
     OR fn_pre.provolatile IS DISTINCT FROM 'v'
     OR fn_pre.proisstrict IS DISTINCT FROM false
     OR fn_pre.proparallel IS DISTINCT FROM 'u'
     OR fn_pre.proleakproof IS DISTINCT FROM false
     OR fn_pre.owner IS DISTINCT FROM 'postgres'
  THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: public.set_updated_at exists but does not match the required properties (kind/args/rettype/retset/lang/secdef/volatility/strict/parallel/leakproof/owner) -- refusing to proceed';
  END IF;

  IF NOT (
    fn_pre.proconfig IS NULL
    OR (pg_catalog.array_length(fn_pre.proconfig, 1) = 1
        AND 'search_path=pg_catalog' = ANY (fn_pre.proconfig))
  ) THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: public.set_updated_at proconfig is % -- expected NULL or exactly {search_path=pg_catalog} -- refusing to proceed',
      fn_pre.proconfig;
  END IF;

  IF fn_pre_body_norm IS DISTINCT FROM fn_canonical_body THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: preflight: public.set_updated_at body does not match the canonical NEW.updated_at = now(); RETURN NEW; definition -- refusing to proceed (normalized body: %)',
      fn_pre_body_norm;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Static creation -- fresh path only (compatible path: nothing further
--    to do, every statement below is natively idempotent via IF NOT EXISTS
--    or its own existence guard).
-- ============================================================================

-- B1. menu_plans -- no FK dependency within this slice (user_id references
-- auth.users, a Supabase-managed schema, referenced but not recreated).
CREATE TABLE IF NOT EXISTS public.menu_plans (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  title          text,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  avg_servings   integer,
  item_count     integer NOT NULL DEFAULT 0,
  preview_items  jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT menu_plans_pkey PRIMARY KEY (id),
  CONSTRAINT menu_plans_check CHECK (end_date >= start_date),
  CONSTRAINT menu_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.menu_plans OWNER TO postgres;
ALTER TABLE public.menu_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_plans_user_id ON public.menu_plans USING btree (user_id);
CREATE INDEX IF NOT EXISTS menu_plans_user_idx ON public.menu_plans USING btree (user_id);

COMMENT ON COLUMN public.menu_plans.avg_servings IS 'Cached average servings for my-plans list card';
COMMENT ON COLUMN public.menu_plans.item_count IS 'Cached total menu_plan_items count for my-plans list card';
COMMENT ON COLUMN public.menu_plans.preview_items IS 'Cached first-day preview items for my-plans list card. JSON array, max 2 items.';

-- B2. menu_plan_items -- depends on menu_plans (internal FK) and recipes
-- (a Slice 1 table, already live).
CREATE TABLE IF NOT EXISTS public.menu_plan_items (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  menu_plan_id   uuid NOT NULL,
  date           date NOT NULL,
  meal_slot      text NOT NULL,
  recipe_id      uuid,
  servings       numeric NOT NULL DEFAULT 1,
  notes          text,
  created_at     timestamp with time zone NOT NULL DEFAULT now(),
  item_order     integer NOT NULL DEFAULT 1,
  dish_role      text,
  is_locked      boolean NOT NULL DEFAULT false,
  source         text NOT NULL DEFAULT 'manual'::text,
  CONSTRAINT menu_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT menu_plan_items_unique_slot_order UNIQUE (menu_plan_id, date, meal_slot, item_order),
  CONSTRAINT menu_plan_items_menu_plan_id_fkey FOREIGN KEY (menu_plan_id) REFERENCES public.menu_plans(id) ON DELETE CASCADE,
  CONSTRAINT menu_plan_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id),
  CONSTRAINT menu_plan_items_dish_role_check CHECK (dish_role IS NULL OR dish_role = ANY (ARRAY['complete_meal'::text,'protein_main'::text,'veg_side'::text,'protein_side'::text,'soup'::text])),
  CONSTRAINT menu_plan_items_item_order_check CHECK (item_order > 0),
  CONSTRAINT menu_plan_items_meal_slot_check CHECK (meal_slot = ANY (ARRAY['breakfast'::text,'lunch'::text,'dinner'::text,'snack'::text])),
  CONSTRAINT menu_plan_items_servings_check CHECK (servings > (0)::numeric),
  CONSTRAINT menu_plan_items_servings_positive CHECK (servings IS NULL OR servings > (0)::numeric),
  CONSTRAINT menu_plan_items_source_check CHECK (source = ANY (ARRAY['manual'::text,'generated'::text,'replaced'::text]))
);
ALTER TABLE public.menu_plan_items OWNER TO postgres;
ALTER TABLE public.menu_plan_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_locked ON public.menu_plan_items USING btree (is_locked);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_menu_plan_date ON public.menu_plan_items USING btree (menu_plan_id, date);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_menu_plan_id ON public.menu_plan_items USING btree (menu_plan_id);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_plan_date_order ON public.menu_plan_items USING btree (menu_plan_id, date, item_order);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_plan_date_slot ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_plan_date_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order);
CREATE INDEX IF NOT EXISTS idx_menu_plan_items_recipe_id ON public.menu_plan_items USING btree (recipe_id);
CREATE INDEX IF NOT EXISTS menu_plan_items_plan_date_idx ON public.menu_plan_items USING btree (menu_plan_id, date);
CREATE INDEX IF NOT EXISTS menu_plan_items_recipe_idx ON public.menu_plan_items USING btree (recipe_id);

-- B3. user_favorites -- depends on recipes (Slice 1) and auth.users.
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  recipe_id    uuid NOT NULL,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_recipe_unique UNIQUE (user_id, recipe_id),
  CONSTRAINT user_favorites_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.user_favorites OWNER TO postgres;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe_id ON public.user_favorites USING btree (recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created_at ON public.user_favorites USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites USING btree (user_id);

COMMENT ON TABLE public.user_favorites IS 'User favorite recipes';
COMMENT ON COLUMN public.user_favorites.user_id IS 'Owner of the favorite record';
COMMENT ON COLUMN public.user_favorites.recipe_id IS 'Favorited recipe id';

-- B4. user_preferences -- depends on auth.users only. PK is user_id itself
-- (no surrogate id column) -- confirmed live, and confirmed divergent from
-- the archived (non-authoritative) legacy definition by the combined
-- readiness audit.
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id                uuid NOT NULL,
  default_servings       integer NOT NULL DEFAULT 1,
  preferred_cuisines     text[] NOT NULL DEFAULT '{}'::text[],
  preferred_proteins     text[] NOT NULL DEFAULT '{}'::text[],
  excluded_ingredients   text[] NOT NULL DEFAULT '{}'::text[],
  max_cook_time          integer,
  difficulty_level       text,
  created_at             timestamp with time zone NOT NULL DEFAULT now(),
  updated_at             timestamp with time zone NOT NULL DEFAULT now(),
  unit_language          text NOT NULL DEFAULT 'en'::text,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_preferences_default_servings_check CHECK (default_servings > 0),
  CONSTRAINT user_preferences_difficulty_level_check CHECK (difficulty_level IS NULL OR difficulty_level = ANY (ARRAY['easy'::text,'medium'::text,'hard'::text])),
  CONSTRAINT user_preferences_max_cook_time_positive CHECK (max_cook_time IS NULL OR max_cook_time > 0),
  CONSTRAINT user_preferences_unit_language_check CHECK (unit_language = ANY (ARRAY['en'::text,'zh'::text]))
);
ALTER TABLE public.user_preferences OWNER TO postgres;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_preferences IS 'Per-user saved cooking and planning preferences';
COMMENT ON COLUMN public.user_preferences.default_servings IS 'PrepMeal default serving size, currently 1 by default';
COMMENT ON COLUMN public.user_preferences.preferred_cuisines IS 'Preferred cuisine tags';
COMMENT ON COLUMN public.user_preferences.preferred_proteins IS 'Preferred protein tags';
COMMENT ON COLUMN public.user_preferences.excluded_ingredients IS 'Ingredients user wants to avoid';
COMMENT ON COLUMN public.user_preferences.max_cook_time IS 'Preferred maximum cooking time in minutes';
COMMENT ON COLUMN public.user_preferences.difficulty_level IS 'Preferred difficulty: easy, medium, hard';

-- user_preferences' own updated_at trigger, guarded (CREATE TRIGGER has no
-- native IF NOT EXISTS) -- fully static literal DDL text, no interpolation.
-- Binds to public.set_updated_at(), verified present in preflight above
-- (created by Slice 1, not by this migration).
DO $create_user_preferences_trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'user_preferences'
       AND t.tgname = 'trg_user_preferences_updated_at' AND NOT t.tgisinternal
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER trg_user_preferences_updated_at
        BEFORE UPDATE ON public.user_preferences
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $sql$;
  END IF;
END;
$create_user_preferences_trigger$;

-- B5. Policies -- guarded (CREATE POLICY has no native IF NOT EXISTS).
-- Every EXECUTE body below is fully static literal DDL text. Reproduces
-- both live role-scoping shapes exactly (see header note): menu_plans/
-- menu_plan_items use `public`-scoped policies, user_favorites/
-- user_preferences use `authenticated`-scoped policies with an explicit
-- auth.uid() IS NOT NULL guard.
DO $create_policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plans' AND policyname='read own menu plans') THEN
    EXECUTE $sql$ CREATE POLICY "read own menu plans" ON public.menu_plans FOR SELECT USING (user_id = auth.uid()) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plans' AND policyname='insert own menu plans') THEN
    EXECUTE $sql$ CREATE POLICY "insert own menu plans" ON public.menu_plans FOR INSERT WITH CHECK (user_id = auth.uid()) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plans' AND policyname='update own menu plans') THEN
    EXECUTE $sql$ CREATE POLICY "update own menu plans" ON public.menu_plans FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plans' AND policyname='delete own menu plans') THEN
    EXECUTE $sql$ CREATE POLICY "delete own menu plans" ON public.menu_plans FOR DELETE USING (user_id = auth.uid()) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plan_items' AND policyname='read own menu plan items') THEN
    EXECUTE $sql$ CREATE POLICY "read own menu plan items" ON public.menu_plan_items FOR SELECT USING (EXISTS (SELECT 1 FROM menu_plans p WHERE p.id = menu_plan_items.menu_plan_id AND p.user_id = auth.uid())) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plan_items' AND policyname='insert own menu plan items') THEN
    EXECUTE $sql$ CREATE POLICY "insert own menu plan items" ON public.menu_plan_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM menu_plans p WHERE p.id = menu_plan_items.menu_plan_id AND p.user_id = auth.uid())) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plan_items' AND policyname='update own menu plan items') THEN
    EXECUTE $sql$ CREATE POLICY "update own menu plan items" ON public.menu_plan_items FOR UPDATE USING (EXISTS (SELECT 1 FROM menu_plans p WHERE p.id = menu_plan_items.menu_plan_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM menu_plans p WHERE p.id = menu_plan_items.menu_plan_id AND p.user_id = auth.uid())) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='menu_plan_items' AND policyname='delete own menu plan items') THEN
    EXECUTE $sql$ CREATE POLICY "delete own menu plan items" ON public.menu_plan_items FOR DELETE USING (EXISTS (SELECT 1 FROM menu_plans p WHERE p.id = menu_plan_items.menu_plan_id AND p.user_id = auth.uid())) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='Users can view own favorites') THEN
    EXECUTE $sql$ CREATE POLICY "Users can view own favorites" ON public.user_favorites FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='Users can insert own favorites') THEN
    EXECUTE $sql$ CREATE POLICY "Users can insert own favorites" ON public.user_favorites FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_favorites' AND policyname='Users can delete own favorites') THEN
    EXECUTE $sql$ CREATE POLICY "Users can delete own favorites" ON public.user_favorites FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can view own preferences') THEN
    EXECUTE $sql$ CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can insert own preferences') THEN
    EXECUTE $sql$ CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can update own preferences') THEN
    EXECUTE $sql$ CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='user_preferences' AND policyname='Users can delete own preferences') THEN
    EXECUTE $sql$ CREATE POLICY "Users can delete own preferences" ON public.user_preferences FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id) $sql$;
  END IF;
END;
$create_policies$;

-- B6. ACL narrowing -- menu_plans/menu_plan_items ONLY. The project's own
-- pre-existing `ALTER DEFAULT PRIVILEGES` (not touched by this migration)
-- grants the full 8-privilege default to all 4 roles on any table freshly
-- created by postgres. The audited live contract keeps that full default
-- on user_favorites/user_preferences (no REVOKE needed for them at all),
-- but narrows anon/authenticated to a 5-privilege subset (missing
-- TRUNCATE, REFERENCES, TRIGGER) on menu_plans/menu_plan_items only. This
-- guarded block reproduces that exact live narrowing via static, literal
-- REVOKE statements. The guard checks whether either table's anon/
-- authenticated ACL still carries a non-expected privilege; if not (i.e.
-- this is the compatible path re-running against the already-live
-- database), the EXECUTE calls below never run at all -- true zero writes
-- on the compatible path, not merely idempotent no-op writes.
DO $narrow_acl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
           pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     WHERE n.nspname='public'
       AND c.relname = ANY (ARRAY['menu_plans','menu_plan_items'])
       AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END) IN ('anon','authenticated')
       AND a.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER')
  ) THEN
    EXECUTE $sql$ REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.menu_plans FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.menu_plan_items FROM anon, authenticated $sql$;
  END IF;
END;
$narrow_acl$;

-- The postcheck below verifies the resulting 116-row live ACL explicitly
-- rather than assuming either the environment default or this block's own
-- REVOKE calls held.

-- ============================================================================
-- C. Read-only postcondition -- reassert the complete final contract for
--    every object in scope. Fail closed on any mismatch.
-- ============================================================================
DO $postcheck$
DECLARE
  target_tables   text[] := ARRAY['menu_plans','menu_plan_items','user_favorites','user_preferences'];
  present_count   int;
  mismatch_count  int;
  fn_count        int;
BEGIN
  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count <> 4 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: expected exactly 4 target tables to exist after this migration, found % -- rolling back',
      present_count;
  END IF;

  SELECT count(*) INTO mismatch_count
  FROM (
    (
    SELECT * FROM (VALUES
      ('menu_plans',1,'id','uuid',true,'gen_random_uuid()'),
      ('menu_plans',2,'user_id','uuid',true,'NULL'),
      ('menu_plans',3,'title','text',false,'NULL'),
      ('menu_plans',4,'start_date','date',true,'NULL'),
      ('menu_plans',5,'end_date','date',true,'NULL'),
      ('menu_plans',6,'created_at','timestamp with time zone',true,'now()'),
      ('menu_plans',7,'avg_servings','integer',false,'NULL'),
      ('menu_plans',8,'item_count','integer',true,'0'),
      ('menu_plans',9,'preview_items','jsonb',true,'''[]''::jsonb'),
      ('menu_plan_items',1,'id','uuid',true,'gen_random_uuid()'),
      ('menu_plan_items',2,'menu_plan_id','uuid',true,'NULL'),
      ('menu_plan_items',3,'date','date',true,'NULL'),
      ('menu_plan_items',4,'meal_slot','text',true,'NULL'),
      ('menu_plan_items',5,'recipe_id','uuid',false,'NULL'),
      ('menu_plan_items',6,'servings','numeric',true,'1'),
      ('menu_plan_items',7,'notes','text',false,'NULL'),
      ('menu_plan_items',8,'created_at','timestamp with time zone',true,'now()'),
      ('menu_plan_items',9,'item_order','integer',true,'1'),
      ('menu_plan_items',10,'dish_role','text',false,'NULL'),
      ('menu_plan_items',11,'is_locked','boolean',true,'false'),
      ('menu_plan_items',12,'source','text',true,'''manual''::text'),
      ('user_favorites',1,'id','uuid',true,'gen_random_uuid()'),
      ('user_favorites',2,'user_id','uuid',true,'NULL'),
      ('user_favorites',3,'recipe_id','uuid',true,'NULL'),
      ('user_favorites',4,'created_at','timestamp with time zone',true,'now()'),
      ('user_preferences',1,'user_id','uuid',true,'NULL'),
      ('user_preferences',2,'default_servings','integer',true,'1'),
      ('user_preferences',3,'preferred_cuisines','text[]',true,'''{}''::text[]'),
      ('user_preferences',4,'preferred_proteins','text[]',true,'''{}''::text[]'),
      ('user_preferences',5,'excluded_ingredients','text[]',true,'''{}''::text[]'),
      ('user_preferences',6,'max_cook_time','integer',false,'NULL'),
      ('user_preferences',7,'difficulty_level','text',false,'NULL'),
      ('user_preferences',8,'created_at','timestamp with time zone',true,'now()'),
      ('user_preferences',9,'updated_at','timestamp with time zone',true,'now()'),
      ('user_preferences',10,'unit_language','text',true,'''en''::text')
    ) AS expected(tbl, attnum, attname, atttype, is_notnull, def)
    EXCEPT ALL
    SELECT c.relname, a.attnum, a.attname,
           pg_catalog.format_type(a.atttypid, a.atttypmod),
           a.attnotnull,
           COALESCE(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid), 'NULL')
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE n.nspname='public' AND a.attnum > 0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT c.relname, a.attnum, a.attname,
           pg_catalog.format_type(a.atttypid, a.atttypmod),
           a.attnotnull,
           COALESCE(pg_catalog.pg_get_expr(ad.adbin, ad.adrelid), 'NULL')
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
     WHERE n.nspname='public' AND a.attnum > 0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('menu_plans',1,'id','uuid',true,'gen_random_uuid()'),
      ('menu_plans',2,'user_id','uuid',true,'NULL'),
      ('menu_plans',3,'title','text',false,'NULL'),
      ('menu_plans',4,'start_date','date',true,'NULL'),
      ('menu_plans',5,'end_date','date',true,'NULL'),
      ('menu_plans',6,'created_at','timestamp with time zone',true,'now()'),
      ('menu_plans',7,'avg_servings','integer',false,'NULL'),
      ('menu_plans',8,'item_count','integer',true,'0'),
      ('menu_plans',9,'preview_items','jsonb',true,'''[]''::jsonb'),
      ('menu_plan_items',1,'id','uuid',true,'gen_random_uuid()'),
      ('menu_plan_items',2,'menu_plan_id','uuid',true,'NULL'),
      ('menu_plan_items',3,'date','date',true,'NULL'),
      ('menu_plan_items',4,'meal_slot','text',true,'NULL'),
      ('menu_plan_items',5,'recipe_id','uuid',false,'NULL'),
      ('menu_plan_items',6,'servings','numeric',true,'1'),
      ('menu_plan_items',7,'notes','text',false,'NULL'),
      ('menu_plan_items',8,'created_at','timestamp with time zone',true,'now()'),
      ('menu_plan_items',9,'item_order','integer',true,'1'),
      ('menu_plan_items',10,'dish_role','text',false,'NULL'),
      ('menu_plan_items',11,'is_locked','boolean',true,'false'),
      ('menu_plan_items',12,'source','text',true,'''manual''::text'),
      ('user_favorites',1,'id','uuid',true,'gen_random_uuid()'),
      ('user_favorites',2,'user_id','uuid',true,'NULL'),
      ('user_favorites',3,'recipe_id','uuid',true,'NULL'),
      ('user_favorites',4,'created_at','timestamp with time zone',true,'now()'),
      ('user_preferences',1,'user_id','uuid',true,'NULL'),
      ('user_preferences',2,'default_servings','integer',true,'1'),
      ('user_preferences',3,'preferred_cuisines','text[]',true,'''{}''::text[]'),
      ('user_preferences',4,'preferred_proteins','text[]',true,'''{}''::text[]'),
      ('user_preferences',5,'excluded_ingredients','text[]',true,'''{}''::text[]'),
      ('user_preferences',6,'max_cook_time','integer',false,'NULL'),
      ('user_preferences',7,'difficulty_level','text',false,'NULL'),
      ('user_preferences',8,'created_at','timestamp with time zone',true,'now()'),
      ('user_preferences',9,'updated_at','timestamp with time zone',true,'now()'),
      ('user_preferences',10,'unit_language','text',true,'''en''::text')
    ) AS expected2(tbl, attnum, attname, atttype, is_notnull, def)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: % column-row mismatches found across the 4 target tables -- rolling back',
      mismatch_count;
  END IF;

  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT * FROM (VALUES
      ('menu_plans','menu_plans_pkey','p','PRIMARY KEY (id)'),
      ('menu_plans','menu_plans_check','c','CHECK ((end_date >= start_date))'),
      ('menu_plans','menu_plans_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('menu_plan_items','menu_plan_items_pkey','p','PRIMARY KEY (id)'),
      ('menu_plan_items','menu_plan_items_unique_slot_order','u','UNIQUE (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','menu_plan_items_menu_plan_id_fkey','f','FOREIGN KEY (menu_plan_id) REFERENCES menu_plans(id) ON DELETE CASCADE'),
      ('menu_plan_items','menu_plan_items_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id)'),
      ('menu_plan_items','menu_plan_items_dish_role_check','c','CHECK (((dish_role IS NULL) OR (dish_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
      ('menu_plan_items','menu_plan_items_item_order_check','c','CHECK ((item_order > 0))'),
      ('menu_plan_items','menu_plan_items_meal_slot_check','c','CHECK ((meal_slot = ANY (ARRAY[''breakfast''::text, ''lunch''::text, ''dinner''::text, ''snack''::text])))'),
      ('menu_plan_items','menu_plan_items_servings_check','c','CHECK ((servings > (0)::numeric))'),
      ('menu_plan_items','menu_plan_items_servings_positive','c','CHECK (((servings IS NULL) OR (servings > (0)::numeric)))'),
      ('menu_plan_items','menu_plan_items_source_check','c','CHECK ((source = ANY (ARRAY[''manual''::text, ''generated''::text, ''replaced''::text])))'),
      ('user_favorites','user_favorites_pkey','p','PRIMARY KEY (id)'),
      ('user_favorites','user_favorites_user_recipe_unique','u','UNIQUE (user_id, recipe_id)'),
      ('user_favorites','user_favorites_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('user_favorites','user_favorites_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('user_preferences','user_preferences_pkey','p','PRIMARY KEY (user_id)'),
      ('user_preferences','user_preferences_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('user_preferences','user_preferences_default_servings_check','c','CHECK ((default_servings > 0))'),
      ('user_preferences','user_preferences_difficulty_level_check','c','CHECK (((difficulty_level IS NULL) OR (difficulty_level = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text]))))'),
      ('user_preferences','user_preferences_max_cook_time_positive','c','CHECK (((max_cook_time IS NULL) OR (max_cook_time > 0)))'),
      ('user_preferences','user_preferences_unit_language_check','c','CHECK ((unit_language = ANY (ARRAY[''en''::text, ''zh''::text])))')
    ) AS expected(tbl, conname, contype, condef)
    EXCEPT ALL
    SELECT c.relname, co.conname, co.contype::text, pg_catalog.pg_get_constraintdef(co.oid)
      FROM pg_catalog.pg_constraint co
      JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT c.relname, co.conname, co.contype::text, pg_catalog.pg_get_constraintdef(co.oid)
      FROM pg_catalog.pg_constraint co
      JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('menu_plans','menu_plans_pkey','p','PRIMARY KEY (id)'),
      ('menu_plans','menu_plans_check','c','CHECK ((end_date >= start_date))'),
      ('menu_plans','menu_plans_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('menu_plan_items','menu_plan_items_pkey','p','PRIMARY KEY (id)'),
      ('menu_plan_items','menu_plan_items_unique_slot_order','u','UNIQUE (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','menu_plan_items_menu_plan_id_fkey','f','FOREIGN KEY (menu_plan_id) REFERENCES menu_plans(id) ON DELETE CASCADE'),
      ('menu_plan_items','menu_plan_items_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id)'),
      ('menu_plan_items','menu_plan_items_dish_role_check','c','CHECK (((dish_role IS NULL) OR (dish_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
      ('menu_plan_items','menu_plan_items_item_order_check','c','CHECK ((item_order > 0))'),
      ('menu_plan_items','menu_plan_items_meal_slot_check','c','CHECK ((meal_slot = ANY (ARRAY[''breakfast''::text, ''lunch''::text, ''dinner''::text, ''snack''::text])))'),
      ('menu_plan_items','menu_plan_items_servings_check','c','CHECK ((servings > (0)::numeric))'),
      ('menu_plan_items','menu_plan_items_servings_positive','c','CHECK (((servings IS NULL) OR (servings > (0)::numeric)))'),
      ('menu_plan_items','menu_plan_items_source_check','c','CHECK ((source = ANY (ARRAY[''manual''::text, ''generated''::text, ''replaced''::text])))'),
      ('user_favorites','user_favorites_pkey','p','PRIMARY KEY (id)'),
      ('user_favorites','user_favorites_user_recipe_unique','u','UNIQUE (user_id, recipe_id)'),
      ('user_favorites','user_favorites_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('user_favorites','user_favorites_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('user_preferences','user_preferences_pkey','p','PRIMARY KEY (user_id)'),
      ('user_preferences','user_preferences_user_id_fkey','f','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('user_preferences','user_preferences_default_servings_check','c','CHECK ((default_servings > 0))'),
      ('user_preferences','user_preferences_difficulty_level_check','c','CHECK (((difficulty_level IS NULL) OR (difficulty_level = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text]))))'),
      ('user_preferences','user_preferences_max_cook_time_positive','c','CHECK (((max_cook_time IS NULL) OR (max_cook_time > 0)))'),
      ('user_preferences','user_preferences_unit_language_check','c','CHECK ((unit_language = ANY (ARRAY[''en''::text, ''zh''::text])))')
    ) AS expected2(tbl, conname, contype, condef)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: % constraint-row mismatches found across the 4 target tables -- rolling back',
      mismatch_count;
  END IF;

  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT * FROM (VALUES
      ('menu_plans','menu_plans_pkey','CREATE UNIQUE INDEX menu_plans_pkey ON public.menu_plans USING btree (id)'),
      ('menu_plans','idx_menu_plans_user_created','CREATE INDEX idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC)'),
      ('menu_plans','idx_menu_plans_user_created_at','CREATE INDEX idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC)'),
      ('menu_plans','idx_menu_plans_user_id','CREATE INDEX idx_menu_plans_user_id ON public.menu_plans USING btree (user_id)'),
      ('menu_plans','menu_plans_user_idx','CREATE INDEX menu_plans_user_idx ON public.menu_plans USING btree (user_id)'),
      ('menu_plan_items','menu_plan_items_pkey','CREATE UNIQUE INDEX menu_plan_items_pkey ON public.menu_plan_items USING btree (id)'),
      ('menu_plan_items','menu_plan_items_unique_slot_order','CREATE UNIQUE INDEX menu_plan_items_unique_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_locked','CREATE INDEX idx_menu_plan_items_locked ON public.menu_plan_items USING btree (is_locked)'),
      ('menu_plan_items','idx_menu_plan_items_menu_plan_date','CREATE INDEX idx_menu_plan_items_menu_plan_date ON public.menu_plan_items USING btree (menu_plan_id, date)'),
      ('menu_plan_items','idx_menu_plan_items_menu_plan_id','CREATE INDEX idx_menu_plan_items_menu_plan_id ON public.menu_plan_items USING btree (menu_plan_id)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_order','CREATE INDEX idx_menu_plan_items_plan_date_order ON public.menu_plan_items USING btree (menu_plan_id, date, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_slot','CREATE INDEX idx_menu_plan_items_plan_date_slot ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_slot_order','CREATE INDEX idx_menu_plan_items_plan_date_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_recipe_id','CREATE INDEX idx_menu_plan_items_recipe_id ON public.menu_plan_items USING btree (recipe_id)'),
      ('menu_plan_items','menu_plan_items_plan_date_idx','CREATE INDEX menu_plan_items_plan_date_idx ON public.menu_plan_items USING btree (menu_plan_id, date)'),
      ('menu_plan_items','menu_plan_items_recipe_idx','CREATE INDEX menu_plan_items_recipe_idx ON public.menu_plan_items USING btree (recipe_id)'),
      ('user_favorites','user_favorites_pkey','CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)'),
      ('user_favorites','user_favorites_user_recipe_unique','CREATE UNIQUE INDEX user_favorites_user_recipe_unique ON public.user_favorites USING btree (user_id, recipe_id)'),
      ('user_favorites','idx_user_favorites_recipe_id','CREATE INDEX idx_user_favorites_recipe_id ON public.user_favorites USING btree (recipe_id)'),
      ('user_favorites','idx_user_favorites_user_created_at','CREATE INDEX idx_user_favorites_user_created_at ON public.user_favorites USING btree (user_id, created_at DESC)'),
      ('user_favorites','idx_user_favorites_user_id','CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)'),
      ('user_preferences','user_preferences_pkey','CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id)')
    ) AS expected(tbl, idxname, idxdef)
    EXCEPT ALL
    SELECT tablename, indexname, indexdef
      FROM pg_catalog.pg_indexes
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT tablename, indexname, indexdef
      FROM pg_catalog.pg_indexes
     WHERE schemaname='public' AND tablename = ANY (target_tables)
    EXCEPT ALL
    SELECT * FROM (VALUES
      ('menu_plans','menu_plans_pkey','CREATE UNIQUE INDEX menu_plans_pkey ON public.menu_plans USING btree (id)'),
      ('menu_plans','idx_menu_plans_user_created','CREATE INDEX idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC)'),
      ('menu_plans','idx_menu_plans_user_created_at','CREATE INDEX idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC)'),
      ('menu_plans','idx_menu_plans_user_id','CREATE INDEX idx_menu_plans_user_id ON public.menu_plans USING btree (user_id)'),
      ('menu_plans','menu_plans_user_idx','CREATE INDEX menu_plans_user_idx ON public.menu_plans USING btree (user_id)'),
      ('menu_plan_items','menu_plan_items_pkey','CREATE UNIQUE INDEX menu_plan_items_pkey ON public.menu_plan_items USING btree (id)'),
      ('menu_plan_items','menu_plan_items_unique_slot_order','CREATE UNIQUE INDEX menu_plan_items_unique_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_locked','CREATE INDEX idx_menu_plan_items_locked ON public.menu_plan_items USING btree (is_locked)'),
      ('menu_plan_items','idx_menu_plan_items_menu_plan_date','CREATE INDEX idx_menu_plan_items_menu_plan_date ON public.menu_plan_items USING btree (menu_plan_id, date)'),
      ('menu_plan_items','idx_menu_plan_items_menu_plan_id','CREATE INDEX idx_menu_plan_items_menu_plan_id ON public.menu_plan_items USING btree (menu_plan_id)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_order','CREATE INDEX idx_menu_plan_items_plan_date_order ON public.menu_plan_items USING btree (menu_plan_id, date, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_slot','CREATE INDEX idx_menu_plan_items_plan_date_slot ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot)'),
      ('menu_plan_items','idx_menu_plan_items_plan_date_slot_order','CREATE INDEX idx_menu_plan_items_plan_date_slot_order ON public.menu_plan_items USING btree (menu_plan_id, date, meal_slot, item_order)'),
      ('menu_plan_items','idx_menu_plan_items_recipe_id','CREATE INDEX idx_menu_plan_items_recipe_id ON public.menu_plan_items USING btree (recipe_id)'),
      ('menu_plan_items','menu_plan_items_plan_date_idx','CREATE INDEX menu_plan_items_plan_date_idx ON public.menu_plan_items USING btree (menu_plan_id, date)'),
      ('menu_plan_items','menu_plan_items_recipe_idx','CREATE INDEX menu_plan_items_recipe_idx ON public.menu_plan_items USING btree (recipe_id)'),
      ('user_favorites','user_favorites_pkey','CREATE UNIQUE INDEX user_favorites_pkey ON public.user_favorites USING btree (id)'),
      ('user_favorites','user_favorites_user_recipe_unique','CREATE UNIQUE INDEX user_favorites_user_recipe_unique ON public.user_favorites USING btree (user_id, recipe_id)'),
      ('user_favorites','idx_user_favorites_recipe_id','CREATE INDEX idx_user_favorites_recipe_id ON public.user_favorites USING btree (recipe_id)'),
      ('user_favorites','idx_user_favorites_user_created_at','CREATE INDEX idx_user_favorites_user_created_at ON public.user_favorites USING btree (user_id, created_at DESC)'),
      ('user_favorites','idx_user_favorites_user_id','CREATE INDEX idx_user_favorites_user_id ON public.user_favorites USING btree (user_id)'),
      ('user_preferences','user_preferences_pkey','CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id)')
    ) AS expected2(tbl, idxname, idxdef)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: % index-row mismatches found across the 4 target tables -- rolling back',
      mismatch_count;
  END IF;

  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT * FROM (VALUES
      ('menu_plans','read own menu plans','SELECT','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
      ('menu_plans','insert own menu plans','INSERT','PERMISSIVE','{public}','NULL','(user_id = auth.uid())'),
      ('menu_plans','update own menu plans','UPDATE','PERMISSIVE','{public}','(user_id = auth.uid())','(user_id = auth.uid())'),
      ('menu_plans','delete own menu plans','DELETE','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
      ('menu_plan_items','read own menu plan items','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
      ('menu_plan_items','insert own menu plan items','INSERT','PERMISSIVE','{public}','NULL','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
      ('menu_plan_items','update own menu plan items','UPDATE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
      ('menu_plan_items','delete own menu plan items','DELETE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
      ('user_favorites','Users can view own favorites','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_favorites','Users can insert own favorites','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_favorites','Users can delete own favorites','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_preferences','Users can view own preferences','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_preferences','Users can insert own preferences','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_preferences','Users can update own preferences','UPDATE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_preferences','Users can delete own preferences','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL')
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
      ('menu_plans','read own menu plans','SELECT','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
      ('menu_plans','insert own menu plans','INSERT','PERMISSIVE','{public}','NULL','(user_id = auth.uid())'),
      ('menu_plans','update own menu plans','UPDATE','PERMISSIVE','{public}','(user_id = auth.uid())','(user_id = auth.uid())'),
      ('menu_plans','delete own menu plans','DELETE','PERMISSIVE','{public}','(user_id = auth.uid())','NULL'),
      ('menu_plan_items','read own menu plan items','SELECT','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
      ('menu_plan_items','insert own menu plan items','INSERT','PERMISSIVE','{public}','NULL','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
      ('menu_plan_items','update own menu plan items','UPDATE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))'),
      ('menu_plan_items','delete own menu plan items','DELETE','PERMISSIVE','{public}','(EXISTS ( SELECT 1' || chr(10) || '   FROM menu_plans p' || chr(10) || '  WHERE ((p.id = menu_plan_items.menu_plan_id) AND (p.user_id = auth.uid()))))','NULL'),
      ('user_favorites','Users can view own favorites','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_favorites','Users can insert own favorites','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_favorites','Users can delete own favorites','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_preferences','Users can view own preferences','SELECT','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL'),
      ('user_preferences','Users can insert own preferences','INSERT','PERMISSIVE','{authenticated}','NULL','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_preferences','Users can update own preferences','UPDATE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'),
      ('user_preferences','Users can delete own preferences','DELETE','PERMISSIVE','{authenticated}','((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))','NULL')
    ) AS expected2(tbl, polname, cmd, permissive, roles, qual, withcheck)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: % policy-row mismatches found across the 4 target tables -- rolling back',
      mismatch_count;
  END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND NOT t.tgisinternal
         AND c.relname = ANY (target_tables)) <> 1 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: expected exactly 1 non-internal trigger across the 4 target tables -- rolling back';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
      JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal
       AND c.relname = 'user_preferences' AND t.tgname = 'trg_user_preferences_updated_at'
       AND pn.nspname = 'public' AND p.proname = 'set_updated_at'
       AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0
  ) THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: public.user_preferences.trg_user_preferences_updated_at does not exactly match the expected binding -- rolling back';
  END IF;

  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
      FROM (
        SELECT t, r, p
          FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
               unnest(ARRAY['anon','authenticated']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','SELECT','UPDATE']) AS p
        UNION ALL
        SELECT t, r, p
          FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
               unnest(ARRAY['postgres','service_role']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
        UNION ALL
        SELECT t, r, p
          FROM unnest(ARRAY['user_favorites','user_preferences']) AS t,
               unnest(ARRAY['anon','authenticated','postgres','service_role']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
      ) AS expected(tbl, grantee, priv)
    EXCEPT ALL
    SELECT c.relname,
           (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
           a.privilege_type,
           (CASE WHEN a.grantor=0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
           a.is_grantable
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
           pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
    )

    UNION ALL

    (
    SELECT c.relname,
           (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END),
           a.privilege_type,
           (CASE WHEN a.grantor=0 THEN 'PUBLIC' ELSE a.grantor::regrole::text END),
           a.is_grantable
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
           pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
    EXCEPT ALL
    SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
      FROM (
        SELECT t, r, p
          FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
               unnest(ARRAY['anon','authenticated']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','SELECT','UPDATE']) AS p
        UNION ALL
        SELECT t, r, p
          FROM unnest(ARRAY['menu_plans','menu_plan_items']) AS t,
               unnest(ARRAY['postgres','service_role']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
        UNION ALL
        SELECT t, r, p
          FROM unnest(ARRAY['user_favorites','user_preferences']) AS t,
               unnest(ARRAY['anon','authenticated','postgres','service_role']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
      ) AS expected2(tbl, grantee, priv)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: % raw-ACL-row mismatches found across the 4 target tables (expected exactly the 116-row live contract) -- rolling back',
      mismatch_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables) AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: a column ACL exists among the 4 target tables -- rolling back (none are audited)';
  END IF;

  -- Owner and RLS reasserted (unconditional, catalog-idempotent on the
  -- compatible path -- see header note).
  FOR present_count IN 1..1 LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
         AND (pg_catalog.pg_get_userbyid(c.relowner) IS DISTINCT FROM 'postgres'
              OR c.relrowsecurity IS DISTINCT FROM true
              OR c.relforcerowsecurity IS DISTINCT FROM false)
    ) THEN
      RAISE EXCEPTION
        'baseline_user_plans_schema: postcheck: an owner/RLS mismatch exists among the 4 target tables -- rolling back';
    END IF;
  END LOOP;

  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_user_plans_schema: postcheck: expected exactly 1 public.set_updated_at to remain present, found % -- rolling back',
      fn_count;
  END IF;
END;
$postcheck$;

-- ALTER TABLE ... OWNER TO / ENABLE ROW LEVEL SECURITY are unconditionally
-- reasserted inside B1-B4 above on every path, including the compatible
-- path -- runtime-verified to cause zero net catalog/OID change when the
-- state is already compatible (a zero-net-catalog-change guarantee, not a
-- transaction in which no write-capable SQL statement executes). B5/B6 are
-- true zero-write no-ops on the compatible path (guarded on live scans).
