import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the CLI-generated migration
//   supabase/migrations/<ts>_reconcile_admin_recipe_rpc_contract.sql
//
// There is no Postgres available to the Vitest runner, so these assert the
// STRUCTURE of the migration SQL: that it reconciles admin_create_recipe_atomic
// / admin_update_recipe_atomic to the exact 22 / 23 named-argument set the Admin
// API call site (src/pages/api/admin/recipes/index.js) sends, drops the legacy
// 14 / 15-arg overloads, keeps the security posture (SECURITY INVOKER, pinned
// search_path, EXECUTE for service_role only), writes every canonical recipe
// field, replaces ingredients + steps transactionally, is fail-closed on an
// unexpected overload / a bad end state, never touches admin_delete_recipe_atomic
// or any table / view / RLS / policy / non-EXECUTE grant, and reloads the
// PostgREST schema cache.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_reconcile_admin_recipe_rpc_contract.sql';

// The 22 named args index.js POST sends, in index.js order (index.js:126-149).
const CREATE_PARAMS = [
  'p_name',
  'p_slug',
  'p_description',
  'p_cuisine',
  'p_dish_type',
  'p_difficulty',
  'p_prep_time_minutes',
  'p_cook_time_minutes',
  'p_base_servings',
  'p_image_url',
  'p_calories_per_serving',
  'p_is_public',
  'p_method',
  'p_speed',
  'p_servings_unit',
  'p_meal_role',
  'p_is_complete_meal',
  'p_primary_protein',
  'p_budget_level',
  'p_reuse_group',
  'p_ingredients',
  'p_steps',
] as const;

// index.js PUT sends p_recipe_id first, then the same 22 (index.js:178-202).
const UPDATE_PARAMS = ['p_recipe_id', ...CREATE_PARAMS] as const;

const METADATA_COLUMNS = [
  'method',
  'speed',
  'servings_unit',
  'meal_role',
  'is_complete_meal',
  'primary_protein',
  'budget_level',
  'reuse_group',
] as const;

// Type list for the legacy overloads that must be dropped.
const LEGACY_CREATE_TYPES =
  'text, text, text, text, text, text,\\s*integer, integer, integer,\\s*text, numeric, boolean,\\s*jsonb, jsonb';
const LEGACY_UPDATE_TYPES =
  'uuid,\\s*text, text, text, text, text, text,\\s*integer, integer, integer,\\s*text, numeric, boolean,\\s*jsonb, jsonb';

function loadMigration(): { file: string; sql: string } {
  const matches = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(SUFFIX));
  expect(matches, `exactly one *${SUFFIX} migration should exist, found ${JSON.stringify(matches)}`).toHaveLength(1);
  const file = matches[0];
  // CLI-generated name: a 14-digit timestamp prefix, not a hand-written one.
  expect(file).toMatch(/^\d{14}_reconcile_admin_recipe_rpc_contract\.sql$/);
  return { file, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8') };
}

/** Extract the ordered `p_*` parameter names from a function's signature block. */
function signatureParams(sql: string, fnName: string): string[] {
  const marker = `CREATE OR REPLACE FUNCTION public.${fnName}(`;
  const start = sql.indexOf(marker);
  expect(start, `${marker} not found`).toBeGreaterThan(-1);
  const afterOpen = start + marker.length;
  const returnsAt = sql.indexOf('RETURNS jsonb', afterOpen);
  expect(returnsAt).toBeGreaterThan(afterOpen);
  const sig = sql.slice(afterOpen, returnsAt);
  return sig.match(/\bp_[a-z_]+/g) ?? [];
}

