import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the CLI-generated migration
//   supabase/migrations/<ts>_baseline_and_harden_set_updated_at.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL: a read-only preflight (fail-closed on any
// behavior-affecting mismatch) strictly before any write, a fully-specified
// CREATE OR REPLACE (no reliance on defaults for security/behavior
// properties), owner/ACL hardening as static statements, and a read-only
// postcondition with a GENERIC non-owner ACL scan -- while proving the
// migration touches nothing outside public.set_updated_at() itself.
//
// Assertions run against the SQL with `--` line comments stripped, so a
// word appearing only in prose (e.g. "profiles" in the scope note, or
// "SECURITY DEFINER" inside an error message describing what NOT to
// accept) cannot accidentally satisfy a contract check meant to verify
// actual executable statements.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_baseline_and_harden_set_updated_at.sql';

function stripLineComments(sql: string): string {
  return sql.replace(/--.*$/gm, '');
}

function loadMigration(): { file: string; sql: string; executable: string } {
  const all = fs.readdirSync(MIGRATIONS_DIR).sort();
  const matches = all.filter((f) => f.endsWith(SUFFIX));
  expect(
    matches.length,
    `exactly one *${SUFFIX} migration should exist, found: ${JSON.stringify(matches)}`,
  ).toBe(1);
  const file = matches[0];
  // CLI-generated name: 14-digit timestamp prefix, not a hand-invented name.
  expect(file).toMatch(/^\d{14}_baseline_and_harden_set_updated_at\.sql$/);
  // Must sort after every other tracked migration -- set_updated_at must
  // exist before anything that will later depend on it (e.g. a future
  // profiles baseline), and must not be reordered ahead of history that
  // already shipped.
  expect(file, 'must sort last among all tracked migrations').toBe(all[all.length - 1]);

  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  return { file, sql, executable: stripLineComments(sql) };
}

