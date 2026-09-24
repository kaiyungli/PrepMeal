-- Migration: baseline_core_recipe_catalog_schema
--
-- PrepMeal Canonical Baseline, Slice 1 of 3 (core recipe/catalog).
--
-- SCOPE: exactly public.set_updated_at() (prerequisite only -- byte-exact
-- final hardened contract, not a new hardening pass) and 8 tables:
--   public.ingredients, public.units, public.equipment, public.recipes,
--   public.recipe_ingredients, public.recipe_steps, public.recipe_equipment,
--   public.ingredient_substitutions
-- plus only the constraints/indexes/RLS/policies/ACLs/triggers that belong
-- directly to those 8 tables. No other object is touched.
--
-- WHY THIS MIGRATION EXISTS: a live audit (see
-- /home/venn/prepmeal-fresh-replay-closure-audit.md and
-- /home/venn/prepmeal-canonical-baseline-design.md, outside this repo)
-- found these 8 tables live in the linked production project but created by
-- NO migration anywhere in this repository, tracked or archived -- the
-- earliest active migration (20260905034023_get_recipe_list_with_detail_json.sql)
-- already assumes public.recipes/recipe_ingredients/ingredients/units/
-- recipe_steps exist. A fresh/empty database therefore cannot replay this
-- repository's migration history at all. This migration closes that gap for
-- exactly these 8 tables, timestamped before 20260905034023 so it runs
-- first on a fresh replay.
--
-- HARDENED-CONTRACT CORRECTION (post static-review finding B-1 / see
-- /home/venn/prepmeal-baseline-core-recipe-catalog-static-review.md and
-- /home/venn/prepmeal-recipes-insert-authorization-confirmation.md, both
-- outside this repo): an earlier draft of this migration faithfully
-- mirrored the then-live production policy/ACL shape, which included a
-- confirmed authorization bypass -- two co-existing PERMISSIVE INSERT
-- policies on public.recipes (one unconditional, `WITH CHECK (true)`, `TO
-- authenticated`) whose OR-combination let any authenticated user insert an
-- arbitrary-author recipe row. Zero shipped Web/Mobile feature depended on
-- that write path (confirmed by full code search; every legitimate recipe
-- write already goes through the admin-only `admin_*_recipe_atomic`
-- service-role RPCs). Production has since been separately hardened by
-- migration 20260921175321_harden_recipe_catalog_client_write_boundary.sql
-- (merged, applied, verified -- see
-- /home/venn/prepmeal-recipe-catalog-write-hardening-production-apply.md).
-- This corrected baseline now creates the ALREADY-HARDENED final contract
-- directly on a fresh replay -- it does NOT create, and its preflight no
-- longer accepts, the vulnerable policy/ACL shape. Its "compatible" path
-- now recognizes only the exact hardened shape (8 SELECT-only policies, a
-- 144-row raw ACL narrowing anon/authenticated to SELECT-only on all 8
-- tables). On a fresh replay, the later hardening migration
-- 20260921175321 will therefore see its own target state already in place
-- and safely no-op (its own preflight explicitly accepts that as its
-- "already hardened final state" acceptance branch).
--
-- THE set_updated_at() PREREQUISITE: public.recipes carries a live
-- BEFORE UPDATE trigger bound to public.set_updated_at(), a function this
-- repository already tracks and hardens via the LATER active migration
-- 20260920072450_baseline_and_harden_set_updated_at.sql. Since this slice
-- must run before 20260905034023 (and therefore long before 20260920072450),
-- it must create a compatible set_updated_at() itself so the trigger below
-- has something to bind to. 20260920072450's own preflight (read directly,
-- not assumed) accepts a pre-existing public.set_updated_at() in either of
-- two exact states: the original unhardened shape (proconfig NULL, body
-- using bare now()) or the fully-hardened idempotent-rerun shape (proconfig
-- {search_path=pg_catalog}, body using pg_catalog.now(), which normalizes
-- identically to the unhardened body under that migration's own comparison).
-- This migration creates the function in the SECOND (fully-hardened) shape
-- directly -- byte-identical to what 20260920072450 itself asserts -- so
-- that migration's preflight recognizes it as already-compatible and
-- performs its own idempotent CREATE OR REPLACE + ALTER OWNER + REVOKE with
-- no failure and no behavior change. 20260920072450 is NOT edited by this
-- migration and its own header already states it deliberately does not
-- create/alter/assert any table or trigger -- the trigger binding below is
-- this migration's own, sole responsibility.
--
-- TABLE ACL (hardened target, not the environment default): the project's
-- own pre-existing `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA
-- public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role`
-- (Supabase project template configuration, NOT anything this migration
-- sets or touches) would, left alone, produce the plain 32-row-per-table
-- default shape (8 privileges x {anon,authenticated,postgres,service_role})
-- on a fresh CREATE TABLE. That default shape is exactly the vulnerable
-- pre-hardening ACL this migration must NOT leave in place. On the fresh
-- path, immediately after creating all 8 tables (and their policies), this
-- migration issues explicit, static, literal `REVOKE` statements (guarded,
-- idempotent, never `ALTER DEFAULT PRIVILEGES`) narrowing `anon` and
-- `authenticated` to `SELECT`-only on every one of the 8 tables -- the
-- exact same target ACL shape 20260921175321 already applies to production.
-- `postgres`/`service_role` keep the full 8-privilege default, untouched.
-- The result is a 144-row raw ACL (8 tables x (1 anon + 1 authenticated +
-- 8 postgres + 8 service_role) = 8 x 18), explicit and self-verifying, not
-- assumed from the environment default -- the postcheck below reasserts it.
--
-- Order of operations (each step gated on the previous, matching this
-- repository's established fail-closed convention):
--   A. Read-only preflight: accept only "all 8 tables absent" (fresh path)
--      or "all 8 tables present and each matches the complete audited
--      HARDENED contract" (compatible path -- the vulnerable pre-hardening
--      shape is explicitly rejected on this path, see below). Any partial
--      presence, wrong relkind, wrong owner, wrong column/constraint/index/
--      policy/trigger/ACL set, or any column ACL fails closed. This
--      includes the vulnerable shape itself: a live `recipes` carrying
--      either of the two removed INSERT policies, either removed
--      UPDATE/DELETE policy, either child table's removed `FOR ALL` write
--      policy, or the wider 256-row default ACL is treated as a mismatch
--      and fails closed, not silently accepted as "compatible." (A
--      standalone production database that still has the vulnerable shape
--      is not this migration's concern -- it is fixed by the separately
--      reviewed, already-merged-and-applied hardening migration
--      20260921175321, which targets the linked project directly; this
--      baseline's job is only to make a *fresh* replay start hardened.)
--      set_updated_at() is checked separately and accepts only absent or
--      the exact final hardened contract. This block performs no write.
--   B. Static creation: fresh path only, in FK-safe dependency order
--      (ingredients, units, equipment -> recipes -> recipe_ingredients,
--      recipe_steps, recipe_equipment -> ingredient_substitutions), then
--      explicit ACL narrowing. Every CREATE is guarded with IF NOT EXISTS
--      (tables, indexes -- both natively support it) or a guarded
--      dynamic-SQL DO block that checks pg_policies/pg_trigger existence
--      before an EXECUTE of fully static, literal DDL text (policies, the
--      one trigger -- CREATE POLICY/CREATE TRIGGER have no native IF NOT
--      EXISTS); the ACL-narrowing REVOKE statements are themselves guarded
--      on a live scan for any non-SELECT anon/authenticated grant still
--      present, so they never execute at all on the compatible path. No row
--      is read or written. No DROP, no CASCADE, no ALTER DEFAULT
--      PRIVILEGES, no GRANT OPTION, no catalog/user-controlled value
--      interpolated into any dynamic SQL string.
--   C. Read-only postcheck: reassert the complete final HARDENED contract
--      for every object in scope -- the same full symmetric-content
--      comparisons preflight performs (not a bare count) for columns,
--      constraints, indexes, and policies, plus the complete raw ACL (all
--      5 fields: table, grantee, privilege, grantor, is_grantable) and a
--      generic zero-column-ACL scan. Fail closed on any mismatch. On an
--      exact compatible state, this migration's compatible path is
--      catalog-idempotent, not read-only: part B's guarded creation,
--      policy, and privilege operations make no catalog change, but the
--      unconditional per-table ALTER TABLE ... OWNER TO / ENABLE ROW
--      LEVEL SECURITY statements still execute on every path, including
--      this one. Those unconditional statements were runtime-verified to
--      cause zero net catalog/OID change when the state is already
--      compatible -- a zero-net-catalog-change guarantee, not a
--      transaction in which no write-capable SQL statement executes.
--      This block does not itself capture or compare object OIDs
--      before/after, so it makes no claim of proving OID stability by
--      SQL alone; OID stability across a compatible-path no-op run is
--      instead verified empirically by an out-of-band before/after
--      runtime catalog snapshot comparison (the same method already used
--      for this repository's other hardening migrations), not by this
--      file's SQL.
--
-- Transactionality: no explicit BEGIN/COMMIT, matching every other
-- migration in this repository -- a RAISE EXCEPTION inside a DO block rolls
-- back the whole implicit single-statement-protocol transaction. This is a
-- static conclusion from documented PostgreSQL simple-query-protocol
-- behavior and this repo's own precedent; empirical proof (pre-write and
-- post-write forced-rollback proofs) is deferred to isolated Docker
-- verification, out of scope for this round per instruction.

-- ============================================================================
-- A. Read-only preflight -- inspect before any write, fail closed.
-- ============================================================================
DO $preflight$
DECLARE
  target_tables       text[] := ARRAY['ingredients','units','equipment','recipes',
                                       'recipe_ingredients','recipe_steps',
                                       'recipe_equipment','ingredient_substitutions'];
  tname               text;
  wrong_kind          record;
  present_count       int;
  fn_count            int;
  fn_pre              record;
  fn_canonical_body   text := 'BEGIN NEW.updated_at = now(); RETURN NEW; END;';
  fn_pre_body_norm    text;
  mismatch_count      int;
BEGIN
  -- A0. No object of any OTHER kind may occupy one of these 8 names in
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
      'baseline_core_recipe_catalog_schema: preflight: public.% exists but is relkind % (expected an ordinary or partitioned table) -- refusing to proceed',
      wrong_kind.relname, wrong_kind.relkind;
  END LOOP;

  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count NOT IN (0, 8) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: preflight: % of 8 target tables exist -- expected 0 (fresh) or 8 (compatible), refusing partial state',
      present_count;
  END IF;

  IF present_count = 8 THEN
    -- Owner must be postgres on every table.
    FOR tname IN SELECT unnest(target_tables) LOOP
      IF (SELECT pg_catalog.pg_get_userbyid(c.relowner) FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname=tname) IS DISTINCT FROM 'postgres' THEN
        RAISE EXCEPTION
          'baseline_core_recipe_catalog_schema: preflight: public.% owner is not postgres -- refusing to proceed', tname;
      END IF;
    END LOOP;

    -- RLS must be enabled, not forced, on every table.
    FOR tname IN SELECT unnest(target_tables) LOOP
      IF (SELECT (c.relrowsecurity, c.relforcerowsecurity) FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname=tname) IS DISTINCT FROM (true, false) THEN
        RAISE EXCEPTION
          'baseline_core_recipe_catalog_schema: preflight: public.% RLS state is not exactly enabled/not-forced -- refusing to proceed', tname;
      END IF;
    END LOOP;

    -- Exact column set: symmetric difference against the audited live
    -- contract must be empty. Identity/generated must be empty on every
    -- column in scope (verified generically, not per-row, since every
    -- audited column shares this property).
    SELECT count(*) INTO mismatch_count
    FROM (
      (
      SELECT * FROM (VALUES
        ('ingredients',1,'id','uuid',true,'gen_random_uuid()'),
        ('ingredients',2,'name','text',true,'NULL'),
        ('ingredients',3,'category','text',false,'NULL'),
        ('ingredients',4,'slug','text',true,'NULL'),
        ('ingredients',5,'aliases','text[]',true,'''{}''::text[]'),
        ('ingredients',6,'is_active','boolean',true,'true'),
        ('ingredients',7,'created_at','timestamp with time zone',true,'now()'),
        ('ingredients',8,'shopping_category','text',false,'NULL'),
        ('ingredients',9,'is_pantry_default','boolean',true,'false'),
        ('ingredients',10,'name_en','text',false,'NULL'),
        ('ingredients',11,'name_zh','text',false,'NULL'),
        ('units',1,'id','uuid',true,'gen_random_uuid()'),
        ('units',2,'code','text',true,'NULL'),
        ('units',3,'name','text',true,'NULL'),
        ('units',4,'unit_type','text',true,'NULL'),
        ('units',5,'to_base','numeric',true,'NULL'),
        ('units',6,'display_name_en','text',false,'NULL'),
        ('units',7,'display_name_zh','text',false,'NULL'),
        ('equipment',1,'id','uuid',true,'gen_random_uuid()'),
        ('equipment',2,'name','text',true,'NULL'),
        ('equipment',3,'category','text',false,'NULL'),
        ('equipment',4,'created_at','timestamp with time zone',true,'now()'),
        ('recipes',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipes',2,'name','text',true,'NULL'),
        ('recipes',3,'description','text',false,'NULL'),
        ('recipes',4,'image_url','text',false,'NULL'),
        ('recipes',5,'cuisine','text',true,'NULL'),
        ('recipes',6,'dish_type','text',true,'NULL'),
        ('recipes',7,'method','text',true,'NULL'),
        ('recipes',8,'speed','text',true,'NULL'),
        ('recipes',9,'difficulty','text',true,'NULL'),
        ('recipes',10,'protein','text[]',true,'''{}''::text[]'),
        ('recipes',11,'diet','text[]',true,'''{}''::text[]'),
        ('recipes',12,'flavor','text[]',true,'''{}''::text[]'),
        ('recipes',13,'base_servings','integer',true,'1'),
        ('recipes',14,'calories_per_serving','integer',false,'NULL'),
        ('recipes',15,'protein_g','numeric',false,'NULL'),
        ('recipes',16,'carbs_g','numeric',false,'NULL'),
        ('recipes',17,'fat_g','numeric',false,'NULL'),
        ('recipes',18,'is_public','boolean',true,'true'),
        ('recipes',19,'author_id','uuid',false,'NULL'),
        ('recipes',20,'created_at','timestamp with time zone',true,'now()'),
        ('recipes',21,'updated_at','timestamp with time zone',true,'now()'),
        ('recipes',22,'slug','text',false,'NULL'),
        ('recipes',23,'prep_time_minutes','integer',false,'NULL'),
        ('recipes',24,'cook_time_minutes','integer',false,'NULL'),
        ('recipes',25,'total_time_minutes','integer',false,'NULL'),
        ('recipes',26,'servings_unit','text',false,'''portion''::text'),
        ('recipes',27,'meal_role','text',false,'NULL'),
        ('recipes',28,'is_complete_meal','boolean',true,'false'),
        ('recipes',29,'primary_protein','text',false,'NULL'),
        ('recipes',30,'excluded_tags','text[]',true,'''{}''::text[]'),
        ('recipes',31,'budget_level','text',false,'NULL'),
        ('recipes',32,'reuse_group','text',false,'NULL'),
        ('recipes',33,'times_shown','integer',false,'0'),
        ('recipe_ingredients',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipe_ingredients',2,'recipe_id','uuid',true,'NULL'),
        ('recipe_ingredients',3,'ingredient_id','uuid',true,'NULL'),
        ('recipe_ingredients',4,'quantity','numeric',true,'NULL'),
        ('recipe_ingredients',5,'unit_id','uuid',true,'NULL'),
        ('recipe_ingredients',6,'is_optional','boolean',true,'false'),
        ('recipe_ingredients',7,'group_key','text',false,'NULL'),
        ('recipe_ingredients',8,'prep_note','text',false,'NULL'),
        ('recipe_ingredients',9,'created_at','timestamp with time zone',true,'now()'),
        ('recipe_steps',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipe_steps',2,'recipe_id','uuid',true,'NULL'),
        ('recipe_steps',3,'step_no','integer',true,'NULL'),
        ('recipe_steps',4,'text','text',true,'NULL'),
        ('recipe_steps',5,'time_seconds','integer',false,'NULL'),
        ('recipe_steps',6,'image_url','text',false,'NULL'),
        ('recipe_equipment',1,'recipe_id','uuid',true,'NULL'),
        ('recipe_equipment',2,'equipment_id','uuid',true,'NULL'),
        ('recipe_equipment',3,'is_optional','boolean',true,'false'),
        ('recipe_equipment',4,'note','text',false,'NULL'),
        ('ingredient_substitutions',1,'id','uuid',true,'gen_random_uuid()'),
        ('ingredient_substitutions',2,'ingredient_id','uuid',true,'NULL'),
        ('ingredient_substitutions',3,'substitute_ingredient_id','uuid',true,'NULL'),
        ('ingredient_substitutions',4,'ratio','numeric',true,'1'),
        ('ingredient_substitutions',5,'note','text',false,'NULL'),
        ('ingredient_substitutions',6,'created_at','timestamp with time zone',true,'now()')
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
        ('ingredients',1,'id','uuid',true,'gen_random_uuid()'),
        ('ingredients',2,'name','text',true,'NULL'),
        ('ingredients',3,'category','text',false,'NULL'),
        ('ingredients',4,'slug','text',true,'NULL'),
        ('ingredients',5,'aliases','text[]',true,'''{}''::text[]'),
        ('ingredients',6,'is_active','boolean',true,'true'),
        ('ingredients',7,'created_at','timestamp with time zone',true,'now()'),
        ('ingredients',8,'shopping_category','text',false,'NULL'),
        ('ingredients',9,'is_pantry_default','boolean',true,'false'),
        ('ingredients',10,'name_en','text',false,'NULL'),
        ('ingredients',11,'name_zh','text',false,'NULL'),
        ('units',1,'id','uuid',true,'gen_random_uuid()'),
        ('units',2,'code','text',true,'NULL'),
        ('units',3,'name','text',true,'NULL'),
        ('units',4,'unit_type','text',true,'NULL'),
        ('units',5,'to_base','numeric',true,'NULL'),
        ('units',6,'display_name_en','text',false,'NULL'),
        ('units',7,'display_name_zh','text',false,'NULL'),
        ('equipment',1,'id','uuid',true,'gen_random_uuid()'),
        ('equipment',2,'name','text',true,'NULL'),
        ('equipment',3,'category','text',false,'NULL'),
        ('equipment',4,'created_at','timestamp with time zone',true,'now()'),
        ('recipes',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipes',2,'name','text',true,'NULL'),
        ('recipes',3,'description','text',false,'NULL'),
        ('recipes',4,'image_url','text',false,'NULL'),
        ('recipes',5,'cuisine','text',true,'NULL'),
        ('recipes',6,'dish_type','text',true,'NULL'),
        ('recipes',7,'method','text',true,'NULL'),
        ('recipes',8,'speed','text',true,'NULL'),
        ('recipes',9,'difficulty','text',true,'NULL'),
        ('recipes',10,'protein','text[]',true,'''{}''::text[]'),
        ('recipes',11,'diet','text[]',true,'''{}''::text[]'),
        ('recipes',12,'flavor','text[]',true,'''{}''::text[]'),
        ('recipes',13,'base_servings','integer',true,'1'),
        ('recipes',14,'calories_per_serving','integer',false,'NULL'),
        ('recipes',15,'protein_g','numeric',false,'NULL'),
        ('recipes',16,'carbs_g','numeric',false,'NULL'),
        ('recipes',17,'fat_g','numeric',false,'NULL'),
        ('recipes',18,'is_public','boolean',true,'true'),
        ('recipes',19,'author_id','uuid',false,'NULL'),
        ('recipes',20,'created_at','timestamp with time zone',true,'now()'),
        ('recipes',21,'updated_at','timestamp with time zone',true,'now()'),
        ('recipes',22,'slug','text',false,'NULL'),
        ('recipes',23,'prep_time_minutes','integer',false,'NULL'),
        ('recipes',24,'cook_time_minutes','integer',false,'NULL'),
        ('recipes',25,'total_time_minutes','integer',false,'NULL'),
        ('recipes',26,'servings_unit','text',false,'''portion''::text'),
        ('recipes',27,'meal_role','text',false,'NULL'),
        ('recipes',28,'is_complete_meal','boolean',true,'false'),
        ('recipes',29,'primary_protein','text',false,'NULL'),
        ('recipes',30,'excluded_tags','text[]',true,'''{}''::text[]'),
        ('recipes',31,'budget_level','text',false,'NULL'),
        ('recipes',32,'reuse_group','text',false,'NULL'),
        ('recipes',33,'times_shown','integer',false,'0'),
        ('recipe_ingredients',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipe_ingredients',2,'recipe_id','uuid',true,'NULL'),
        ('recipe_ingredients',3,'ingredient_id','uuid',true,'NULL'),
        ('recipe_ingredients',4,'quantity','numeric',true,'NULL'),
        ('recipe_ingredients',5,'unit_id','uuid',true,'NULL'),
        ('recipe_ingredients',6,'is_optional','boolean',true,'false'),
        ('recipe_ingredients',7,'group_key','text',false,'NULL'),
        ('recipe_ingredients',8,'prep_note','text',false,'NULL'),
        ('recipe_ingredients',9,'created_at','timestamp with time zone',true,'now()'),
        ('recipe_steps',1,'id','uuid',true,'gen_random_uuid()'),
        ('recipe_steps',2,'recipe_id','uuid',true,'NULL'),
        ('recipe_steps',3,'step_no','integer',true,'NULL'),
        ('recipe_steps',4,'text','text',true,'NULL'),
        ('recipe_steps',5,'time_seconds','integer',false,'NULL'),
        ('recipe_steps',6,'image_url','text',false,'NULL'),
        ('recipe_equipment',1,'recipe_id','uuid',true,'NULL'),
        ('recipe_equipment',2,'equipment_id','uuid',true,'NULL'),
        ('recipe_equipment',3,'is_optional','boolean',true,'false'),
        ('recipe_equipment',4,'note','text',false,'NULL'),
        ('ingredient_substitutions',1,'id','uuid',true,'gen_random_uuid()'),
        ('ingredient_substitutions',2,'ingredient_id','uuid',true,'NULL'),
        ('ingredient_substitutions',3,'substitute_ingredient_id','uuid',true,'NULL'),
        ('ingredient_substitutions',4,'ratio','numeric',true,'1'),
        ('ingredient_substitutions',5,'note','text',false,'NULL'),
        ('ingredient_substitutions',6,'created_at','timestamp with time zone',true,'now()')
      ) AS expected2(tbl, attnum, attname, atttype, is_notnull, def)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: % column-row mismatches found across the 8 target tables -- refusing to proceed',
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
        'baseline_core_recipe_catalog_schema: preflight: an identity or generated column exists among the 8 target tables -- refusing to proceed (none are audited as identity/generated)';
    END IF;

    -- Exact constraint set (name, type, definition).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT * FROM (VALUES
        ('equipment','equipment_pkey','p','PRIMARY KEY (id)'),
        ('ingredient_substitutions','ingredient_substitutions_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
        ('ingredient_substitutions','ingredient_substitutions_pkey','p','PRIMARY KEY (id)'),
        ('ingredient_substitutions','ingredient_substitutions_ratio_check','c','CHECK ((ratio > (0)::numeric))'),
        ('ingredient_substitutions','ingredient_substitutions_substitute_ingredient_id_fkey','f','FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
        ('ingredient_substitutions','unique_substitution','u','UNIQUE (ingredient_id, substitute_ingredient_id)'),
        ('ingredients','ingredients_pkey','p','PRIMARY KEY (id)'),
        ('ingredients','ingredients_shopping_category_check','c','CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY[''vegetable''::text, ''meat_seafood''::text, ''tofu_egg''::text, ''dairy''::text, ''carb''::text, ''pantry''::text, ''seasoning''::text, ''frozen''::text, ''other''::text]))))'),
        ('ingredients','ingredients_slug_key','u','UNIQUE (slug)'),
        ('recipe_equipment','recipe_equipment_equipment_id_fkey','f','FOREIGN KEY (equipment_id) REFERENCES equipment(id)'),
        ('recipe_equipment','recipe_equipment_pkey','p','PRIMARY KEY (recipe_id, equipment_id)'),
        ('recipe_equipment','recipe_equipment_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_ingredients','recipe_ingredients_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'),
        ('recipe_ingredients','recipe_ingredients_pkey','p','PRIMARY KEY (id)'),
        ('recipe_ingredients','recipe_ingredients_quantity_check','c','CHECK ((quantity >= (0)::numeric))'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','u','UNIQUE (recipe_id, ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_unit_id_fkey','f','FOREIGN KEY (unit_id) REFERENCES units(id)'),
        ('recipe_steps','recipe_steps_pkey','p','PRIMARY KEY (id)'),
        ('recipe_steps','recipe_steps_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_steps','recipe_steps_recipe_id_step_no_key','u','UNIQUE (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_step_no_check','c','CHECK ((step_no > 0))'),
        ('recipes','recipes_base_servings_check','c','CHECK ((base_servings > 0))'),
        ('recipes','recipes_budget_level_check','c','CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY[''budget''::text, ''normal''::text, ''premium''::text]))))'),
        ('recipes','recipes_cuisine_check','c','CHECK ((cuisine = ANY (ARRAY[''chinese''::text, ''western''::text, ''japanese''::text, ''korean''::text, ''thai''::text, ''fusion''::text])))'),
        ('recipes','recipes_difficulty_check','c','CHECK ((difficulty = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text])))'),
        ('recipes','recipes_dish_type_check','c','CHECK ((dish_type = ANY (ARRAY[''main''::text, ''side''::text, ''soup''::text, ''staple''::text, ''snack''::text])))'),
        ('recipes','recipes_meal_role_check','c','CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
        ('recipes','recipes_method_check','c','CHECK ((method = ANY (ARRAY[''stir_fry''::text, ''steamed''::text, ''fried''::text, ''braised''::text, ''boiled''::text, ''baked''::text])))'),
        ('recipes','recipes_pkey','p','PRIMARY KEY (id)'),
        ('recipes','recipes_primary_protein_check','c','CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY[''chicken''::text, ''beef''::text, ''pork''::text, ''fish''::text, ''seafood''::text, ''shrimp''::text, ''tofu''::text, ''egg''::text, ''vegetarian''::text, ''mixed''::text]))))'),
        ('recipes','recipes_slug_key','u','UNIQUE (slug)'),
        ('recipes','recipes_speed_check','c','CHECK ((speed = ANY (ARRAY[''quick''::text, ''normal''::text, ''slow''::text])))'),
        ('units','units_code_key','u','UNIQUE (code)'),
        ('units','units_pkey','p','PRIMARY KEY (id)'),
        ('units','units_to_base_check','c','CHECK ((to_base > (0)::numeric))'),
        ('units','units_unit_type_check','c','CHECK ((unit_type = ANY (ARRAY[''mass''::text, ''volume''::text, ''count''::text])))')
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
        ('equipment','equipment_pkey','p','PRIMARY KEY (id)'),
        ('ingredient_substitutions','ingredient_substitutions_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
        ('ingredient_substitutions','ingredient_substitutions_pkey','p','PRIMARY KEY (id)'),
        ('ingredient_substitutions','ingredient_substitutions_ratio_check','c','CHECK ((ratio > (0)::numeric))'),
        ('ingredient_substitutions','ingredient_substitutions_substitute_ingredient_id_fkey','f','FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
        ('ingredient_substitutions','unique_substitution','u','UNIQUE (ingredient_id, substitute_ingredient_id)'),
        ('ingredients','ingredients_pkey','p','PRIMARY KEY (id)'),
        ('ingredients','ingredients_shopping_category_check','c','CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY[''vegetable''::text, ''meat_seafood''::text, ''tofu_egg''::text, ''dairy''::text, ''carb''::text, ''pantry''::text, ''seasoning''::text, ''frozen''::text, ''other''::text]))))'),
        ('ingredients','ingredients_slug_key','u','UNIQUE (slug)'),
        ('recipe_equipment','recipe_equipment_equipment_id_fkey','f','FOREIGN KEY (equipment_id) REFERENCES equipment(id)'),
        ('recipe_equipment','recipe_equipment_pkey','p','PRIMARY KEY (recipe_id, equipment_id)'),
        ('recipe_equipment','recipe_equipment_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_ingredients','recipe_ingredients_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'),
        ('recipe_ingredients','recipe_ingredients_pkey','p','PRIMARY KEY (id)'),
        ('recipe_ingredients','recipe_ingredients_quantity_check','c','CHECK ((quantity >= (0)::numeric))'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','u','UNIQUE (recipe_id, ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_unit_id_fkey','f','FOREIGN KEY (unit_id) REFERENCES units(id)'),
        ('recipe_steps','recipe_steps_pkey','p','PRIMARY KEY (id)'),
        ('recipe_steps','recipe_steps_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
        ('recipe_steps','recipe_steps_recipe_id_step_no_key','u','UNIQUE (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_step_no_check','c','CHECK ((step_no > 0))'),
        ('recipes','recipes_base_servings_check','c','CHECK ((base_servings > 0))'),
        ('recipes','recipes_budget_level_check','c','CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY[''budget''::text, ''normal''::text, ''premium''::text]))))'),
        ('recipes','recipes_cuisine_check','c','CHECK ((cuisine = ANY (ARRAY[''chinese''::text, ''western''::text, ''japanese''::text, ''korean''::text, ''thai''::text, ''fusion''::text])))'),
        ('recipes','recipes_difficulty_check','c','CHECK ((difficulty = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text])))'),
        ('recipes','recipes_dish_type_check','c','CHECK ((dish_type = ANY (ARRAY[''main''::text, ''side''::text, ''soup''::text, ''staple''::text, ''snack''::text])))'),
        ('recipes','recipes_meal_role_check','c','CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
        ('recipes','recipes_method_check','c','CHECK ((method = ANY (ARRAY[''stir_fry''::text, ''steamed''::text, ''fried''::text, ''braised''::text, ''boiled''::text, ''baked''::text])))'),
        ('recipes','recipes_pkey','p','PRIMARY KEY (id)'),
        ('recipes','recipes_primary_protein_check','c','CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY[''chicken''::text, ''beef''::text, ''pork''::text, ''fish''::text, ''seafood''::text, ''shrimp''::text, ''tofu''::text, ''egg''::text, ''vegetarian''::text, ''mixed''::text]))))'),
        ('recipes','recipes_slug_key','u','UNIQUE (slug)'),
        ('recipes','recipes_speed_check','c','CHECK ((speed = ANY (ARRAY[''quick''::text, ''normal''::text, ''slow''::text])))'),
        ('units','units_code_key','u','UNIQUE (code)'),
        ('units','units_pkey','p','PRIMARY KEY (id)'),
        ('units','units_to_base_check','c','CHECK ((to_base > (0)::numeric))'),
        ('units','units_unit_type_check','c','CHECK ((unit_type = ANY (ARRAY[''mass''::text, ''volume''::text, ''count''::text])))')
      ) AS expected2(tbl, conname, contype, condef)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: % constraint-row mismatches found across the 8 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Every FK must validated, non-deferrable, non-deferred (generic check
    -- across all in-scope constraints).
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
        'baseline_core_recipe_catalog_schema: preflight: a constraint among the 8 target tables is not validated/non-deferrable/non-deferred -- refusing to proceed';
    END IF;

    -- Exact index set (table, name, def).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT * FROM (VALUES
        ('equipment','equipment_pkey','CREATE UNIQUE INDEX equipment_pkey ON public.equipment USING btree (id)'),
        ('ingredient_substitutions','ingredient_subs_ing_idx','CREATE INDEX ingredient_subs_ing_idx ON public.ingredient_substitutions USING btree (ingredient_id)'),
        ('ingredient_substitutions','ingredient_substitutions_pkey','CREATE UNIQUE INDEX ingredient_substitutions_pkey ON public.ingredient_substitutions USING btree (id)'),
        ('ingredient_substitutions','unique_substitution','CREATE UNIQUE INDEX unique_substitution ON public.ingredient_substitutions USING btree (ingredient_id, substitute_ingredient_id)'),
        ('ingredients','idx_ingredients_is_pantry_default','CREATE INDEX idx_ingredients_is_pantry_default ON public.ingredients USING btree (is_pantry_default)'),
        ('ingredients','idx_ingredients_shopping_category','CREATE INDEX idx_ingredients_shopping_category ON public.ingredients USING btree (shopping_category)'),
        ('ingredients','ingredients_active_idx','CREATE INDEX ingredients_active_idx ON public.ingredients USING btree (is_active)'),
        ('ingredients','ingredients_pkey','CREATE UNIQUE INDEX ingredients_pkey ON public.ingredients USING btree (id)'),
        ('ingredients','ingredients_slug_key','CREATE UNIQUE INDEX ingredients_slug_key ON public.ingredients USING btree (slug)'),
        ('recipe_equipment','recipe_equipment_pkey','CREATE UNIQUE INDEX recipe_equipment_pkey ON public.recipe_equipment USING btree (recipe_id, equipment_id)'),
        ('recipe_ingredients','idx_recipe_ingredients_recipe_id','CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id)'),
        ('recipe_ingredients','recipe_ingredients_ingredient_idx','CREATE INDEX recipe_ingredients_ingredient_idx ON public.recipe_ingredients USING btree (ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_pkey','CREATE UNIQUE INDEX recipe_ingredients_pkey ON public.recipe_ingredients USING btree (id)'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','CREATE UNIQUE INDEX recipe_ingredients_recipe_id_ingredient_id_key ON public.recipe_ingredients USING btree (recipe_id, ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_recipe_idx','CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id)'),
        ('recipe_steps','idx_recipe_steps_recipe_id_step_no','CREATE INDEX idx_recipe_steps_recipe_id_step_no ON public.recipe_steps USING btree (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_pkey','CREATE UNIQUE INDEX recipe_steps_pkey ON public.recipe_steps USING btree (id)'),
        ('recipe_steps','recipe_steps_recipe_id_step_no_key','CREATE UNIQUE INDEX recipe_steps_recipe_id_step_no_key ON public.recipe_steps USING btree (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_recipe_idx','CREATE INDEX recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id)'),
        ('recipes','idx_recipes_budget_level','CREATE INDEX idx_recipes_budget_level ON public.recipes USING btree (budget_level)'),
        ('recipes','idx_recipes_cuisine','CREATE INDEX idx_recipes_cuisine ON public.recipes USING btree (cuisine)'),
        ('recipes','idx_recipes_diet_gin','CREATE INDEX idx_recipes_diet_gin ON public.recipes USING gin (diet)'),
        ('recipes','idx_recipes_difficulty','CREATE INDEX idx_recipes_difficulty ON public.recipes USING btree (difficulty)'),
        ('recipes','idx_recipes_excluded_tags_gin','CREATE INDEX idx_recipes_excluded_tags_gin ON public.recipes USING gin (excluded_tags)'),
        ('recipes','idx_recipes_meal_role','CREATE INDEX idx_recipes_meal_role ON public.recipes USING btree (meal_role)'),
        ('recipes','idx_recipes_method','CREATE INDEX idx_recipes_method ON public.recipes USING btree (method)'),
        ('recipes','idx_recipes_primary_protein','CREATE INDEX idx_recipes_primary_protein ON public.recipes USING btree (primary_protein)'),
        ('recipes','idx_recipes_protein_gin','CREATE INDEX idx_recipes_protein_gin ON public.recipes USING gin (protein)'),
        ('recipes','idx_recipes_protein_g','CREATE INDEX idx_recipes_protein_g ON public.recipes USING btree (protein_g)'),
        ('recipes','idx_recipes_slug','CREATE INDEX idx_recipes_slug ON public.recipes USING btree (slug)'),
        ('recipes','idx_recipes_times_shown','CREATE INDEX idx_recipes_times_shown ON public.recipes USING btree (times_shown DESC NULLS LAST)'),
        ('recipes','idx_recipes_total_time_minutes','CREATE INDEX idx_recipes_total_time_minutes ON public.recipes USING btree (total_time_minutes)'),
        ('recipes','recipes_cuisine_idx','CREATE INDEX recipes_cuisine_idx ON public.recipes USING btree (cuisine)'),
        ('recipes','recipes_diet_gin','CREATE INDEX recipes_diet_gin ON public.recipes USING gin (diet)'),
        ('recipes','recipes_difficulty_idx','CREATE INDEX recipes_difficulty_idx ON public.recipes USING btree (difficulty)'),
        ('recipes','recipes_dish_type_idx','CREATE INDEX recipes_dish_type_idx ON public.recipes USING btree (dish_type)'),
        ('recipes','recipes_flavor_gin','CREATE INDEX recipes_flavor_gin ON public.recipes USING gin (flavor)'),
        ('recipes','recipes_method_idx','CREATE INDEX recipes_method_idx ON public.recipes USING btree (method)'),
        ('recipes','recipes_pkey','CREATE UNIQUE INDEX recipes_pkey ON public.recipes USING btree (id)'),
        ('recipes','recipes_protein_gin','CREATE INDEX recipes_protein_gin ON public.recipes USING gin (protein)'),
        ('recipes','recipes_search_idx','CREATE INDEX recipes_search_idx ON public.recipes USING gin (to_tsvector(''english''::regconfig, ((name || '' ''::text) || COALESCE(description, ''''::text))))'),
        ('recipes','recipes_slug_key','CREATE UNIQUE INDEX recipes_slug_key ON public.recipes USING btree (slug)'),
        ('recipes','recipes_speed_idx','CREATE INDEX recipes_speed_idx ON public.recipes USING btree (speed)'),
        ('units','units_code_key','CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code)'),
        ('units','units_pkey','CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)')
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
        ('equipment','equipment_pkey','CREATE UNIQUE INDEX equipment_pkey ON public.equipment USING btree (id)'),
        ('ingredient_substitutions','ingredient_subs_ing_idx','CREATE INDEX ingredient_subs_ing_idx ON public.ingredient_substitutions USING btree (ingredient_id)'),
        ('ingredient_substitutions','ingredient_substitutions_pkey','CREATE UNIQUE INDEX ingredient_substitutions_pkey ON public.ingredient_substitutions USING btree (id)'),
        ('ingredient_substitutions','unique_substitution','CREATE UNIQUE INDEX unique_substitution ON public.ingredient_substitutions USING btree (ingredient_id, substitute_ingredient_id)'),
        ('ingredients','idx_ingredients_is_pantry_default','CREATE INDEX idx_ingredients_is_pantry_default ON public.ingredients USING btree (is_pantry_default)'),
        ('ingredients','idx_ingredients_shopping_category','CREATE INDEX idx_ingredients_shopping_category ON public.ingredients USING btree (shopping_category)'),
        ('ingredients','ingredients_active_idx','CREATE INDEX ingredients_active_idx ON public.ingredients USING btree (is_active)'),
        ('ingredients','ingredients_pkey','CREATE UNIQUE INDEX ingredients_pkey ON public.ingredients USING btree (id)'),
        ('ingredients','ingredients_slug_key','CREATE UNIQUE INDEX ingredients_slug_key ON public.ingredients USING btree (slug)'),
        ('recipe_equipment','recipe_equipment_pkey','CREATE UNIQUE INDEX recipe_equipment_pkey ON public.recipe_equipment USING btree (recipe_id, equipment_id)'),
        ('recipe_ingredients','idx_recipe_ingredients_recipe_id','CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id)'),
        ('recipe_ingredients','recipe_ingredients_ingredient_idx','CREATE INDEX recipe_ingredients_ingredient_idx ON public.recipe_ingredients USING btree (ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_pkey','CREATE UNIQUE INDEX recipe_ingredients_pkey ON public.recipe_ingredients USING btree (id)'),
        ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','CREATE UNIQUE INDEX recipe_ingredients_recipe_id_ingredient_id_key ON public.recipe_ingredients USING btree (recipe_id, ingredient_id)'),
        ('recipe_ingredients','recipe_ingredients_recipe_idx','CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id)'),
        ('recipe_steps','idx_recipe_steps_recipe_id_step_no','CREATE INDEX idx_recipe_steps_recipe_id_step_no ON public.recipe_steps USING btree (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_pkey','CREATE UNIQUE INDEX recipe_steps_pkey ON public.recipe_steps USING btree (id)'),
        ('recipe_steps','recipe_steps_recipe_id_step_no_key','CREATE UNIQUE INDEX recipe_steps_recipe_id_step_no_key ON public.recipe_steps USING btree (recipe_id, step_no)'),
        ('recipe_steps','recipe_steps_recipe_idx','CREATE INDEX recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id)'),
        ('recipes','idx_recipes_budget_level','CREATE INDEX idx_recipes_budget_level ON public.recipes USING btree (budget_level)'),
        ('recipes','idx_recipes_cuisine','CREATE INDEX idx_recipes_cuisine ON public.recipes USING btree (cuisine)'),
        ('recipes','idx_recipes_diet_gin','CREATE INDEX idx_recipes_diet_gin ON public.recipes USING gin (diet)'),
        ('recipes','idx_recipes_difficulty','CREATE INDEX idx_recipes_difficulty ON public.recipes USING btree (difficulty)'),
        ('recipes','idx_recipes_excluded_tags_gin','CREATE INDEX idx_recipes_excluded_tags_gin ON public.recipes USING gin (excluded_tags)'),
        ('recipes','idx_recipes_meal_role','CREATE INDEX idx_recipes_meal_role ON public.recipes USING btree (meal_role)'),
        ('recipes','idx_recipes_method','CREATE INDEX idx_recipes_method ON public.recipes USING btree (method)'),
        ('recipes','idx_recipes_primary_protein','CREATE INDEX idx_recipes_primary_protein ON public.recipes USING btree (primary_protein)'),
        ('recipes','idx_recipes_protein_gin','CREATE INDEX idx_recipes_protein_gin ON public.recipes USING gin (protein)'),
        ('recipes','idx_recipes_protein_g','CREATE INDEX idx_recipes_protein_g ON public.recipes USING btree (protein_g)'),
        ('recipes','idx_recipes_slug','CREATE INDEX idx_recipes_slug ON public.recipes USING btree (slug)'),
        ('recipes','idx_recipes_times_shown','CREATE INDEX idx_recipes_times_shown ON public.recipes USING btree (times_shown DESC NULLS LAST)'),
        ('recipes','idx_recipes_total_time_minutes','CREATE INDEX idx_recipes_total_time_minutes ON public.recipes USING btree (total_time_minutes)'),
        ('recipes','recipes_cuisine_idx','CREATE INDEX recipes_cuisine_idx ON public.recipes USING btree (cuisine)'),
        ('recipes','recipes_diet_gin','CREATE INDEX recipes_diet_gin ON public.recipes USING gin (diet)'),
        ('recipes','recipes_difficulty_idx','CREATE INDEX recipes_difficulty_idx ON public.recipes USING btree (difficulty)'),
        ('recipes','recipes_dish_type_idx','CREATE INDEX recipes_dish_type_idx ON public.recipes USING btree (dish_type)'),
        ('recipes','recipes_flavor_gin','CREATE INDEX recipes_flavor_gin ON public.recipes USING gin (flavor)'),
        ('recipes','recipes_method_idx','CREATE INDEX recipes_method_idx ON public.recipes USING btree (method)'),
        ('recipes','recipes_pkey','CREATE UNIQUE INDEX recipes_pkey ON public.recipes USING btree (id)'),
        ('recipes','recipes_protein_gin','CREATE INDEX recipes_protein_gin ON public.recipes USING gin (protein)'),
        ('recipes','recipes_search_idx','CREATE INDEX recipes_search_idx ON public.recipes USING gin (to_tsvector(''english''::regconfig, ((name || '' ''::text) || COALESCE(description, ''''::text))))'),
        ('recipes','recipes_slug_key','CREATE UNIQUE INDEX recipes_slug_key ON public.recipes USING btree (slug)'),
        ('recipes','recipes_speed_idx','CREATE INDEX recipes_speed_idx ON public.recipes USING btree (speed)'),
        ('units','units_code_key','CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code)'),
        ('units','units_pkey','CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)')
      ) AS expected2(tbl, idxname, idxdef)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: % index-row mismatches found across the 8 target tables -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Exact policy set (table, name, cmd, permissive, roles, qual, with_check).
    -- HARDENED CONTRACT: exactly the 8 SELECT-only policies. The 7 policies
    -- removed by the separate hardening migration 20260921175321 (4 on
    -- recipes: "Allow insert for authenticated users", "insert own
    -- recipes", "update own recipes", "delete own recipes"; 3 child-table
    -- FOR ALL policies: "write recipe_ingredients for own recipes", "write
    -- steps for own recipes", "write recipe_equipment for own recipes")
    -- are intentionally absent from this expected list -- their presence
    -- is now a mismatch, not an accepted alternate state.
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
        'baseline_core_recipe_catalog_schema: preflight: % policy-row mismatches found across the 8 target tables (expected exactly the 8-policy hardened contract -- any of the 7 removed vulnerable write policies being present is itself a mismatch) -- refusing to proceed',
        mismatch_count;
    END IF;

    -- Exact trigger: only public.recipes.trg_recipes_updated_at, BEFORE
    -- UPDATE FOR EACH ROW, enabled, zero args, bound to set_updated_at().
    IF (SELECT count(*) FROM pg_catalog.pg_trigger t
          JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
          JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname='public' AND NOT t.tgisinternal
           AND c.relname = ANY (target_tables)) <> 1 THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: expected exactly 1 non-internal trigger across the 8 target tables, found a different count -- refusing to proceed';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
        JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
       WHERE n.nspname='public' AND NOT t.tgisinternal
         AND c.relname = 'recipes' AND t.tgname = 'trg_recipes_updated_at'
         AND pn.nspname = 'public' AND p.proname = 'set_updated_at'
         AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0
    ) THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: public.recipes.trg_recipes_updated_at does not exactly match the expected BEFORE UPDATE FOR EACH ROW binding to public.set_updated_at() -- refusing to proceed';
    END IF;

    -- Exact raw ACL: HARDENED CONTRACT -- anon/authenticated narrowed to
    -- SELECT-only, postgres/service_role retain the full 8-privilege
    -- default, on every one of the 8 tables (144 rows total, not the
    -- vulnerable 256-row plain-default shape). Full 5-field identity
    -- (table, grantee, privilege, grantor, is_grantable) compared in one
    -- multiplicity-sensitive symmetric diff, correctly parenthesized as
    -- (expected EXCEPT ALL actual) UNION ALL (actual EXCEPT ALL expected)
    -- -- NOT left unparenthesized, which would silently associate as
    -- ((expected EXCEPT ALL actual) UNION ALL actual) EXCEPT ALL expected
    -- and can mask a genuine missing-row drift (verified by hand-trace).
    SELECT count(*) INTO mismatch_count FROM (
      (
      SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
        FROM (
          SELECT t, 'anon'::text, 'SELECT'::text FROM unnest(target_tables) AS t
          UNION ALL
          SELECT t, 'authenticated'::text, 'SELECT'::text FROM unnest(target_tables) AS t
          UNION ALL
          SELECT t, r, p
            FROM unnest(target_tables) AS t,
                 unnest(ARRAY['postgres','service_role']) AS r,
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
          SELECT t, 'anon'::text, 'SELECT'::text FROM unnest(target_tables) AS t
          UNION ALL
          SELECT t, 'authenticated'::text, 'SELECT'::text FROM unnest(target_tables) AS t
          UNION ALL
          SELECT t, r, p
            FROM unnest(target_tables) AS t,
                 unnest(ARRAY['postgres','service_role']) AS r,
                 unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
        ) AS expected2(tbl, grantee, priv)
      )
    ) AS symmetric_diff;

    IF mismatch_count <> 0 THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: % raw-ACL-row mismatches found across the 8 target tables (expected exactly the 144-row hardened contract: anon/authenticated SELECT-only, postgres/service_role full 8 privileges, grantor postgres, none grantable) -- refusing to proceed',
        mismatch_count;
    END IF;

    -- No PUBLIC or unrecognized grantee anywhere among the 8 tables' ACL
    -- (the symmetric diff above already pins every grantee to one of the 4
    -- expected roles via full-row equality, but this generic scan is kept
    -- as an independent, cheaper defense-in-depth check).
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
             pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
       WHERE n.nspname='public' AND c.relname = ANY (target_tables)
         AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END) NOT IN ('anon','authenticated','postgres','service_role')
    ) THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: an ACL row among the 8 target tables has an unrecognized grantee -- refusing to proceed';
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
        'baseline_core_recipe_catalog_schema: preflight: a column ACL exists among the 8 target tables -- refusing to proceed (none are audited)';
    END IF;
  END IF;

  -- set_updated_at(): accept absent, or accept only the exact final
  -- hardened contract (same acceptance logic as 20260920072450's own
  -- preflight, applied here in the reverse direction -- this migration
  -- runs first, so "compatible" here means an operator or a prior partial
  -- run already created the exact hardened shape).
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'set_updated_at';

  IF fn_count NOT IN (0, 1) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: preflight: % objects named public.set_updated_at exist -- expected 0 or 1, refusing to proceed',
      fn_count;
  END IF;

  IF fn_count = 1 THEN
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
        'baseline_core_recipe_catalog_schema: preflight: public.set_updated_at exists but does not match the required properties (kind/args/rettype/retset/lang/secdef/volatility/strict/parallel/leakproof/owner) -- refusing to proceed';
    END IF;

    IF NOT (
      fn_pre.proconfig IS NULL
      OR (pg_catalog.array_length(fn_pre.proconfig, 1) = 1
          AND 'search_path=pg_catalog' = ANY (fn_pre.proconfig))
    ) THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: public.set_updated_at proconfig is % -- expected NULL or exactly {search_path=pg_catalog} -- refusing to proceed',
        fn_pre.proconfig;
    END IF;

    IF fn_pre_body_norm IS DISTINCT FROM fn_canonical_body THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: public.set_updated_at body does not match the canonical NEW.updated_at = now(); RETURN NEW; definition -- refusing to proceed (normalized body: %)',
        fn_pre_body_norm;
    END IF;

    -- Generic non-owner ACL scan: any EXECUTE or grant option for anyone
    -- but the owner fails closed.
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p,
             pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
       WHERE p.oid = (SELECT p2.oid FROM pg_catalog.pg_proc p2 JOIN pg_catalog.pg_namespace n2 ON n2.oid=p2.pronamespace
                       WHERE n2.nspname='public' AND p2.proname='set_updated_at')
         AND a.grantee IS DISTINCT FROM p.proowner
         AND (a.privilege_type = 'EXECUTE' OR a.is_grantable)
    ) THEN
      RAISE EXCEPTION
        'baseline_core_recipe_catalog_schema: preflight: a non-owner grantee holds EXECUTE or a grant option on public.set_updated_at -- refusing to proceed';
    END IF;
  END IF;
END;
$preflight$;

-- ============================================================================
-- B. Static creation -- fresh path only (compatible path: nothing further
--    to do, every statement below is natively idempotent via IF NOT EXISTS
--    or its own existence guard).
-- ============================================================================

-- B0. set_updated_at() prerequisite -- byte-exact final hardened contract,
-- identical to what 20260920072450_baseline_and_harden_set_updated_at.sql
-- itself asserts. Not a new hardening pass: this is the one and only
-- accepted-as-final shape, created here only because recipes' trigger
-- (below) needs it to exist before that later migration ever runs.
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

ALTER FUNCTION public.set_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;

-- B1. ingredients, units, equipment -- no FK dependencies within this slice.
CREATE TABLE IF NOT EXISTS public.ingredients (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  category            text,
  slug                text NOT NULL,
  aliases             text[] NOT NULL DEFAULT '{}'::text[],
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),
  shopping_category   text,
  is_pantry_default   boolean NOT NULL DEFAULT false,
  name_en             text,
  name_zh             text,
  CONSTRAINT ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT ingredients_slug_key UNIQUE (slug),
  CONSTRAINT ingredients_shopping_category_check CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY['vegetable'::text, 'meat_seafood'::text, 'tofu_egg'::text, 'dairy'::text, 'carb'::text, 'pantry'::text, 'seasoning'::text, 'frozen'::text, 'other'::text]))))
);
ALTER TABLE public.ingredients OWNER TO postgres;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ingredients_is_pantry_default ON public.ingredients USING btree (is_pantry_default);
CREATE INDEX IF NOT EXISTS idx_ingredients_shopping_category ON public.ingredients USING btree (shopping_category);
CREATE INDEX IF NOT EXISTS ingredients_active_idx ON public.ingredients USING btree (is_active);

CREATE TABLE IF NOT EXISTS public.units (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  code                text NOT NULL,
  name                text NOT NULL,
  unit_type           text NOT NULL,
  to_base             numeric NOT NULL,
  display_name_en     text,
  display_name_zh     text,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_code_key UNIQUE (code),
  CONSTRAINT units_to_base_check CHECK ((to_base > (0)::numeric)),
  CONSTRAINT units_unit_type_check CHECK ((unit_type = ANY (ARRAY['mass'::text, 'volume'::text, 'count'::text])))
);
ALTER TABLE public.units OWNER TO postgres;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.equipment (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  category     text,
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT equipment_pkey PRIMARY KEY (id)
);
ALTER TABLE public.equipment OWNER TO postgres;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- B2. recipes -- no FK dependency within this slice (author_id references
-- auth.users, a Supabase-managed schema, referenced but not recreated).
CREATE TABLE IF NOT EXISTS public.recipes (
  id                     uuid NOT NULL DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  description            text,
  image_url              text,
  cuisine                text NOT NULL,
  dish_type              text NOT NULL,
  method                 text NOT NULL,
  speed                  text NOT NULL,
  difficulty             text NOT NULL,
  protein                text[] NOT NULL DEFAULT '{}'::text[],
  diet                   text[] NOT NULL DEFAULT '{}'::text[],
  flavor                 text[] NOT NULL DEFAULT '{}'::text[],
  base_servings          integer NOT NULL DEFAULT 1,
  calories_per_serving   integer,
  protein_g              numeric,
  carbs_g                numeric,
  fat_g                  numeric,
  is_public              boolean NOT NULL DEFAULT true,
  author_id              uuid,
  created_at             timestamp with time zone NOT NULL DEFAULT now(),
  updated_at             timestamp with time zone NOT NULL DEFAULT now(),
  slug                   text,
  prep_time_minutes      integer,
  cook_time_minutes      integer,
  total_time_minutes     integer,
  servings_unit          text DEFAULT 'portion'::text,
  meal_role              text,
  is_complete_meal       boolean NOT NULL DEFAULT false,
  primary_protein        text,
  excluded_tags          text[] NOT NULL DEFAULT '{}'::text[],
  budget_level           text,
  reuse_group            text,
  times_shown            integer DEFAULT 0,
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_slug_key UNIQUE (slug),
  CONSTRAINT recipes_base_servings_check CHECK ((base_servings > 0)),
  CONSTRAINT recipes_budget_level_check CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY['budget'::text, 'normal'::text, 'premium'::text])))),
  CONSTRAINT recipes_cuisine_check CHECK ((cuisine = ANY (ARRAY['chinese'::text, 'western'::text, 'japanese'::text, 'korean'::text, 'thai'::text, 'fusion'::text]))),
  CONSTRAINT recipes_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
  CONSTRAINT recipes_dish_type_check CHECK ((dish_type = ANY (ARRAY['main'::text, 'side'::text, 'soup'::text, 'staple'::text, 'snack'::text]))),
  CONSTRAINT recipes_meal_role_check CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY['complete_meal'::text, 'protein_main'::text, 'veg_side'::text, 'protein_side'::text, 'soup'::text])))),
  CONSTRAINT recipes_method_check CHECK ((method = ANY (ARRAY['stir_fry'::text, 'steamed'::text, 'fried'::text, 'braised'::text, 'boiled'::text, 'baked'::text]))),
  CONSTRAINT recipes_primary_protein_check CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY['chicken'::text, 'beef'::text, 'pork'::text, 'fish'::text, 'seafood'::text, 'shrimp'::text, 'tofu'::text, 'egg'::text, 'vegetarian'::text, 'mixed'::text])))),
  CONSTRAINT recipes_speed_check CHECK ((speed = ANY (ARRAY['quick'::text, 'normal'::text, 'slow'::text])))
);
ALTER TABLE public.recipes OWNER TO postgres;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recipes_budget_level ON public.recipes USING btree (budget_level);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON public.recipes USING btree (cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_diet_gin ON public.recipes USING gin (diet);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON public.recipes USING btree (difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_excluded_tags_gin ON public.recipes USING gin (excluded_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_role ON public.recipes USING btree (meal_role);
CREATE INDEX IF NOT EXISTS idx_recipes_method ON public.recipes USING btree (method);
CREATE INDEX IF NOT EXISTS idx_recipes_primary_protein ON public.recipes USING btree (primary_protein);
CREATE INDEX IF NOT EXISTS idx_recipes_protein_gin ON public.recipes USING gin (protein);
CREATE INDEX IF NOT EXISTS idx_recipes_protein_g ON public.recipes USING btree (protein_g);
CREATE INDEX IF NOT EXISTS idx_recipes_slug ON public.recipes USING btree (slug);
CREATE INDEX IF NOT EXISTS idx_recipes_times_shown ON public.recipes USING btree (times_shown DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_recipes_total_time_minutes ON public.recipes USING btree (total_time_minutes);
CREATE INDEX IF NOT EXISTS recipes_cuisine_idx ON public.recipes USING btree (cuisine);
CREATE INDEX IF NOT EXISTS recipes_diet_gin ON public.recipes USING gin (diet);
CREATE INDEX IF NOT EXISTS recipes_difficulty_idx ON public.recipes USING btree (difficulty);
CREATE INDEX IF NOT EXISTS recipes_dish_type_idx ON public.recipes USING btree (dish_type);
CREATE INDEX IF NOT EXISTS recipes_flavor_gin ON public.recipes USING gin (flavor);
CREATE INDEX IF NOT EXISTS recipes_method_idx ON public.recipes USING btree (method);
CREATE INDEX IF NOT EXISTS recipes_protein_gin ON public.recipes USING gin (protein);
CREATE INDEX IF NOT EXISTS recipes_search_idx ON public.recipes USING gin (to_tsvector('english'::regconfig, ((name || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX IF NOT EXISTS recipes_speed_idx ON public.recipes USING btree (speed);

-- recipes' own updated_at trigger, guarded (CREATE TRIGGER has no native
-- IF NOT EXISTS) -- fully static literal DDL text, no interpolation.
DO $create_recipes_trigger$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'recipes'
       AND t.tgname = 'trg_recipes_updated_at' AND NOT t.tgisinternal
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER trg_recipes_updated_at
        BEFORE UPDATE ON public.recipes
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $sql$;
  END IF;
END;
$create_recipes_trigger$;

-- B3. recipe_ingredients, recipe_steps, recipe_equipment -- depend on
-- recipes (+ ingredients/units for recipe_ingredients, + equipment for
-- recipe_equipment).
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL,
  ingredient_id uuid NOT NULL,
  quantity      numeric NOT NULL,
  unit_id       uuid NOT NULL,
  is_optional   boolean NOT NULL DEFAULT false,
  group_key     text,
  prep_note     text,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredients_recipe_id_ingredient_id_key UNIQUE (recipe_id, ingredient_id),
  CONSTRAINT recipe_ingredients_quantity_check CHECK ((quantity >= (0)::numeric)),
  CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT recipe_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
  CONSTRAINT recipe_ingredients_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id)
);
ALTER TABLE public.recipe_ingredients OWNER TO postgres;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id);
CREATE INDEX IF NOT EXISTS recipe_ingredients_ingredient_idx ON public.recipe_ingredients USING btree (ingredient_id);
CREATE INDEX IF NOT EXISTS recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id);

CREATE TABLE IF NOT EXISTS public.recipe_steps (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id     uuid NOT NULL,
  step_no       integer NOT NULL,
  text          text NOT NULL,
  time_seconds  integer,
  image_url     text,
  CONSTRAINT recipe_steps_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_steps_recipe_id_step_no_key UNIQUE (recipe_id, step_no),
  CONSTRAINT recipe_steps_step_no_check CHECK ((step_no > 0)),
  CONSTRAINT recipe_steps_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);
ALTER TABLE public.recipe_steps OWNER TO postgres;
ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id_step_no ON public.recipe_steps USING btree (recipe_id, step_no);
CREATE INDEX IF NOT EXISTS recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id);

CREATE TABLE IF NOT EXISTS public.recipe_equipment (
  recipe_id     uuid NOT NULL,
  equipment_id  uuid NOT NULL,
  is_optional   boolean NOT NULL DEFAULT false,
  note          text,
  CONSTRAINT recipe_equipment_pkey PRIMARY KEY (recipe_id, equipment_id),
  CONSTRAINT recipe_equipment_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
  CONSTRAINT recipe_equipment_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES equipment(id)
);
ALTER TABLE public.recipe_equipment OWNER TO postgres;
ALTER TABLE public.recipe_equipment ENABLE ROW LEVEL SECURITY;

-- B4. ingredient_substitutions -- depends on ingredients (self-referential
-- pair of FKs to the same table).
CREATE TABLE IF NOT EXISTS public.ingredient_substitutions (
  id                          uuid NOT NULL DEFAULT gen_random_uuid(),
  ingredient_id               uuid NOT NULL,
  substitute_ingredient_id    uuid NOT NULL,
  ratio                       numeric NOT NULL DEFAULT 1,
  note                        text,
  created_at                  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_substitutions_pkey PRIMARY KEY (id),
  CONSTRAINT unique_substitution UNIQUE (ingredient_id, substitute_ingredient_id),
  CONSTRAINT ingredient_substitutions_ratio_check CHECK ((ratio > (0)::numeric)),
  CONSTRAINT ingredient_substitutions_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  CONSTRAINT ingredient_substitutions_substitute_ingredient_id_fkey FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);
ALTER TABLE public.ingredient_substitutions OWNER TO postgres;
ALTER TABLE public.ingredient_substitutions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ingredient_subs_ing_idx ON public.ingredient_substitutions USING btree (ingredient_id);

-- B5. Policies -- guarded (CREATE POLICY has no native IF NOT EXISTS).
-- Every EXECUTE body below is fully static literal DDL text.
-- HARDENED CONTRACT: exactly the 8 SELECT-only policies are created here.
-- The 7 vulnerable write policies a prior draft of this migration created
-- (4 on recipes, 3 child-table FOR ALL policies) are intentionally NOT
-- created -- see the header's "HARDENED-CONTRACT CORRECTION" note.
DO $create_policies$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='ingredients' AND policyname='read ingredients') THEN
    EXECUTE $sql$ CREATE POLICY "read ingredients" ON public.ingredients FOR SELECT USING (true) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='units' AND policyname='read units') THEN
    EXECUTE $sql$ CREATE POLICY "read units" ON public.units FOR SELECT USING (true) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='equipment' AND policyname='read equipment') THEN
    EXECUTE $sql$ CREATE POLICY "read equipment" ON public.equipment FOR SELECT USING (true) $sql$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipes' AND policyname='read public recipes') THEN
    EXECUTE $sql$ CREATE POLICY "read public recipes" ON public.recipes FOR SELECT USING (is_public = true) $sql$;
  END IF;





  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_ingredients' AND policyname='read ingredients for visible recipes') THEN
    EXECUTE $sql$ CREATE POLICY "read ingredients for visible recipes" ON public.recipe_ingredients FOR SELECT USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_ingredients.recipe_id AND r.is_public = true)) $sql$;
  END IF;


  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_steps' AND policyname='read steps for visible recipes') THEN
    EXECUTE $sql$ CREATE POLICY "read steps for visible recipes" ON public.recipe_steps FOR SELECT USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_steps.recipe_id AND r.is_public = true)) $sql$;
  END IF;


  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='recipe_equipment' AND policyname='read equipment for visible recipes') THEN
    EXECUTE $sql$ CREATE POLICY "read equipment for visible recipes" ON public.recipe_equipment FOR SELECT USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_equipment.recipe_id AND r.is_public = true)) $sql$;
  END IF;


  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='ingredient_substitutions' AND policyname='read ingredient substitutions') THEN
    EXECUTE $sql$ CREATE POLICY "read ingredient substitutions" ON public.ingredient_substitutions FOR SELECT USING (true) $sql$;
  END IF;