describe('migration: reconcile_admin_recipe_rpc_contract', () => {
  const { sql } = loadMigration();

  describe('CLI-generated filename convention', () => {
    it('is a single 14-digit-timestamp-prefixed file', () => {
      // Assertion already run in loadMigration(); restated here for intent.
      const matches = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(SUFFIX));
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatch(/^\d{14}_reconcile_admin_recipe_rpc_contract\.sql$/);
    });

    it('does not modify any pre-existing migration file', () => {
      // The other migrations are unrelated; this test only owns the new file.
      const all = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
      expect(all.filter((f) => f.endsWith(SUFFIX))).toHaveLength(1);
    });
  });

  describe('canonical create signature == index.js POST exact named-argument set', () => {
    it('declares exactly the 22 params, in index.js order', () => {
      expect(signatureParams(sql, 'admin_create_recipe_atomic')).toEqual([...CREATE_PARAMS]);
    });

    it('carries every one of the 8 metadata params', () => {
      const params = signatureParams(sql, 'admin_create_recipe_atomic');
      for (const col of METADATA_COLUMNS) {
        expect(params).toContain(`p_${col}`);
      }
    });
  });

  describe('canonical update signature == index.js PUT exact named-argument set', () => {
    it('declares exactly the 23 params, p_recipe_id first, then the 22', () => {
      expect(signatureParams(sql, 'admin_update_recipe_atomic')).toEqual([...UPDATE_PARAMS]);
    });
  });

  describe('legacy overloads are removed', () => {
    it('DROPs the legacy 14-arg create by its exact identity signature', () => {
      expect(sql).toMatch(
        new RegExp(`DROP FUNCTION IF EXISTS public\\.admin_create_recipe_atomic\\(\\s*${LEGACY_CREATE_TYPES}\\s*\\)`, 'i'),
      );
    });

    it('DROPs the legacy 15-arg update by its exact identity signature', () => {
      expect(sql).toMatch(
        new RegExp(`DROP FUNCTION IF EXISTS public\\.admin_update_recipe_atomic\\(\\s*${LEGACY_UPDATE_TYPES}\\s*\\)`, 'i'),
      );
    });

    it('never DROPs with CASCADE', () => {
      expect(sql).not.toMatch(/DROP\s+FUNCTION[^;]*CASCADE/i);
    });
  });

  describe('fail-closed on an unexpected overload', () => {
    it('enumerates overloads from pg_catalog via pg_get_function_identity_arguments', () => {
      expect(sql).toMatch(/pg_catalog\.pg_proc/);
      expect(sql).toMatch(/pg_get_function_identity_arguments\s*\(/);
    });

    it('RAISEs on an overload that is not one of the audit-known signatures', () => {
      expect(sql).toMatch(/RAISE EXCEPTION[\s\S]*unknown overload[\s\S]*fail closed/i);
      // both legacy AND canonical identity strings are whitelisted (supports
      // starting from production OR from an already-migrated local DB)
      expect(sql).toMatch(/k_create_legacy/);
      expect(sql).toMatch(/k_create_canon/);
      expect(sql).toMatch(/k_update_legacy/);
      expect(sql).toMatch(/k_update_canon/);
    });

    it('RAISEs when a target function is missing entirely', () => {
      expect(sql).toMatch(/admin_create_recipe_atomic not found[\s\S]*fail closed/i);
      expect(sql).toMatch(/admin_update_recipe_atomic not found[\s\S]*fail closed/i);
    });
  });

  describe('final overload-count contract (post-check)', () => {
    it('asserts exactly one overload per name with the expected arity', () => {
      expect(sql).toMatch(/post-check[\s\S]*expected exactly 1 overload/i);
      expect(sql).toMatch(/'admin_create_recipe_atomic',\s*22/);
      expect(sql).toMatch(/'admin_update_recipe_atomic',\s*23/);
      expect(sql).toMatch(/'admin_delete_recipe_atomic',\s*1/);
      expect(sql).toMatch(/pronargs\s*=\s*spec\.expected_args/);
    });

    it('rolls back if the end state is wrong', () => {
      expect(sql).toMatch(/rolling back/i);
    });
  });

  describe('security posture', () => {
    it('both functions are SECURITY INVOKER and never declared SECURITY DEFINER', () => {
      const invokerCount = sql.match(/SECURITY INVOKER/g) ?? [];
      expect(invokerCount.length).toBeGreaterThanOrEqual(2);
      // "SECURITY DEFINER" must never appear as a function attribute (its own
      // clause line). It is allowed inside the post-check RAISE message
      // ("... is SECURITY DEFINER -- rolling back").
      expect(sql).not.toMatch(/\n\s*SECURITY DEFINER\b/);
      expect(sql).not.toMatch(/LANGUAGE plpgsql[\s\S]{0,80}SECURITY DEFINER/);
    });

    it('both functions pin search_path to pg_catalog, public, pg_temp', () => {
      const pinned = sql.match(/SET search_path = pg_catalog, public, pg_temp/g) ?? [];
      expect(pinned.length).toBeGreaterThanOrEqual(2);
    });

    it('post-check verifies prosecdef=false and the pinned proconfig', () => {
      expect(sql).toMatch(/IF r\.prosecdef THEN/);
      expect(sql).toMatch(/'search_path=pg_catalog, public, pg_temp' = ANY \(r\.proconfig\)/);
    });

    for (const fn of ['admin_create_recipe_atomic', 'admin_update_recipe_atomic'] as const) {
      it(`${fn}: REVOKE ALL from PUBLIC, anon, authenticated then GRANT EXECUTE to service_role`, () => {
        const revoke = new RegExp(
          `REVOKE ALL ON FUNCTION public\\.${fn}\\([\\s\\S]*?\\)\\s*FROM PUBLIC, anon, authenticated;`,
        );
        const grant = new RegExp(
          `GRANT EXECUTE ON FUNCTION public\\.${fn}\\([\\s\\S]*?\\)\\s*TO service_role;`,
        );
        expect(sql).toMatch(revoke);
        expect(sql).toMatch(grant);
        expect(sql.search(revoke)).toBeLessThan(sql.search(grant));
      });
    }

    it('never grants EXECUTE to anon / authenticated / PUBLIC', () => {
      expect(sql).not.toMatch(/GRANT\s+EXECUTE[^;]*\bTO\b[^;]*\b(anon|authenticated|PUBLIC)\b/i);
    });

    it('post-check rejects any EXECUTE for PUBLIC / anon / authenticated', () => {
      expect(sql).toMatch(/grants EXECUTE to PUBLIC\/anon\/authenticated[\s\S]*rolling back/i);
      expect(sql).toMatch(/missing EXECUTE for service_role[\s\S]*rolling back/i);
    });
  });

  describe('admin_delete_recipe_atomic is untouched', () => {
    it('is never created / replaced / dropped / altered', () => {
      expect(sql).not.toMatch(/(CREATE|DROP|ALTER)\s+(OR\s+REPLACE\s+)?FUNCTION\s+[^;]*admin_delete_recipe_atomic/i);
    });

    it('has no EXECUTE grant/revoke aimed at it', () => {
      expect(sql).not.toMatch(/(GRANT|REVOKE)\s+[\s\S]*?\bON FUNCTION public\.admin_delete_recipe_atomic/i);
    });

    it('is only ever referenced read-only, inside the guard DO blocks', () => {
      // It appears in the pre-flight/post-check catalog scans; that is allowed.
      expect(sql).toMatch(/admin_delete_recipe_atomic/);
    });
  });

  describe('no table / view / RLS / policy / grant widening', () => {
    it('touches no table or view DDL', () => {
      expect(sql).not.toMatch(/\b(CREATE|ALTER|DROP)\s+(TABLE|VIEW|MATERIALIZED\s+VIEW)\b/i);
    });

    it('touches no RLS or policy', () => {
      expect(sql).not.toMatch(/ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).not.toMatch(/\b(CREATE|ALTER|DROP)\s+POLICY\b/i);
    });

    it('issues no table / schema / default-privilege grants', () => {
      expect(sql).not.toMatch(/\bON\s+TABLE\b/i);
      expect(sql).not.toMatch(/\bON\s+ALL\s+TABLES\b/i);
      expect(sql).not.toMatch(/\bGRANT\b[^;]*\bON\s+SCHEMA\b/i);
      expect(sql).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
    });

    it('every GRANT/REVOKE targets only the two reconciled functions', () => {
      const stmts = sql.match(/\b(?:GRANT|REVOKE)\b[\s\S]*?;/g) ?? [];
      expect(stmts.length).toBeGreaterThan(0);
      for (const s of stmts) {
        expect(s).toMatch(/ON FUNCTION public\.(admin_create_recipe_atomic|admin_update_recipe_atomic)\(/);
      }
    });
  });

  describe('function bodies write every canonical recipe field', () => {
    it('create INSERT INTO public.recipes lists all 8 metadata columns', () => {
      const start = sql.indexOf('INSERT INTO public.recipes (');
      expect(start).toBeGreaterThan(-1);
      const colList = sql.slice(start, sql.indexOf(')', start));
      for (const col of METADATA_COLUMNS) {
        expect(colList).toContain(col);
      }
    });

    it('update UPDATE public.recipes SET assigns all 8 metadata columns', () => {
      const start = sql.indexOf('UPDATE public.recipes SET');
      expect(start).toBeGreaterThan(-1);
      const setBlock = sql.slice(start, sql.indexOf('WHERE id = p_recipe_id', start));
      for (const col of METADATA_COLUMNS) {
        expect(setBlock).toMatch(new RegExp(`\\b${col}\\s*=`));
      }
    });

    it('NOT NULL method / speed are coalesced to a CHECK-valid default', () => {
      expect(sql).toMatch(/COALESCE\(NULLIF\(p_method, ''\), 'stir_fry'\)/);
      expect(sql).toMatch(/COALESCE\(NULLIF\(p_speed, ''\), 'normal'\)/);
    });
  });

  describe('ingredients + steps are replaced transactionally, by UUID, no name lookup', () => {
    it('update deletes then re-inserts both child tables', () => {
      expect(sql).toMatch(/DELETE FROM public\.recipe_ingredients WHERE recipe_id = p_recipe_id;/);
      expect(sql).toMatch(/DELETE FROM public\.recipe_steps WHERE recipe_id = p_recipe_id;/);
      // an INSERT for each child table appears after its DELETE
      const delIng = sql.indexOf('DELETE FROM public.recipe_ingredients WHERE recipe_id = p_recipe_id;');
      expect(sql.indexOf('INSERT INTO public.recipe_ingredients', delIng)).toBeGreaterThan(delIng);
      const delStep = sql.indexOf('DELETE FROM public.recipe_steps WHERE recipe_id = p_recipe_id;');
      expect(sql.indexOf('INSERT INTO public.recipe_steps', delStep)).toBeGreaterThan(delStep);
    });

    it('update raises (rolls back) when the recipe row does not exist', () => {
      expect(sql).toMatch(/IF NOT FOUND THEN[\s\S]*RAISE EXCEPTION 'admin_update_recipe_atomic: recipe % not found'/);
      expect(sql).toMatch(/ERRCODE = 'no_data_found'/);
    });

    it('ingredients bind ingredient_id / unit_id as ::uuid and quantity as ::numeric', () => {
      expect(sql).toMatch(/\(j->>'ingredient_id'\)::uuid/);
      expect(sql).toMatch(/\(j->>'unit_id'\)::uuid/);
      expect(sql).toMatch(/\(j->>'quantity'\)::numeric/);
    });

    it('steps bind step_no / text / time_seconds', () => {
      expect(sql).toMatch(/\(j->>'step_no'\)::integer/);
      expect(sql).toMatch(/j->>'text'/);
      expect(sql).toMatch(/NULLIF\(\(j->>'time_seconds'\)::text, ''\)::integer/);
    });

    it('does no ingredient/unit name or code resolution', () => {
      expect(sql).not.toMatch(/FROM public\.ingredients\b/i);
      expect(sql).not.toMatch(/FROM public\.units\b/i);
      expect(sql).not.toMatch(/ingredients?\.(slug|name|aliases)/i);
      expect(sql).not.toMatch(/units?\.code/i);
    });
  });

  describe('PostgREST schema cache reload', () => {
    it("ends with NOTIFY pgrst, 'reload schema'", () => {
      expect(sql).toMatch(/NOTIFY pgrst, 'reload schema';/);
    });
  });

  describe('single migration transaction', () => {
    it('adds no explicit BEGIN/COMMIT (the CLI wraps the file)', () => {
      expect(sql).not.toMatch(/^\s*BEGIN;\s*$/im);
      expect(sql).not.toMatch(/^\s*COMMIT;\s*$/im);
    });
  });
});