describe('migration: baseline_and_harden_set_updated_at', () => {
  const { sql, executable } = loadMigration();

  describe('ordering: preflight strictly before the write', () => {
    it('the preflight DO block appears before CREATE OR REPLACE FUNCTION', () => {
      const preflightIdx = executable.indexOf('$preflight$');
      const createIdx = executable.indexOf('CREATE OR REPLACE FUNCTION');
      expect(preflightIdx).toBeGreaterThan(-1);
      expect(createIdx).toBeGreaterThan(-1);
      expect(preflightIdx).toBeLessThan(createIdx);
    });

    it('the postcondition DO block appears after every mutating statement', () => {
      const postcheckIdx = executable.indexOf('$postcheck$');
      const revokeIdx = executable.indexOf('REVOKE ALL ON FUNCTION');
      const alterOwnerIdx = executable.indexOf('OWNER TO postgres');
      const createIdx = executable.indexOf('CREATE OR REPLACE FUNCTION');
      expect(postcheckIdx).toBeGreaterThan(createIdx);
      expect(postcheckIdx).toBeGreaterThan(alterOwnerIdx);
      expect(postcheckIdx).toBeGreaterThan(revokeIdx);
    });

    it('compatibility failures use RAISE EXCEPTION (fail closed, not silent normalization)', () => {
      const count = (executable.match(/RAISE EXCEPTION/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(10);
    });

    it('does not repair-then-validate: preflight never issues a CREATE/ALTER/REVOKE itself', () => {
      const preflightBlock = executable.slice(
        executable.indexOf('$preflight$'),
        executable.indexOf('$preflight$;') + '$preflight$;'.length,
      );
      expect(preflightBlock).not.toMatch(/CREATE\s+(OR REPLACE\s+)?FUNCTION/i);
      expect(preflightBlock).not.toMatch(/ALTER\s+FUNCTION/i);
      expect(preflightBlock).not.toMatch(/REVOKE/i);
      expect(preflightBlock).not.toMatch(/GRANT/i);
    });
  });

  describe('exactly one zero-argument public.set_updated_at is targeted', () => {
    it('the created/replaced function has an empty argument list', () => {
      expect(executable).toMatch(/CREATE OR REPLACE FUNCTION\s+public\.set_updated_at\(\s*\)/);
    });

    it('preflight and postcheck both filter to proname = set_updated_at in schema public', () => {
      const occurrences = (
        executable.match(/nspname\s*=\s*'public'\s+AND\s+p\.proname\s*=\s*'set_updated_at'/g) ?? []
      ).length;
      expect(occurrences).toBeGreaterThanOrEqual(4); // 2 SELECTs x (preflight + postcheck)
    });

    it('does not target any other function name', () => {
      expect(executable).not.toMatch(/proname\s*=\s*'(?!set_updated_at)[a-zA-Z_]+'/);
    });
  });

  describe('canonical function declaration -- no reliance on defaults', () => {
    function createBlock(): string {
      const start = executable.indexOf('CREATE OR REPLACE FUNCTION');
      const end = executable.indexOf('$fn$;', start) + '$fn$;'.length;
      return executable.slice(start, end);
    }

    it('RETURNS trigger', () => {
      expect(createBlock()).toMatch(/RETURNS\s+trigger/i);
    });

    it('LANGUAGE plpgsql', () => {
      expect(createBlock()).toMatch(/LANGUAGE\s+plpgsql/i);
    });

    it('explicitly declares VOLATILE', () => {
      expect(createBlock()).toMatch(/\bVOLATILE\b/);
    });

    it('explicitly declares CALLED ON NULL INPUT', () => {
      expect(createBlock()).toMatch(/CALLED ON NULL INPUT/i);
    });

    it('explicitly declares PARALLEL UNSAFE', () => {
      expect(createBlock()).toMatch(/PARALLEL UNSAFE/i);
    });

    it('explicitly declares SECURITY INVOKER, never SECURITY DEFINER, inside the CREATE statement', () => {
      expect(createBlock()).toMatch(/SECURITY INVOKER/i);
      expect(createBlock()).not.toMatch(/SECURITY DEFINER/i);
    });

    it('declares SET search_path = pg_catalog only -- no public, no pg_temp', () => {
      expect(createBlock()).toMatch(/SET search_path\s*=\s*pg_catalog\s*$/im);
      expect(createBlock()).not.toMatch(/pg_temp/);
      expect(createBlock()).not.toMatch(/search_path\s*=\s*pg_catalog\s*,/i);
    });

    it('body assigns pg_catalog.now() to NEW.updated_at and returns NEW', () => {
      expect(createBlock()).toMatch(/NEW\.updated_at\s*=\s*pg_catalog\.now\(\)/);
      expect(createBlock()).toMatch(/RETURN NEW;/);
    });
  });

  describe('deterministic owner and ACL hardening (static SQL)', () => {
    it('sets owner to postgres via a separate static ALTER FUNCTION', () => {
      expect(executable).toMatch(/ALTER FUNCTION\s+public\.set_updated_at\(\)\s+OWNER TO postgres/i);
    });

    it('revokes ALL from PUBLIC, anon, authenticated and service_role', () => {
      expect(executable).toMatch(
        /REVOKE ALL ON FUNCTION\s+public\.set_updated_at\(\)\s+FROM PUBLIC,\s*anon,\s*authenticated,\s*service_role/i,
      );
    });

    it('grants EXECUTE to no one (no compensating GRANT statement anywhere)', () => {
      expect(executable).not.toMatch(/GRANT\s+EXECUTE/i);
    });
  });

  describe('postcheck: generic non-owner ACL scan, not a fixed role list', () => {
    it('iterates every ACL entry whose grantee is not the owner, via aclexplode', () => {
      expect(executable).toMatch(/aclexplode\s*\(/);
      expect(executable).toMatch(/grantee\s+IS DISTINCT FROM\s+post\.owner_oid/i);
    });

    it('rejects EXECUTE for any such non-owner grantee, and rejects any grant option', () => {
      const postcheckBlock = executable.slice(executable.indexOf('$postcheck$'));
      expect(postcheckBlock).toMatch(/privilege_type\s*=\s*'EXECUTE'/);
      expect(postcheckBlock).toMatch(/is_grantable/i);
      // Two independent RAISEs inside the loop: one for EXECUTE, one for grant option.
      const loopStart = postcheckBlock.indexOf('FOR acl_row IN');
      const loopEnd = postcheckBlock.indexOf('END LOOP;');
      const loopBody = postcheckBlock.slice(loopStart, loopEnd);
      expect((loopBody.match(/RAISE EXCEPTION/g) ?? []).length).toBe(2);
    });

    it('does not scope the negative ACL check to only PUBLIC/anon/authenticated/service_role by name', () => {
      const postcheckBlock = executable.slice(executable.indexOf('$postcheck$'));
      expect(postcheckBlock).not.toMatch(/grantee\s*=\s*'anon'::regrole/i);
      expect(postcheckBlock).not.toMatch(/grantee\s*=\s*'authenticated'::regrole/i);
      expect(postcheckBlock).not.toMatch(/grantee\s*=\s*'service_role'::regrole/i);
    });

    it('asserts the owner retains effective EXECUTE', () => {
      expect(executable).toMatch(
        /has_function_privilege\('postgres',\s*post\.fn_oid,\s*'EXECUTE'\)/,
      );
    });
  });

  describe('postcheck: complete behavior-affecting property assertions', () => {
    const expectedChecks: RegExp[] = [
      /post\.prokind\s+IS DISTINCT FROM\s+'f'/,
      /post\.identity_args\s+IS DISTINCT FROM\s+''/,
      /post\.rettype\s+IS DISTINCT FROM\s+'trigger'/,
      /post\.proretset\s+IS DISTINCT FROM\s+false/,
      /post\.lang\s+IS DISTINCT FROM\s+'plpgsql'/,
      /post\.secdef\s+IS DISTINCT FROM\s+false/,
      /post\.volatility\s+IS DISTINCT FROM\s+'v'/,
      /post.is_strict\s+IS DISTINCT FROM\s+false/,
      /post\.parallel\s+IS DISTINCT FROM\s+'u'/,
      /post\.leakproof\s+IS DISTINCT FROM\s+false/,
      /post\.owner\s+IS DISTINCT FROM\s+'postgres'/,
      /post_body_norm\s+IS DISTINCT FROM\s+canonical_body_norm/,
    ];

    for (const re of expectedChecks) {
      it(`postcheck asserts ${re}`, () => {
        expect(executable).toMatch(re);
      });
    }

    it('postcheck asserts proconfig is exactly {search_path=pg_catalog}', () => {
      expect(executable).toMatch(/'search_path=pg_catalog'\s*=\s*ANY\s*\(post\.proconfig\)/);
    });

    it('preflight validates the same full property set before any write', () => {
      const preflightBlock = executable.slice(
        executable.indexOf('$preflight$'),
        executable.indexOf('$preflight$;'),
      );
      for (const field of [
        'prokind',
        'proretset',
        'lang',
        'secdef',
        'volatility',
        'is_strict',
        'parallel',
        'leakproof',
        'owner',
        'proconfig',
      ]) {
        expect(preflightBlock, `preflight must check pre.${field}`).toMatch(
          new RegExp(`pre\\.${field}\\b`),
        );
      }
    });
  });

  describe('blast-radius containment', () => {
    it('never mentions ALTER DEFAULT PRIVILEGES', () => {
      expect(executable).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
    });

    it('never creates, alters or drops a trigger', () => {
      expect(executable).not.toMatch(/CREATE\s+(OR REPLACE\s+)?TRIGGER/i);
      expect(executable).not.toMatch(/ALTER\s+TRIGGER/i);
      expect(executable).not.toMatch(/DROP\s+TRIGGER/i);
    });

    it('never creates, alters or drops a table', () => {
      expect(executable).not.toMatch(/CREATE\s+TABLE/i);
      expect(executable).not.toMatch(/ALTER\s+TABLE/i);
      expect(executable).not.toMatch(/DROP\s+TABLE/i);
    });

    it('touches nothing named profiles in executable SQL (comments-only mentions do not count)', () => {
      expect(executable).not.toMatch(/profiles/i);
    });

    it('asserts no live-only dependent-trigger existence check (pg_trigger is comment-only)', () => {
      expect(executable).not.toMatch(/pg_trigger/i);
      expect(executable).not.toMatch(
        /trg_recipes_updated_at|trg_profiles_updated_at|trg_user_preferences_updated_at/,
      );
    });

    it('uses no dynamic SQL (no EXECUTE format(...) / EXECUTE \'...\')', () => {
      expect(executable).not.toMatch(/EXECUTE\s+format\s*\(/i);
      expect(executable).not.toMatch(/EXECUTE\s+'/);
    });

    it('never drops the function', () => {
      expect(executable).not.toMatch(/DROP\s+FUNCTION/i);
    });

    it('never sets pg_temp as part of any search_path', () => {
      expect(executable).not.toMatch(/pg_temp/);
    });

    it('the full un-stripped file documents the out-of-scope deployment check only as SQL comments', () => {
      // The raw source is allowed to mention profiles/pg_trigger/etc. in
      // prose -- but only as `--`-prefixed comment lines, which is exactly
      // what the executable-text assertions above independently confirm
      // by finding none of it once comments are stripped.
      expect(sql).toMatch(/profiles/i);
      const mentionLines = sql.split('\n').filter((l) => /profiles|pg_trigger/i.test(l));
      for (const line of mentionLines) {
        expect(line.trimStart().startsWith('--'), `expected a comment line: ${line}`).toBe(true);
      }
    });
  });
});
