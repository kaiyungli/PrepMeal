import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_revoke_plan_view_write_from_service_role.sql';
const VIEWS = ['v_menu_plan_shopping_list', 'vw_menu_plan_grocery_items'] as const;

function loadMigration(): string {
  const matches = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(SUFFIX));

  expect(matches).toHaveLength(1);
  expect(matches[0]).toMatch(/^\d{14}_revoke_plan_view_write_from_service_role\.sql$/);

  return fs.readFileSync(path.join(MIGRATIONS_DIR, matches[0]), 'utf8');
}

describe('migration: service_role is read-only on plan views', () => {
  const sql = loadMigration();

  for (const view of VIEWS) {
    it(`${view}: revokes existing privileges before restoring SELECT`, () => {
      const revoke = `REVOKE ALL ON TABLE public.${view} FROM service_role;`;
      const grant = `GRANT SELECT ON TABLE public.${view} TO service_role;`;

      expect(sql).toContain(revoke);
      expect(sql).toContain(grant);
      expect(sql.indexOf(revoke)).toBeLessThan(sql.indexOf(grant));
    });

    it(`${view}: never grants a write-like privilege`, () => {
      expect(sql).not.toMatch(
        new RegExp(
          `GRANT\\s+(INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN|ALL)[^;]*public\\.${view}`,
          'i',
        ),
      );
    });
  }

  it('does not redefine views, functions, tables, RLS, or policies', () => {
    expect(sql).not.toMatch(/\b(?:CREATE|ALTER|DROP)\s+(?:VIEW|FUNCTION|TABLE|POLICY)\b/i);
    expect(sql).not.toMatch(/ROW\s+LEVEL\s+SECURITY/i);
  });
});
