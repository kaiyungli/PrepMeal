import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the CLI-generated migration
//   supabase/migrations/<ts>_harden_admin_rpcs_and_plan_views.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL: that it hardens every admin-RPC overload
// dynamically, flips them to SECURITY INVOKER with a pinned search_path,
// removes EXECUTE from PUBLIC / anon / authenticated, keeps it only for
// service_role, fails closed when a function name is missing, and locks the
// two plan views to security_invoker + SELECT-only for authenticated /
// service_role -- without dropping or rewriting anything.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_harden_admin_rpcs_and_plan_views.sql';

const ADMIN_FNS = [
  'admin_create_recipe_atomic',
  'admin_update_recipe_atomic',
  'admin_delete_recipe_atomic',
] as const;

const VIEWS = [
  'v_menu_plan_shopping_list',
  'vw_menu_plan_grocery_items',
] as const;

function loadMigration(): { file: string; sql: string } {
  const matches = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(SUFFIX))
    .sort();
  expect(
    matches.length,
    `exactly one *${SUFFIX} migration should exist, found: ${JSON.stringify(matches)}`,
  ).toBe(1);
  const file = matches[0];
  // CLI-generated name: 14-digit timestamp prefix, not a hand-invented name.
  expect(file).toMatch(/^\d{14}_harden_admin_rpcs_and_plan_views\.sql$/);
  return { file, sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8') };
}

describe('migration: harden_admin_rpcs_and_plan_views', () => {
  const { sql } = loadMigration();

  describe('admin RPC hardening is dynamic over overloads', () => {
    it('discovers overloads from the catalog rather than hard-coding a signature', () => {
      expect(sql).toMatch(/pg_catalog\.pg_proc/);
      expect(sql).toMatch(/pg_catalog\.pg_get_function_identity_arguments\s*\(/);
      // iterates overloads
      expect(sql).toMatch(/FOR\s+\w+\s+IN[\s\S]*?pg_get_function_identity_arguments/i);
      // filters to plain functions in schema public
      expect(sql).toMatch(/nspname\s*=\s*'public'/);
      expect(sql).toMatch(/prokind\s*=\s*'f'/);
    });

    it('does not embed a concrete/pinned argument list for any overload', () => {
      // Tokens that only appear if a specific 006/007 signature was pasted in.
      expect(sql).not.toMatch(/p_prep_time_minutes/i);
      expect(sql).not.toMatch(/p_ingredients\s+jsonb/i);
      expect(sql).not.toMatch(/p_recipe_id\s+uuid\s*,/i);
    });

    it('targets exactly the three admin function names', () => {
      for (const fn of ADMIN_FNS) {
        expect(sql, `must reference ${fn}`).toMatch(new RegExp(`'${fn}'`));
      }
    });
  });

  describe('per-overload treatment', () => {
    it('sets SECURITY INVOKER', () => {
      expect(sql).toMatch(/ALTER FUNCTION\s+%s\s+SECURITY INVOKER/i);
    });

    it('pins search_path to pg_catalog, public, pg_temp', () => {
      expect(sql).toMatch(
        /ALTER FUNCTION\s+%s\s+SET search_path\s*=\s*pg_catalog,\s*public,\s*pg_temp/i,
      );
    });

    it('revokes EXECUTE from PUBLIC, anon and authenticated', () => {
      expect(sql).toMatch(
        /REVOKE ALL ON FUNCTION\s+%s\s+FROM PUBLIC,\s*anon,\s*authenticated/i,
      );
    });

    it('grants EXECUTE only to service_role', () => {
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION\s+%s\s+TO service_role/i);
      // No admin-RPC EXECUTE grant to anon / authenticated / PUBLIC anywhere.
      expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION[^;]*TO\s+(anon|authenticated|PUBLIC)/i);
    });
  });

  describe('fail closed on a missing / malformed function name', () => {
    it('counts overloads and RAISEs when a name resolves to zero', () => {
      expect(sql).toMatch(/overload_count\s+int/i);
      expect(sql).toMatch(/count\(\*\)[\s\S]*?INTO\s+overload_count/i);
      expect(sql).toMatch(/IF\s+overload_count\s*=\s*0\s+THEN[\s\S]*?RAISE EXCEPTION/i);
    });

    it('runs the guard for every one of the three names (loop over the array)', () => {
      expect(sql).toMatch(/FOREACH\s+\w+\s+IN\s+ARRAY\s+target_names/i);
    });
  });

  describe('plan views', () => {
    for (const v of VIEWS) {
      it(`${v}: set security_invoker = true`, () => {
        expect(sql).toMatch(
          new RegExp(`ALTER VIEW\\s+public\\.${v}\\s+SET \\(security_invoker = true\\)`, 'i'),
        );
      });

      it(`${v}: revoke ALL from PUBLIC and anon`, () => {
        expect(sql).toMatch(
          new RegExp(`REVOKE ALL ON TABLE\\s+public\\.${v}\\s+FROM PUBLIC,\\s*anon`, 'i'),
        );
      });

      it(`${v}: authenticated keeps SELECT only`, () => {
        expect(sql).toMatch(
          new RegExp(`REVOKE ALL ON TABLE\\s+public\\.${v}\\s+FROM authenticated`, 'i'),
        );
        expect(sql).toMatch(
          new RegExp(`GRANT SELECT ON TABLE\\s+public\\.${v}\\s+TO authenticated`, 'i'),
        );
      });

      it(`${v}: service_role keeps SELECT`, () => {
        expect(sql).toMatch(
          new RegExp(`GRANT SELECT ON TABLE\\s+public\\.${v}\\s+TO service_role`, 'i'),
        );
      });

      it(`${v}: no write-like privilege granted`, () => {
        expect(sql).not.toMatch(
          new RegExp(
            `GRANT\\s+(INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|ALL)[^;]*ON TABLE\\s+public\\.${v}`,
            'i',
          ),
        );
      });
    }

    it('anon can no longer read either view (explicit REVOKE ... FROM ... anon present, no re-GRANT to anon)', () => {
      for (const v of VIEWS) {
        expect(sql).toMatch(new RegExp(`FROM PUBLIC,\\s*anon`, 'i'));
        expect(sql).not.toMatch(
          new RegExp(`GRANT[^;]*ON TABLE\\s+public\\.${v}[^;]*TO\\s+anon`, 'i'),
        );
      }
    });
  });

  describe('non-destructive: query semantics and RLS untouched', () => {
    it('does not drop or (re)create either view', () => {
      expect(sql).not.toMatch(/DROP\s+(MATERIALIZED\s+)?VIEW/i);
      expect(sql).not.toMatch(/CREATE\s+(OR REPLACE\s+)?(MATERIALIZED\s+)?VIEW/i);
    });

    it('does not alter table RLS or policies', () => {
      expect(sql).not.toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).not.toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(sql).not.toMatch(/CREATE\s+POLICY/i);
      expect(sql).not.toMatch(/DROP\s+POLICY/i);
      expect(sql).not.toMatch(/ALTER\s+POLICY/i);
      expect(sql).not.toMatch(/ALTER\s+TABLE/i);
    });
  });
});