END;
$create_policies$;

-- B6. ACL narrowing -- HARDENED CONTRACT. The project's own pre-existing
-- `ALTER DEFAULT PRIVILEGES` (Supabase project template configuration, not
-- touched by this migration) grants the plain 8-privilege default to
-- anon/authenticated/postgres/service_role on any table freshly created by
-- postgres. That plain default is the vulnerable pre-hardening ACL shape.
-- This guarded block narrows anon/authenticated to SELECT-only on all 8
-- tables via static, literal REVOKE statements (never `ALTER DEFAULT
-- PRIVILEGES`), matching the exact target ACL 20260921175321 already
-- applies to production. The guard checks whether any of the 8 tables'
-- anon/authenticated ACL still carries a non-SELECT privilege; if none do
-- (i.e. this is the compatible path re-running against an already-hardened
-- database), the EXECUTE calls below never run at all -- true zero writes
-- on the compatible path, not merely idempotent no-op writes.
DO $narrow_acl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
           pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     WHERE n.nspname='public'
       AND c.relname = ANY (ARRAY['ingredients','units','equipment','recipes',
                                   'recipe_ingredients','recipe_steps',
                                   'recipe_equipment','ingredient_substitutions'])
       AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END) IN ('anon','authenticated')
       AND a.privilege_type <> 'SELECT'
  ) THEN
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.ingredients FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.units FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.equipment FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.recipes FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.recipe_ingredients FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.recipe_steps FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.recipe_equipment FROM anon, authenticated $sql$;
    EXECUTE $sql$ REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.ingredient_substitutions FROM anon, authenticated $sql$;
  END IF;
END;
$narrow_acl$;

-- The postcheck below verifies the resulting 144-row hardened ACL
-- explicitly rather than assuming either the environment default or this
-- block's own REVOKE calls held.

-- ============================================================================
-- C. Read-only postcondition -- reassert the complete final contract for
--    every object in scope. Fail closed on any mismatch. On the compatible
--    path, additionally require every OID to be unchanged from preflight.
-- ============================================================================
DO $postcheck$
DECLARE
  target_tables    text[] := ARRAY['ingredients','units','equipment','recipes',
                                    'recipe_ingredients','recipe_steps',
                                    'recipe_equipment','ingredient_substitutions'];
  present_count    int;
  mismatch_count   int;
  fn_count         int;
  post             record;
  canonical_body   text := 'BEGIN NEW.updated_at = now(); RETURN NEW; END;';
  post_body_norm   text;
BEGIN
  SELECT pg_catalog.count(*) INTO present_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND c.relname = ANY (target_tables);

  IF present_count <> 8 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % of 8 target tables exist -- expected exactly 8, rolling back',
      present_count;
  END IF;

  -- Owner, RLS.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
       AND (pg_catalog.pg_get_userbyid(c.relowner) IS DISTINCT FROM 'postgres'
            OR c.relrowsecurity IS DISTINCT FROM true
            OR c.relforcerowsecurity IS DISTINCT FROM false)
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: owner or RLS state mismatch among the 8 target tables -- rolling back';
  END IF;

  -- Columns: full symmetric-content diff (name/type/notnull/default),
  -- reusing the same audited VALUES preflight used -- not a bare count.
  SELECT count(*) INTO mismatch_count
  FROM (
    (
    SELECT * FROM (VALUES
      ('ingredients',1,'id','uuid',true,'gen_random_uuid()'),
      ('ingredients',2,'name','text',true,'NULL'),
      ('ingredients',3,'category','text',false,'NULL'),
      ('ingredients',4,'slug','text',true,'NULL'),
      ('ingredients',5,'aliases','text[]',true,'''{}''::text[]'),
      ('ingredients',6,'is_active','boolean',true,'true'),
      ('ingredients',7,'created_at','timestamp with time zone',true,'now()'),
      ('ingredients',8,'shopping_category','text',false,'NULL'),
      ('ingredients',9,'is_pantry_default','boolean',true,'false'),
      ('ingredients',10,'name_en','text',false,'NULL'),
      ('ingredients',11,'name_zh','text',false,'NULL'),
      ('units',1,'id','uuid',true,'gen_random_uuid()'),
      ('units',2,'code','text',true,'NULL'),
      ('units',3,'name','text',true,'NULL'),
      ('units',4,'unit_type','text',true,'NULL'),
      ('units',5,'to_base','numeric',true,'NULL'),
      ('units',6,'display_name_en','text',false,'NULL'),
      ('units',7,'display_name_zh','text',false,'NULL'),
      ('equipment',1,'id','uuid',true,'gen_random_uuid()'),
      ('equipment',2,'name','text',true,'NULL'),
      ('equipment',3,'category','text',false,'NULL'),
      ('equipment',4,'created_at','timestamp with time zone',true,'now()'),
      ('recipes',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipes',2,'name','text',true,'NULL'),
      ('recipes',3,'description','text',false,'NULL'),
      ('recipes',4,'image_url','text',false,'NULL'),
      ('recipes',5,'cuisine','text',true,'NULL'),
      ('recipes',6,'dish_type','text',true,'NULL'),
      ('recipes',7,'method','text',true,'NULL'),
      ('recipes',8,'speed','text',true,'NULL'),
      ('recipes',9,'difficulty','text',true,'NULL'),
      ('recipes',10,'protein','text[]',true,'''{}''::text[]'),
      ('recipes',11,'diet','text[]',true,'''{}''::text[]'),
      ('recipes',12,'flavor','text[]',true,'''{}''::text[]'),
      ('recipes',13,'base_servings','integer',true,'1'),
      ('recipes',14,'calories_per_serving','integer',false,'NULL'),
      ('recipes',15,'protein_g','numeric',false,'NULL'),
      ('recipes',16,'carbs_g','numeric',false,'NULL'),
      ('recipes',17,'fat_g','numeric',false,'NULL'),
      ('recipes',18,'is_public','boolean',true,'true'),
      ('recipes',19,'author_id','uuid',false,'NULL'),
      ('recipes',20,'created_at','timestamp with time zone',true,'now()'),
      ('recipes',21,'updated_at','timestamp with time zone',true,'now()'),
      ('recipes',22,'slug','text',false,'NULL'),
      ('recipes',23,'prep_time_minutes','integer',false,'NULL'),
      ('recipes',24,'cook_time_minutes','integer',false,'NULL'),
      ('recipes',25,'total_time_minutes','integer',false,'NULL'),
      ('recipes',26,'servings_unit','text',false,'''portion''::text'),
      ('recipes',27,'meal_role','text',false,'NULL'),
      ('recipes',28,'is_complete_meal','boolean',true,'false'),
      ('recipes',29,'primary_protein','text',false,'NULL'),
      ('recipes',30,'excluded_tags','text[]',true,'''{}''::text[]'),
      ('recipes',31,'budget_level','text',false,'NULL'),
      ('recipes',32,'reuse_group','text',false,'NULL'),
      ('recipes',33,'times_shown','integer',false,'0'),
      ('recipe_ingredients',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipe_ingredients',2,'recipe_id','uuid',true,'NULL'),
      ('recipe_ingredients',3,'ingredient_id','uuid',true,'NULL'),
      ('recipe_ingredients',4,'quantity','numeric',true,'NULL'),
      ('recipe_ingredients',5,'unit_id','uuid',true,'NULL'),
      ('recipe_ingredients',6,'is_optional','boolean',true,'false'),
      ('recipe_ingredients',7,'group_key','text',false,'NULL'),
      ('recipe_ingredients',8,'prep_note','text',false,'NULL'),
      ('recipe_ingredients',9,'created_at','timestamp with time zone',true,'now()'),
      ('recipe_steps',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipe_steps',2,'recipe_id','uuid',true,'NULL'),
      ('recipe_steps',3,'step_no','integer',true,'NULL'),
      ('recipe_steps',4,'text','text',true,'NULL'),
      ('recipe_steps',5,'time_seconds','integer',false,'NULL'),
      ('recipe_steps',6,'image_url','text',false,'NULL'),
      ('recipe_equipment',1,'recipe_id','uuid',true,'NULL'),
      ('recipe_equipment',2,'equipment_id','uuid',true,'NULL'),
      ('recipe_equipment',3,'is_optional','boolean',true,'false'),
      ('recipe_equipment',4,'note','text',false,'NULL'),
      ('ingredient_substitutions',1,'id','uuid',true,'gen_random_uuid()'),
      ('ingredient_substitutions',2,'ingredient_id','uuid',true,'NULL'),
      ('ingredient_substitutions',3,'substitute_ingredient_id','uuid',true,'NULL'),
      ('ingredient_substitutions',4,'ratio','numeric',true,'1'),
      ('ingredient_substitutions',5,'note','text',false,'NULL'),
      ('ingredient_substitutions',6,'created_at','timestamp with time zone',true,'now()')
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
      ('ingredients',1,'id','uuid',true,'gen_random_uuid()'),
      ('ingredients',2,'name','text',true,'NULL'),
      ('ingredients',3,'category','text',false,'NULL'),
      ('ingredients',4,'slug','text',true,'NULL'),
      ('ingredients',5,'aliases','text[]',true,'''{}''::text[]'),
      ('ingredients',6,'is_active','boolean',true,'true'),
      ('ingredients',7,'created_at','timestamp with time zone',true,'now()'),
      ('ingredients',8,'shopping_category','text',false,'NULL'),
      ('ingredients',9,'is_pantry_default','boolean',true,'false'),
      ('ingredients',10,'name_en','text',false,'NULL'),
      ('ingredients',11,'name_zh','text',false,'NULL'),
      ('units',1,'id','uuid',true,'gen_random_uuid()'),
      ('units',2,'code','text',true,'NULL'),
      ('units',3,'name','text',true,'NULL'),
      ('units',4,'unit_type','text',true,'NULL'),
      ('units',5,'to_base','numeric',true,'NULL'),
      ('units',6,'display_name_en','text',false,'NULL'),
      ('units',7,'display_name_zh','text',false,'NULL'),
      ('equipment',1,'id','uuid',true,'gen_random_uuid()'),
      ('equipment',2,'name','text',true,'NULL'),
      ('equipment',3,'category','text',false,'NULL'),
      ('equipment',4,'created_at','timestamp with time zone',true,'now()'),
      ('recipes',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipes',2,'name','text',true,'NULL'),
      ('recipes',3,'description','text',false,'NULL'),
      ('recipes',4,'image_url','text',false,'NULL'),
      ('recipes',5,'cuisine','text',true,'NULL'),
      ('recipes',6,'dish_type','text',true,'NULL'),
      ('recipes',7,'method','text',true,'NULL'),
      ('recipes',8,'speed','text',true,'NULL'),
      ('recipes',9,'difficulty','text',true,'NULL'),
      ('recipes',10,'protein','text[]',true,'''{}''::text[]'),
      ('recipes',11,'diet','text[]',true,'''{}''::text[]'),
      ('recipes',12,'flavor','text[]',true,'''{}''::text[]'),
      ('recipes',13,'base_servings','integer',true,'1'),
      ('recipes',14,'calories_per_serving','integer',false,'NULL'),
      ('recipes',15,'protein_g','numeric',false,'NULL'),
      ('recipes',16,'carbs_g','numeric',false,'NULL'),
      ('recipes',17,'fat_g','numeric',false,'NULL'),
      ('recipes',18,'is_public','boolean',true,'true'),
      ('recipes',19,'author_id','uuid',false,'NULL'),
      ('recipes',20,'created_at','timestamp with time zone',true,'now()'),
      ('recipes',21,'updated_at','timestamp with time zone',true,'now()'),
      ('recipes',22,'slug','text',false,'NULL'),
      ('recipes',23,'prep_time_minutes','integer',false,'NULL'),
      ('recipes',24,'cook_time_minutes','integer',false,'NULL'),
      ('recipes',25,'total_time_minutes','integer',false,'NULL'),
      ('recipes',26,'servings_unit','text',false,'''portion''::text'),
      ('recipes',27,'meal_role','text',false,'NULL'),
      ('recipes',28,'is_complete_meal','boolean',true,'false'),
      ('recipes',29,'primary_protein','text',false,'NULL'),
      ('recipes',30,'excluded_tags','text[]',true,'''{}''::text[]'),
      ('recipes',31,'budget_level','text',false,'NULL'),
      ('recipes',32,'reuse_group','text',false,'NULL'),
      ('recipes',33,'times_shown','integer',false,'0'),
      ('recipe_ingredients',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipe_ingredients',2,'recipe_id','uuid',true,'NULL'),
      ('recipe_ingredients',3,'ingredient_id','uuid',true,'NULL'),
      ('recipe_ingredients',4,'quantity','numeric',true,'NULL'),
      ('recipe_ingredients',5,'unit_id','uuid',true,'NULL'),
      ('recipe_ingredients',6,'is_optional','boolean',true,'false'),
      ('recipe_ingredients',7,'group_key','text',false,'NULL'),
      ('recipe_ingredients',8,'prep_note','text',false,'NULL'),
      ('recipe_ingredients',9,'created_at','timestamp with time zone',true,'now()'),
      ('recipe_steps',1,'id','uuid',true,'gen_random_uuid()'),
      ('recipe_steps',2,'recipe_id','uuid',true,'NULL'),
      ('recipe_steps',3,'step_no','integer',true,'NULL'),
      ('recipe_steps',4,'text','text',true,'NULL'),
      ('recipe_steps',5,'time_seconds','integer',false,'NULL'),
      ('recipe_steps',6,'image_url','text',false,'NULL'),
      ('recipe_equipment',1,'recipe_id','uuid',true,'NULL'),
      ('recipe_equipment',2,'equipment_id','uuid',true,'NULL'),
      ('recipe_equipment',3,'is_optional','boolean',true,'false'),
      ('recipe_equipment',4,'note','text',false,'NULL'),
      ('ingredient_substitutions',1,'id','uuid',true,'gen_random_uuid()'),
      ('ingredient_substitutions',2,'ingredient_id','uuid',true,'NULL'),
      ('ingredient_substitutions',3,'substitute_ingredient_id','uuid',true,'NULL'),
      ('ingredient_substitutions',4,'ratio','numeric',true,'1'),
      ('ingredient_substitutions',5,'note','text',false,'NULL'),
      ('ingredient_substitutions',6,'created_at','timestamp with time zone',true,'now()')
    ) AS expected2(tbl, attnum, attname, atttype, is_notnull, def)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % column-row mismatches found across the 8 target tables -- rolling back',
      mismatch_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped AND c.relname = ANY (target_tables)
       AND (a.attidentity <> '' OR a.attgenerated <> '')
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: an identity or generated column exists -- rolling back';
  END IF;

  -- Constraints: full symmetric-content diff (name/type/definition).
  SELECT count(*) INTO mismatch_count
  FROM (
    (
    SELECT * FROM (VALUES
      ('equipment','equipment_pkey','p','PRIMARY KEY (id)'),
      ('ingredient_substitutions','ingredient_substitutions_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
      ('ingredient_substitutions','ingredient_substitutions_pkey','p','PRIMARY KEY (id)'),
      ('ingredient_substitutions','ingredient_substitutions_ratio_check','c','CHECK ((ratio > (0)::numeric))'),
      ('ingredient_substitutions','ingredient_substitutions_substitute_ingredient_id_fkey','f','FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
      ('ingredient_substitutions','unique_substitution','u','UNIQUE (ingredient_id, substitute_ingredient_id)'),
      ('ingredients','ingredients_pkey','p','PRIMARY KEY (id)'),
      ('ingredients','ingredients_shopping_category_check','c','CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY[''vegetable''::text, ''meat_seafood''::text, ''tofu_egg''::text, ''dairy''::text, ''carb''::text, ''pantry''::text, ''seasoning''::text, ''frozen''::text, ''other''::text]))))'),
      ('ingredients','ingredients_slug_key','u','UNIQUE (slug)'),
      ('recipe_equipment','recipe_equipment_equipment_id_fkey','f','FOREIGN KEY (equipment_id) REFERENCES equipment(id)'),
      ('recipe_equipment','recipe_equipment_pkey','p','PRIMARY KEY (recipe_id, equipment_id)'),
      ('recipe_equipment','recipe_equipment_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_ingredients','recipe_ingredients_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'),
      ('recipe_ingredients','recipe_ingredients_pkey','p','PRIMARY KEY (id)'),
      ('recipe_ingredients','recipe_ingredients_quantity_check','c','CHECK ((quantity >= (0)::numeric))'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','u','UNIQUE (recipe_id, ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_unit_id_fkey','f','FOREIGN KEY (unit_id) REFERENCES units(id)'),
      ('recipe_steps','recipe_steps_pkey','p','PRIMARY KEY (id)'),
      ('recipe_steps','recipe_steps_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_steps','recipe_steps_recipe_id_step_no_key','u','UNIQUE (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_step_no_check','c','CHECK ((step_no > 0))'),
      ('recipes','recipes_base_servings_check','c','CHECK ((base_servings > 0))'),
      ('recipes','recipes_budget_level_check','c','CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY[''budget''::text, ''normal''::text, ''premium''::text]))))'),
      ('recipes','recipes_cuisine_check','c','CHECK ((cuisine = ANY (ARRAY[''chinese''::text, ''western''::text, ''japanese''::text, ''korean''::text, ''thai''::text, ''fusion''::text])))'),
      ('recipes','recipes_difficulty_check','c','CHECK ((difficulty = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text])))'),
      ('recipes','recipes_dish_type_check','c','CHECK ((dish_type = ANY (ARRAY[''main''::text, ''side''::text, ''soup''::text, ''staple''::text, ''snack''::text])))'),
      ('recipes','recipes_meal_role_check','c','CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
      ('recipes','recipes_method_check','c','CHECK ((method = ANY (ARRAY[''stir_fry''::text, ''steamed''::text, ''fried''::text, ''braised''::text, ''boiled''::text, ''baked''::text])))'),
      ('recipes','recipes_pkey','p','PRIMARY KEY (id)'),
      ('recipes','recipes_primary_protein_check','c','CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY[''chicken''::text, ''beef''::text, ''pork''::text, ''fish''::text, ''seafood''::text, ''shrimp''::text, ''tofu''::text, ''egg''::text, ''vegetarian''::text, ''mixed''::text]))))'),
      ('recipes','recipes_slug_key','u','UNIQUE (slug)'),
      ('recipes','recipes_speed_check','c','CHECK ((speed = ANY (ARRAY[''quick''::text, ''normal''::text, ''slow''::text])))'),
      ('units','units_code_key','u','UNIQUE (code)'),
      ('units','units_pkey','p','PRIMARY KEY (id)'),
      ('units','units_to_base_check','c','CHECK ((to_base > (0)::numeric))'),
      ('units','units_unit_type_check','c','CHECK ((unit_type = ANY (ARRAY[''mass''::text, ''volume''::text, ''count''::text])))')
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
      ('equipment','equipment_pkey','p','PRIMARY KEY (id)'),
      ('ingredient_substitutions','ingredient_substitutions_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
      ('ingredient_substitutions','ingredient_substitutions_pkey','p','PRIMARY KEY (id)'),
      ('ingredient_substitutions','ingredient_substitutions_ratio_check','c','CHECK ((ratio > (0)::numeric))'),
      ('ingredient_substitutions','ingredient_substitutions_substitute_ingredient_id_fkey','f','FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE'),
      ('ingredient_substitutions','unique_substitution','u','UNIQUE (ingredient_id, substitute_ingredient_id)'),
      ('ingredients','ingredients_pkey','p','PRIMARY KEY (id)'),
      ('ingredients','ingredients_shopping_category_check','c','CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY[''vegetable''::text, ''meat_seafood''::text, ''tofu_egg''::text, ''dairy''::text, ''carb''::text, ''pantry''::text, ''seasoning''::text, ''frozen''::text, ''other''::text]))))'),
      ('ingredients','ingredients_slug_key','u','UNIQUE (slug)'),
      ('recipe_equipment','recipe_equipment_equipment_id_fkey','f','FOREIGN KEY (equipment_id) REFERENCES equipment(id)'),
      ('recipe_equipment','recipe_equipment_pkey','p','PRIMARY KEY (recipe_id, equipment_id)'),
      ('recipe_equipment','recipe_equipment_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_ingredients','recipe_ingredients_ingredient_id_fkey','f','FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'),
      ('recipe_ingredients','recipe_ingredients_pkey','p','PRIMARY KEY (id)'),
      ('recipe_ingredients','recipe_ingredients_quantity_check','c','CHECK ((quantity >= (0)::numeric))'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','u','UNIQUE (recipe_id, ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_unit_id_fkey','f','FOREIGN KEY (unit_id) REFERENCES units(id)'),
      ('recipe_steps','recipe_steps_pkey','p','PRIMARY KEY (id)'),
      ('recipe_steps','recipe_steps_recipe_id_fkey','f','FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'),
      ('recipe_steps','recipe_steps_recipe_id_step_no_key','u','UNIQUE (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_step_no_check','c','CHECK ((step_no > 0))'),
      ('recipes','recipes_base_servings_check','c','CHECK ((base_servings > 0))'),
      ('recipes','recipes_budget_level_check','c','CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY[''budget''::text, ''normal''::text, ''premium''::text]))))'),
      ('recipes','recipes_cuisine_check','c','CHECK ((cuisine = ANY (ARRAY[''chinese''::text, ''western''::text, ''japanese''::text, ''korean''::text, ''thai''::text, ''fusion''::text])))'),
      ('recipes','recipes_difficulty_check','c','CHECK ((difficulty = ANY (ARRAY[''easy''::text, ''medium''::text, ''hard''::text])))'),
      ('recipes','recipes_dish_type_check','c','CHECK ((dish_type = ANY (ARRAY[''main''::text, ''side''::text, ''soup''::text, ''staple''::text, ''snack''::text])))'),
      ('recipes','recipes_meal_role_check','c','CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY[''complete_meal''::text, ''protein_main''::text, ''veg_side''::text, ''protein_side''::text, ''soup''::text]))))'),
      ('recipes','recipes_method_check','c','CHECK ((method = ANY (ARRAY[''stir_fry''::text, ''steamed''::text, ''fried''::text, ''braised''::text, ''boiled''::text, ''baked''::text])))'),
      ('recipes','recipes_pkey','p','PRIMARY KEY (id)'),
      ('recipes','recipes_primary_protein_check','c','CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY[''chicken''::text, ''beef''::text, ''pork''::text, ''fish''::text, ''seafood''::text, ''shrimp''::text, ''tofu''::text, ''egg''::text, ''vegetarian''::text, ''mixed''::text]))))'),
      ('recipes','recipes_slug_key','u','UNIQUE (slug)'),
      ('recipes','recipes_speed_check','c','CHECK ((speed = ANY (ARRAY[''quick''::text, ''normal''::text, ''slow''::text])))'),
      ('units','units_code_key','u','UNIQUE (code)'),
      ('units','units_pkey','p','PRIMARY KEY (id)'),
      ('units','units_to_base_check','c','CHECK ((to_base > (0)::numeric))'),
      ('units','units_unit_type_check','c','CHECK ((unit_type = ANY (ARRAY[''mass''::text, ''volume''::text, ''count''::text])))')
    ) AS expected2(tbl, conname, contype, condef)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % constraint-row mismatches found across the 8 target tables -- rolling back',
      mismatch_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint co
      JOIN pg_catalog.pg_class c ON c.oid = co.conrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
       AND (co.convalidated IS DISTINCT FROM true OR co.condeferrable IS DISTINCT FROM false OR co.condeferred IS DISTINCT FROM false)
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: a constraint is not validated/non-deferrable/non-deferred -- rolling back';
  END IF;

  -- Indexes: full symmetric-content diff (table/name/definition).
  SELECT count(*) INTO mismatch_count
  FROM (
    (
    SELECT * FROM (VALUES
      ('equipment','equipment_pkey','CREATE UNIQUE INDEX equipment_pkey ON public.equipment USING btree (id)'),
      ('ingredient_substitutions','ingredient_subs_ing_idx','CREATE INDEX ingredient_subs_ing_idx ON public.ingredient_substitutions USING btree (ingredient_id)'),
      ('ingredient_substitutions','ingredient_substitutions_pkey','CREATE UNIQUE INDEX ingredient_substitutions_pkey ON public.ingredient_substitutions USING btree (id)'),
      ('ingredient_substitutions','unique_substitution','CREATE UNIQUE INDEX unique_substitution ON public.ingredient_substitutions USING btree (ingredient_id, substitute_ingredient_id)'),
      ('ingredients','idx_ingredients_is_pantry_default','CREATE INDEX idx_ingredients_is_pantry_default ON public.ingredients USING btree (is_pantry_default)'),
      ('ingredients','idx_ingredients_shopping_category','CREATE INDEX idx_ingredients_shopping_category ON public.ingredients USING btree (shopping_category)'),
      ('ingredients','ingredients_active_idx','CREATE INDEX ingredients_active_idx ON public.ingredients USING btree (is_active)'),
      ('ingredients','ingredients_pkey','CREATE UNIQUE INDEX ingredients_pkey ON public.ingredients USING btree (id)'),
      ('ingredients','ingredients_slug_key','CREATE UNIQUE INDEX ingredients_slug_key ON public.ingredients USING btree (slug)'),
      ('recipe_equipment','recipe_equipment_pkey','CREATE UNIQUE INDEX recipe_equipment_pkey ON public.recipe_equipment USING btree (recipe_id, equipment_id)'),
      ('recipe_ingredients','idx_recipe_ingredients_recipe_id','CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id)'),
      ('recipe_ingredients','recipe_ingredients_ingredient_idx','CREATE INDEX recipe_ingredients_ingredient_idx ON public.recipe_ingredients USING btree (ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_pkey','CREATE UNIQUE INDEX recipe_ingredients_pkey ON public.recipe_ingredients USING btree (id)'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','CREATE UNIQUE INDEX recipe_ingredients_recipe_id_ingredient_id_key ON public.recipe_ingredients USING btree (recipe_id, ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_recipe_idx','CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id)'),
      ('recipe_steps','idx_recipe_steps_recipe_id_step_no','CREATE INDEX idx_recipe_steps_recipe_id_step_no ON public.recipe_steps USING btree (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_pkey','CREATE UNIQUE INDEX recipe_steps_pkey ON public.recipe_steps USING btree (id)'),
      ('recipe_steps','recipe_steps_recipe_id_step_no_key','CREATE UNIQUE INDEX recipe_steps_recipe_id_step_no_key ON public.recipe_steps USING btree (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_recipe_idx','CREATE INDEX recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id)'),
      ('recipes','idx_recipes_budget_level','CREATE INDEX idx_recipes_budget_level ON public.recipes USING btree (budget_level)'),
      ('recipes','idx_recipes_cuisine','CREATE INDEX idx_recipes_cuisine ON public.recipes USING btree (cuisine)'),
      ('recipes','idx_recipes_diet_gin','CREATE INDEX idx_recipes_diet_gin ON public.recipes USING gin (diet)'),
      ('recipes','idx_recipes_difficulty','CREATE INDEX idx_recipes_difficulty ON public.recipes USING btree (difficulty)'),
      ('recipes','idx_recipes_excluded_tags_gin','CREATE INDEX idx_recipes_excluded_tags_gin ON public.recipes USING gin (excluded_tags)'),
      ('recipes','idx_recipes_meal_role','CREATE INDEX idx_recipes_meal_role ON public.recipes USING btree (meal_role)'),
      ('recipes','idx_recipes_method','CREATE INDEX idx_recipes_method ON public.recipes USING btree (method)'),
      ('recipes','idx_recipes_primary_protein','CREATE INDEX idx_recipes_primary_protein ON public.recipes USING btree (primary_protein)'),
      ('recipes','idx_recipes_protein_gin','CREATE INDEX idx_recipes_protein_gin ON public.recipes USING gin (protein)'),
      ('recipes','idx_recipes_protein_g','CREATE INDEX idx_recipes_protein_g ON public.recipes USING btree (protein_g)'),
      ('recipes','idx_recipes_slug','CREATE INDEX idx_recipes_slug ON public.recipes USING btree (slug)'),
      ('recipes','idx_recipes_times_shown','CREATE INDEX idx_recipes_times_shown ON public.recipes USING btree (times_shown DESC NULLS LAST)'),
      ('recipes','idx_recipes_total_time_minutes','CREATE INDEX idx_recipes_total_time_minutes ON public.recipes USING btree (total_time_minutes)'),
      ('recipes','recipes_cuisine_idx','CREATE INDEX recipes_cuisine_idx ON public.recipes USING btree (cuisine)'),
      ('recipes','recipes_diet_gin','CREATE INDEX recipes_diet_gin ON public.recipes USING gin (diet)'),
      ('recipes','recipes_difficulty_idx','CREATE INDEX recipes_difficulty_idx ON public.recipes USING btree (difficulty)'),
      ('recipes','recipes_dish_type_idx','CREATE INDEX recipes_dish_type_idx ON public.recipes USING btree (dish_type)'),
      ('recipes','recipes_flavor_gin','CREATE INDEX recipes_flavor_gin ON public.recipes USING gin (flavor)'),
      ('recipes','recipes_method_idx','CREATE INDEX recipes_method_idx ON public.recipes USING btree (method)'),
      ('recipes','recipes_pkey','CREATE UNIQUE INDEX recipes_pkey ON public.recipes USING btree (id)'),
      ('recipes','recipes_protein_gin','CREATE INDEX recipes_protein_gin ON public.recipes USING gin (protein)'),
      ('recipes','recipes_search_idx','CREATE INDEX recipes_search_idx ON public.recipes USING gin (to_tsvector(''english''::regconfig, ((name || '' ''::text) || COALESCE(description, ''''::text))))'),
      ('recipes','recipes_slug_key','CREATE UNIQUE INDEX recipes_slug_key ON public.recipes USING btree (slug)'),
      ('recipes','recipes_speed_idx','CREATE INDEX recipes_speed_idx ON public.recipes USING btree (speed)'),
      ('units','units_code_key','CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code)'),
      ('units','units_pkey','CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)')
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
      ('equipment','equipment_pkey','CREATE UNIQUE INDEX equipment_pkey ON public.equipment USING btree (id)'),
      ('ingredient_substitutions','ingredient_subs_ing_idx','CREATE INDEX ingredient_subs_ing_idx ON public.ingredient_substitutions USING btree (ingredient_id)'),
      ('ingredient_substitutions','ingredient_substitutions_pkey','CREATE UNIQUE INDEX ingredient_substitutions_pkey ON public.ingredient_substitutions USING btree (id)'),
      ('ingredient_substitutions','unique_substitution','CREATE UNIQUE INDEX unique_substitution ON public.ingredient_substitutions USING btree (ingredient_id, substitute_ingredient_id)'),
      ('ingredients','idx_ingredients_is_pantry_default','CREATE INDEX idx_ingredients_is_pantry_default ON public.ingredients USING btree (is_pantry_default)'),
      ('ingredients','idx_ingredients_shopping_category','CREATE INDEX idx_ingredients_shopping_category ON public.ingredients USING btree (shopping_category)'),
      ('ingredients','ingredients_active_idx','CREATE INDEX ingredients_active_idx ON public.ingredients USING btree (is_active)'),
      ('ingredients','ingredients_pkey','CREATE UNIQUE INDEX ingredients_pkey ON public.ingredients USING btree (id)'),
      ('ingredients','ingredients_slug_key','CREATE UNIQUE INDEX ingredients_slug_key ON public.ingredients USING btree (slug)'),
      ('recipe_equipment','recipe_equipment_pkey','CREATE UNIQUE INDEX recipe_equipment_pkey ON public.recipe_equipment USING btree (recipe_id, equipment_id)'),
      ('recipe_ingredients','idx_recipe_ingredients_recipe_id','CREATE INDEX idx_recipe_ingredients_recipe_id ON public.recipe_ingredients USING btree (recipe_id)'),
      ('recipe_ingredients','recipe_ingredients_ingredient_idx','CREATE INDEX recipe_ingredients_ingredient_idx ON public.recipe_ingredients USING btree (ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_pkey','CREATE UNIQUE INDEX recipe_ingredients_pkey ON public.recipe_ingredients USING btree (id)'),
      ('recipe_ingredients','recipe_ingredients_recipe_id_ingredient_id_key','CREATE UNIQUE INDEX recipe_ingredients_recipe_id_ingredient_id_key ON public.recipe_ingredients USING btree (recipe_id, ingredient_id)'),
      ('recipe_ingredients','recipe_ingredients_recipe_idx','CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients USING btree (recipe_id)'),
      ('recipe_steps','idx_recipe_steps_recipe_id_step_no','CREATE INDEX idx_recipe_steps_recipe_id_step_no ON public.recipe_steps USING btree (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_pkey','CREATE UNIQUE INDEX recipe_steps_pkey ON public.recipe_steps USING btree (id)'),
      ('recipe_steps','recipe_steps_recipe_id_step_no_key','CREATE UNIQUE INDEX recipe_steps_recipe_id_step_no_key ON public.recipe_steps USING btree (recipe_id, step_no)'),
      ('recipe_steps','recipe_steps_recipe_idx','CREATE INDEX recipe_steps_recipe_idx ON public.recipe_steps USING btree (recipe_id)'),
      ('recipes','idx_recipes_budget_level','CREATE INDEX idx_recipes_budget_level ON public.recipes USING btree (budget_level)'),
      ('recipes','idx_recipes_cuisine','CREATE INDEX idx_recipes_cuisine ON public.recipes USING btree (cuisine)'),
      ('recipes','idx_recipes_diet_gin','CREATE INDEX idx_recipes_diet_gin ON public.recipes USING gin (diet)'),
      ('recipes','idx_recipes_difficulty','CREATE INDEX idx_recipes_difficulty ON public.recipes USING btree (difficulty)'),
      ('recipes','idx_recipes_excluded_tags_gin','CREATE INDEX idx_recipes_excluded_tags_gin ON public.recipes USING gin (excluded_tags)'),
      ('recipes','idx_recipes_meal_role','CREATE INDEX idx_recipes_meal_role ON public.recipes USING btree (meal_role)'),
      ('recipes','idx_recipes_method','CREATE INDEX idx_recipes_method ON public.recipes USING btree (method)'),
      ('recipes','idx_recipes_primary_protein','CREATE INDEX idx_recipes_primary_protein ON public.recipes USING btree (primary_protein)'),
      ('recipes','idx_recipes_protein_gin','CREATE INDEX idx_recipes_protein_gin ON public.recipes USING gin (protein)'),
      ('recipes','idx_recipes_protein_g','CREATE INDEX idx_recipes_protein_g ON public.recipes USING btree (protein_g)'),
      ('recipes','idx_recipes_slug','CREATE INDEX idx_recipes_slug ON public.recipes USING btree (slug)'),
      ('recipes','idx_recipes_times_shown','CREATE INDEX idx_recipes_times_shown ON public.recipes USING btree (times_shown DESC NULLS LAST)'),
      ('recipes','idx_recipes_total_time_minutes','CREATE INDEX idx_recipes_total_time_minutes ON public.recipes USING btree (total_time_minutes)'),
      ('recipes','recipes_cuisine_idx','CREATE INDEX recipes_cuisine_idx ON public.recipes USING btree (cuisine)'),
      ('recipes','recipes_diet_gin','CREATE INDEX recipes_diet_gin ON public.recipes USING gin (diet)'),
      ('recipes','recipes_difficulty_idx','CREATE INDEX recipes_difficulty_idx ON public.recipes USING btree (difficulty)'),
      ('recipes','recipes_dish_type_idx','CREATE INDEX recipes_dish_type_idx ON public.recipes USING btree (dish_type)'),
      ('recipes','recipes_flavor_gin','CREATE INDEX recipes_flavor_gin ON public.recipes USING gin (flavor)'),
      ('recipes','recipes_method_idx','CREATE INDEX recipes_method_idx ON public.recipes USING btree (method)'),
      ('recipes','recipes_pkey','CREATE UNIQUE INDEX recipes_pkey ON public.recipes USING btree (id)'),
      ('recipes','recipes_protein_gin','CREATE INDEX recipes_protein_gin ON public.recipes USING gin (protein)'),
      ('recipes','recipes_search_idx','CREATE INDEX recipes_search_idx ON public.recipes USING gin (to_tsvector(''english''::regconfig, ((name || '' ''::text) || COALESCE(description, ''''::text))))'),
      ('recipes','recipes_slug_key','CREATE UNIQUE INDEX recipes_slug_key ON public.recipes USING btree (slug)'),
      ('recipes','recipes_speed_idx','CREATE INDEX recipes_speed_idx ON public.recipes USING btree (speed)'),
      ('units','units_code_key','CREATE UNIQUE INDEX units_code_key ON public.units USING btree (code)'),
      ('units','units_pkey','CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)')
    ) AS expected2(tbl, idxname, idxdef)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % index-row mismatches found across the 8 target tables -- rolling back',
      mismatch_count;
  END IF;

  -- Policies: full symmetric-content diff (table/name/cmd/permissive/roles/
  -- qual/with_check) -- HARDENED CONTRACT, exactly the 8 SELECT-only
  -- policies. Any of the 7 removed vulnerable write policies being present
  -- is a mismatch, not an accepted alternate state.
  SELECT count(*) INTO mismatch_count
  FROM (
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
      'baseline_core_recipe_catalog_schema: postcheck: % policy-row mismatches found across the 8 target tables (expected exactly the 8-policy hardened contract) -- rolling back',
      mismatch_count;
  END IF;

  -- Trigger: exactly 1, exact binding.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
      JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
     WHERE n.nspname='public' AND NOT t.tgisinternal
       AND c.relname = 'recipes' AND t.tgname = 'trg_recipes_updated_at'
       AND pn.nspname = 'public' AND p.proname = 'set_updated_at'
       AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: public.recipes.trg_recipes_updated_at does not exactly match the required binding -- rolling back';
  END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_trigger t
        JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname = ANY (target_tables)) <> 1 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: expected exactly 1 trigger across the 8 target tables -- rolling back';
  END IF;

  -- Raw ACL: HARDENED CONTRACT, full 5-field identity (table, grantee,
  -- privilege, grantor, is_grantable), 144 rows total -- not the vulnerable
  -- 256-row plain-default shape. Correctly parenthesized symmetric diff
  -- (see preflight's identical comment for why this matters).
  SELECT count(*) INTO mismatch_count FROM (
    (
    SELECT tbl, grantee, priv, 'postgres'::text AS grantor, false AS is_grantable
      FROM (
        SELECT t, 'anon'::text, 'SELECT'::text FROM unnest(target_tables) AS t
        UNION ALL
        SELECT t, 'authenticated'::text, 'SELECT'::text FROM unnest(target_tables) AS t
        UNION ALL
        SELECT t, r, p
          FROM unnest(target_tables) AS t,
               unnest(ARRAY['postgres','service_role']) AS r,
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
        SELECT t, 'anon'::text, 'SELECT'::text FROM unnest(target_tables) AS t
        UNION ALL
        SELECT t, 'authenticated'::text, 'SELECT'::text FROM unnest(target_tables) AS t
        UNION ALL
        SELECT t, r, p
          FROM unnest(target_tables) AS t,
               unnest(ARRAY['postgres','service_role']) AS r,
               unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) AS p
      ) AS expected2(tbl, grantee, priv)
    )
  ) AS symmetric_diff;

  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % raw-ACL-row mismatches found across the 8 target tables (expected exactly the 144-row hardened contract) -- rolling back',
      mismatch_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,
           pg_catalog.aclexplode(COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))) a
     WHERE n.nspname='public' AND c.relname = ANY (target_tables)
       AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END) NOT IN ('anon','authenticated','postgres','service_role')
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: an ACL row among the 8 target tables has an unrecognized grantee -- rolling back';
  END IF;

  -- Zero column ACL.
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped
       AND c.relname = ANY (target_tables) AND a.attacl IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: a column ACL exists among the 8 target tables -- rolling back';
  END IF;

  -- set_updated_at(): exactly 1, exact final hardened contract, generic
  -- non-owner ACL boundary.
  SELECT pg_catalog.count(*) INTO fn_count
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='set_updated_at';
  IF fn_count <> 1 THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: % objects named public.set_updated_at exist -- expected exactly 1, rolling back',
      fn_count;
  END IF;

  SELECT p.prokind, pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
         pg_catalog.format_type(p.prorettype, NULL) AS rettype, p.proretset, l.lanname,
         p.prosecdef, p.provolatile, p.proisstrict, p.proparallel, p.proleakproof,
         pg_catalog.pg_get_userbyid(p.proowner) AS owner, p.proowner AS owner_oid, p.proconfig, p.proacl,
         pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
           pg_catalog.regexp_replace(p.prosrc, '\s+', ' ', 'g'),
           'pg_catalog\.now\(\)', 'now()', 'gi'), '^\s+|\s+$', '', 'g')) AS body_norm
    INTO post
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid = p.prolang
   WHERE n.nspname='public' AND p.proname='set_updated_at';

  post_body_norm := post.body_norm;

  IF post.prokind IS DISTINCT FROM 'f'
     OR post.identity_args IS DISTINCT FROM ''
     OR post.rettype IS DISTINCT FROM 'trigger'
     OR post.proretset IS DISTINCT FROM false
     OR post.lanname IS DISTINCT FROM 'plpgsql'
     OR post.prosecdef IS DISTINCT FROM false
     OR post.provolatile IS DISTINCT FROM 'v'
     OR post.proisstrict IS DISTINCT FROM false
     OR post.proparallel IS DISTINCT FROM 'u'
     OR post.proleakproof IS DISTINCT FROM false
     OR post.owner IS DISTINCT FROM 'postgres'
     OR post_body_norm IS DISTINCT FROM canonical_body
  THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: public.set_updated_at does not match the required final hardened contract -- rolling back';
  END IF;

  IF post.proconfig IS NULL
     OR pg_catalog.array_length(post.proconfig, 1) <> 1
     OR NOT ('search_path=pg_catalog' = ANY (post.proconfig)) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: public.set_updated_at proconfig is % -- expected exactly {search_path=pg_catalog}, rolling back',
      post.proconfig;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.aclexplode(COALESCE(post.proacl, pg_catalog.acldefault('f', post.owner_oid))) a
     WHERE a.grantee IS DISTINCT FROM post.owner_oid
       AND (a.privilege_type = 'EXECUTE' OR a.is_grantable)
  ) THEN
    RAISE EXCEPTION
      'baseline_core_recipe_catalog_schema: postcheck: a non-owner grantee holds EXECUTE or a grant option on public.set_updated_at -- rolling back';
  END IF;
END;
$postcheck$;
