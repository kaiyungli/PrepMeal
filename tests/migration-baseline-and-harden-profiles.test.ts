import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the two CLI-generated migrations
//   supabase/migrations/<ts>_baseline_profiles_schema.sql
//   supabase/migrations/<ts>_revoke_profiles_unneeded_privileges.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL via string/regex matching against the
// comment-stripped text -- not a real SQL parse. Assertions run against
// the SQL with `--` line comments stripped, so a word appearing only in
// prose (e.g. "profiles" inside a rationale comment, or a command name
// mentioned only to explain what is NOT done) cannot accidentally
// satisfy or violate a contract check meant to verify actual executable
// statements.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX_SET_UPDATED_AT = '_baseline_and_harden_set_updated_at.sql';
const SUFFIX_BASELINE = '_baseline_profiles_schema.sql';
const SUFFIX_PRIVILEGE = '_revoke_profiles_unneeded_privileges.sql';

function stripLineComments(sql: string): string {
  return sql.replace(/--.*$/gm, '');
}

function activeMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => fs.statSync(path.join(MIGRATIONS_DIR, f)).isFile())
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

function loadBySuffix(suffix: string): { file: string; sql: string; executable: string } {
  const all = activeMigrationFiles();
  const matches = all.filter((f) => f.endsWith(suffix));
  expect(matches.length, `exactly one *${suffix} migration should exist, found: ${JSON.stringify(matches)}`).toBe(1);
  const file = matches[0];
  expect(file, `CLI-generated name must be a 14-digit timestamp prefix`).toMatch(
    new RegExp(`^\\d{14}${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  );
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  return { file, sql, executable: stripLineComments(sql) };
}

/** Slice out the DO $preflight$ ... $preflight$; block from executable SQL. */
function preflightBlockOf(executable: string): string {
  const start = executable.indexOf('DO $preflight$');
  const end = executable.indexOf('$preflight$;') + '$preflight$;'.length;
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return executable.slice(start, end);
}

/** Slice out the DO $postcheck$ ... $postcheck$; block from executable SQL. */
function postcheckBlockOf(executable: string): string {
  const start = executable.indexOf('DO $postcheck$');
  expect(start).toBeGreaterThan(-1);
  return executable.slice(start);
}

/**
 * Find `needle` in `sql` and assert whether the literal token "NOT"
 * appears immediately before it (allowing only whitespace between).
 * Used to distinguish a required-privilege check (`IF NOT
 * has_table_privilege(...) THEN RAISE ...`, i.e. failing when the
 * privilege is ABSENT) from a forbidden-privilege check (`IF
 * has_table_privilege(...) THEN RAISE ...`, i.e. failing when the
 * privilege is PRESENT) -- not merely that the call appears somewhere.
 */
function assertPrivilegeCheckPolarity(sql: string, needle: string, expectRequired: boolean): void {
  const idx = sql.indexOf(needle);
  expect(idx, `expected to find: ${needle}`).toBeGreaterThan(-1);
  // The call site is always `pg_catalog.has_table_privilege(...)`, so the
  // window must be wide enough to see past that qualifier back to a
  // preceding NOT (e.g. "NOT pg_catalog." is 15 characters).
  const before = sql.slice(Math.max(0, idx - 30), idx);
  const negated = /\bNOT\s+(?:pg_catalog\.)?\s*$/.test(before);
  if (expectRequired) {
    expect(negated, `expected "${needle}" to be negated (a required privilege) but context was: ...${before}`).toBe(
      true,
    );
  } else {
    expect(
      negated,
      `expected "${needle}" to be a positive/forbidden-privilege check but context was: ...${before}`,
    ).toBe(false);
  }
}

describe('migration ordering: set_updated_at -> profiles baseline -> profiles privilege', () => {
  const setUpdatedAt = loadBySuffix(SUFFIX_SET_UPDATED_AT);
  const baseline = loadBySuffix(SUFFIX_BASELINE);
  const privilege = loadBySuffix(SUFFIX_PRIVILEGE);

  it('exactly one file matches each of the three suffixes', () => {
    // Assertion already enforced inside loadBySuffix(); restated here for
    // intent, using the real directory listing rather than a hardcoded
    // filename list.
    const all = activeMigrationFiles();
    expect(all.filter((f) => f.endsWith(SUFFIX_SET_UPDATED_AT))).toHaveLength(1);
    expect(all.filter((f) => f.endsWith(SUFFIX_BASELINE))).toHaveLength(1);
    expect(all.filter((f) => f.endsWith(SUFFIX_PRIVILEGE))).toHaveLength(1);
  });

  it('set_updated_at migration sorts before the profiles baseline migration', () => {
    expect(setUpdatedAt.file < baseline.file).toBe(true);
  });

  it('profiles baseline migration sorts before the profiles privilege migration', () => {
    expect(baseline.file < privilege.file).toBe(true);
  });
});

describe('migration: baseline_profiles_schema', () => {
  const { sql, executable } = loadBySuffix(SUFFIX_BASELINE);
  const preflightBlock = preflightBlockOf(executable);
  const postcheckBlock = postcheckBlockOf(executable);

  describe('ordering: preflight strictly before mutation, postcheck strictly after', () => {
    it('the preflight DO block appears before CREATE TABLE', () => {
      const preflightIdx = executable.indexOf('$preflight$');
      const createIdx = executable.indexOf('CREATE TABLE');
      expect(preflightIdx).toBeGreaterThan(-1);
      expect(createIdx).toBeGreaterThan(-1);
      expect(preflightIdx).toBeLessThan(createIdx);
    });

    it('the postcheck DO block appears after CREATE TABLE, the policy guards, and the trigger guard', () => {
      const postcheckIdx = executable.indexOf('$postcheck$');
      const createIdx = executable.indexOf('CREATE TABLE');
      const policiesIdx = executable.indexOf('$create_policies$');
      const triggerIdx = executable.indexOf('$create_trigger$');
      expect(postcheckIdx).toBeGreaterThan(createIdx);
      expect(postcheckIdx).toBeGreaterThan(policiesIdx);
      expect(postcheckIdx).toBeGreaterThan(triggerIdx);
    });

    it('preflight never performs a write (no CREATE/ALTER/DROP/GRANT/REVOKE inside it)', () => {
      expect(preflightBlock).not.toMatch(/\bCREATE\s+TABLE\b/i);
      expect(preflightBlock).not.toMatch(/\bALTER\s+TABLE\b/i);
      expect(preflightBlock).not.toMatch(/\bDROP\s+TABLE\b/i);
      expect(preflightBlock).not.toMatch(/\bCREATE\s+POLICY\b/i);
      expect(preflightBlock).not.toMatch(/\bCREATE\s+TRIGGER\b/i);
      // Matches only actual GRANT/REVOKE statement shapes, not the word
      // "grant" inside prose like "holds a grant option" in a RAISE
      // EXCEPTION message (the ACL-scan check further below legitimately
      // uses that phrase).
      expect(preflightBlock).not.toMatch(
        /\b(?:GRANT|REVOKE)\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN|EXECUTE|USAGE)\b/i,
      );
    });

    it('fail-closed RAISE EXCEPTION appears many times (preflight and postcheck both fail closed)', () => {
      const count = (executable.match(/RAISE EXCEPTION/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(10);
    });
  });

  describe('verifies public.set_updated_at() carries the COMPLETE hardened contract before binding a trigger to it', () => {
    const requiredFields = [
      'prokind',
      'identity_args',
      'rettype',
      'proretset',
      'lang',
      'secdef',
      'volatility',
      'is_strict',
      'parallel',
      'leakproof',
      'owner',
      'proconfig',
    ];

    it('checks every behavior-affecting property in the preflight', () => {
      for (const field of requiredFields) {
        expect(preflightBlock, `preflight must check fn.${field}`).toMatch(new RegExp(`fn\\.${field}\\b`));
      }
    });

    it('checks every behavior-affecting property again in the postcheck (the trigger dependency is part of the final contract)', () => {
      for (const field of requiredFields) {
        expect(postcheckBlock, `postcheck must check fn.${field}`).toMatch(new RegExp(`fn\\.${field}\\b`));
      }
    });

    it('requires proconfig exactly {search_path=pg_catalog} in both blocks', () => {
      expect(preflightBlock).toMatch(/'search_path=pg_catalog'\s*=\s*ANY\s*\(fn\.proconfig\)/);
      expect(postcheckBlock).toMatch(/'search_path=pg_catalog'\s*=\s*ANY\s*\(fn\.proconfig\)/);
    });

    it('requires the exact canonical normalized body in both blocks', () => {
      const bodyPattern = /fn\.body_norm IS DISTINCT FROM 'BEGIN NEW\.updated_at = pg_catalog\.now\(\); RETURN NEW; END;'/;
      expect(preflightBlock).toMatch(bodyPattern);
      expect(postcheckBlock).toMatch(bodyPattern);
    });

    it('uses a generic (not fixed-list) non-owner ACL scan for EXECUTE and grant option, in both blocks', () => {
      for (const block of [preflightBlock, postcheckBlock]) {
        expect(block).toMatch(/pg_catalog\.aclexplode\(\s*COALESCE\(fn\.proacl,\s*pg_catalog\.acldefault\('f',\s*fn\.owner_oid\)\)\s*\)/);
        expect(block).toMatch(/a\.grantee IS DISTINCT FROM fn\.owner_oid/);
        expect(block).toMatch(/fn_acl_row\.privilege_type = 'EXECUTE'/);
        expect(block).toMatch(/fn_acl_row\.is_grantable/);
        // Not restricted to a fixed list of role names.
        expect(block).not.toMatch(/grantee\s*=\s*'anon'::regrole/i);
        expect(block).not.toMatch(/grantee\s*=\s*'authenticated'::regrole/i);
        expect(block).not.toMatch(/grantee\s*=\s*'service_role'::regrole/i);
      }
    });

    it('asserts postgres (owner) retains effective EXECUTE on set_updated_at, in both blocks', () => {
      const pattern = /has_function_privilege\('postgres',\s*fn\.fn_oid,\s*'EXECUTE'\)/;
      expect(preflightBlock).toMatch(pattern);
      expect(postcheckBlock).toMatch(pattern);
    });

    it('never creates or replaces public.set_updated_at()', () => {
      expect(executable).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.set_updated_at/i);
      expect(executable).not.toMatch(/ALTER\s+FUNCTION\s+public\.set_updated_at/i);
    });
  });

  describe('canonical six-column shape and defaults', () => {
    it('CREATE TABLE IF NOT EXISTS public.profiles with the six audited columns in order', () => {
      expect(executable).toMatch(/CREATE TABLE IF NOT EXISTS public\.profiles\s*\(/);
      const start = executable.indexOf('CREATE TABLE IF NOT EXISTS public.profiles');
      const end = executable.indexOf(');', start);
      const body = executable.slice(start, end);
      expect(body).toMatch(/id\s+uuid\s+NOT NULL/);
      expect(body).toMatch(/display_name\s+text/);
      expect(body).toMatch(/avatar_url\s+text/);
      expect(body).toMatch(/default_servings\s+integer\s+NOT NULL\s+DEFAULT\s+1/);
      expect(body).toMatch(/created_at\s+timestamptz\s+NOT NULL\s+DEFAULT\s+pg_catalog\.now\(\)/);
      expect(body).toMatch(/updated_at\s+timestamptz\s+NOT NULL\s+DEFAULT\s+pg_catalog\.now\(\)/);
      // Ordering: each column's index must increase left to right.
      const order = ['id', 'display_name', 'avatar_url', 'default_servings', 'created_at', 'updated_at'];
      const positions = order.map((c) => body.search(new RegExp(`\\b${c}\\s`)));
      for (const p of positions) expect(p).toBeGreaterThan(-1);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
    });

    it('display_name and avatar_url carry no DEFAULT clause', () => {
      const start = executable.indexOf('CREATE TABLE IF NOT EXISTS public.profiles');
      const end = executable.indexOf(');', start);
      const body = executable.slice(start, end);
      expect(body).not.toMatch(/display_name[^\n,]*DEFAULT/i);
      expect(body).not.toMatch(/avatar_url[^\n,]*DEFAULT/i);
    });

    it('the catalog comparison still expects the pg_get_expr-deparsed "now()" rendering', () => {
      // pg_get_expr deparses a resolvable builtin pg_catalog.now() call
      // back to the unqualified form; the comparison intentionally still
      // expects that exact rendering, not "pg_catalog.now()" literally.
      expect(executable).toMatch(/\(5, 'created_at',[\s\S]{0,80}'now\(\)'\)/);
      expect(executable).toMatch(/\(6, 'updated_at',[\s\S]{0,80}'now\(\)'\)/);
    });
  });

  describe('exact named constraints and FK action', () => {
    it('declares profiles_pkey, profiles_id_fkey with ON DELETE CASCADE, and profiles_default_servings_check', () => {
      expect(executable).toMatch(/CONSTRAINT profiles_pkey PRIMARY KEY \(id\)/);
      expect(executable).toMatch(
        /CONSTRAINT profiles_id_fkey FOREIGN KEY \(id\) REFERENCES auth\.users\(id\) ON DELETE CASCADE/,
      );
      expect(executable).toMatch(/CONSTRAINT profiles_default_servings_check CHECK \(default_servings > 0\)/);
    });

    it('the preflight/postcheck compare each constraint by its exact expected definition text', () => {
      expect(executable).toMatch(/'PRIMARY KEY \(id\)'/);
      expect(executable).toMatch(
        /'FOREIGN KEY \(id\) REFERENCES auth\.users\(id\) ON DELETE CASCADE'/,
      );
      expect(executable).toMatch(/'CHECK \(\(default_servings > 0\)\)'/);
    });
  });

  describe('owner and comments', () => {
    it('sets owner to postgres via a separate static ALTER TABLE', () => {
      expect(executable).toMatch(/ALTER TABLE public\.profiles OWNER TO postgres/);
    });

    it('applies the exact audited table and column comments', () => {
      expect(executable).toMatch(
        /COMMENT ON TABLE public\.profiles IS\s*\n?\s*'Application user profile table linked to auth\.users'/,
      );
      expect(executable).toMatch(
        /COMMENT ON COLUMN public\.profiles\.default_servings IS\s*\n?\s*'Default serving size for the user, PrepMeal uses 1 by default'/,
      );
    });
  });

  describe('RLS enabled, never forced', () => {
    it('enables row level security', () => {
      expect(executable).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY/);
    });

    it('never forces row level security', () => {
      // Matches only the actual DDL statement shape, not prose inside a
      // RAISE EXCEPTION message describing what would be rejected.
      expect(executable).not.toMatch(/ALTER\s+TABLE\s+public\.profiles\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
      expect(executable).not.toMatch(/\bNO\s+FORCE\s+ROW\s+LEVEL\s+SECURITY\b/i);
    });
  });

  describe('exactly three named policies, correct command/role scoping, no DELETE policy', () => {
    it('creates "Users can view own profile" FOR SELECT TO authenticated with the self predicate on USING', () => {
      expect(executable).toMatch(
        /CREATE POLICY "Users can view own profile" ON public\.profiles\s*\n?\s*FOR SELECT TO authenticated\s*\n?\s*USING \(\(select auth\.uid\(\)\) IS NOT NULL AND \(select auth\.uid\(\)\) = id\)/,
      );
    });

    it('creates "Users can insert own profile" FOR INSERT TO authenticated with the self predicate on WITH CHECK', () => {
      expect(executable).toMatch(
        /CREATE POLICY "Users can insert own profile" ON public\.profiles\s*\n?\s*FOR INSERT TO authenticated\s*\n?\s*WITH CHECK \(\(select auth\.uid\(\)\) IS NOT NULL AND \(select auth\.uid\(\)\) = id\)/,
      );
    });

    it('creates "Users can update own profile" FOR UPDATE TO authenticated with the self predicate on both USING and WITH CHECK', () => {
      expect(executable).toMatch(
        /CREATE POLICY "Users can update own profile" ON public\.profiles\s*\n?\s*FOR UPDATE TO authenticated\s*\n?\s*USING \(\(select auth\.uid\(\)\) IS NOT NULL AND \(select auth\.uid\(\)\) = id\)\s*\n?\s*WITH CHECK \(\(select auth\.uid\(\)\) IS NOT NULL AND \(select auth\.uid\(\)\) = id\)/,
      );
    });

    it('never creates a FOR DELETE policy', () => {
      expect(executable).not.toMatch(/CREATE POLICY[^;]*FOR DELETE/i);
    });

    it('every CREATE POLICY targets only public.profiles', () => {
      const stmts = executable.match(/CREATE POLICY[\s\S]*?;/g) ?? [];
      expect(stmts.length).toBeGreaterThan(0);
      for (const s of stmts) {
        expect(s).toMatch(/ON public\.profiles/);
      }
    });

    it('guards each CREATE POLICY with a pg_policies existence check, not unconditional DDL', () => {
      const count = (executable.match(/FROM pg_catalog\.pg_policies/g) ?? []).length;
      // 3 existence guards in step B, plus policy-shape checks in preflight and postcheck.
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('trigger bound to public.set_updated_at() only, with the complete audited shape', () => {
    it('creates trg_profiles_updated_at BEFORE UPDATE FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', () => {
      expect(executable).toMatch(
        /CREATE TRIGGER trg_profiles_updated_at\s*\n?\s*BEFORE UPDATE ON public\.profiles\s*\n?\s*FOR EACH ROW EXECUTE FUNCTION public\.set_updated_at\(\)/,
      );
    });

    it('guards CREATE TRIGGER with a pg_trigger existence check', () => {
      expect(executable).toMatch(/FROM pg_catalog\.pg_trigger t[\s\S]*?trg_profiles_updated_at/);
    });

    it('validates the trigger by function OID equality, not by name alone, in both blocks', () => {
      expect(preflightBlock).toMatch(/trg\.tgfoid IS DISTINCT FROM fn\.fn_oid/);
      expect(postcheckBlock).toMatch(/trg\.tgfoid IS DISTINCT FROM fn\.fn_oid/);
    });

    it('validates tgtype = 19 (BEFORE UPDATE FOR EACH ROW) in both blocks', () => {
      expect(preflightBlock).toMatch(/trg\.tgtype IS DISTINCT FROM 19/);
      expect(postcheckBlock).toMatch(/trg\.tgtype IS DISTINCT FROM 19/);
    });

    it('validates tgenabled = O (enabled) in both blocks', () => {
      expect(preflightBlock).toMatch(/trg\.tgenabled IS DISTINCT FROM 'O'/);
      expect(postcheckBlock).toMatch(/trg\.tgenabled IS DISTINCT FROM 'O'/);
    });

    it('validates tgnargs = 0 in both blocks', () => {
      expect(preflightBlock).toMatch(/trg\.tgnargs IS DISTINCT FROM 0/);
      expect(postcheckBlock).toMatch(/trg\.tgnargs IS DISTINCT FROM 0/);
    });

    it('selects tgenabled and tgnargs alongside tgname/tgfoid/tgtype in both blocks', () => {
      const selectPattern = /t\.tgname AS tgname,[\s\S]{0,120}?t\.tgenabled AS tgenabled,[\s\S]{0,40}?t\.tgnargs AS tgnargs/;
      expect(preflightBlock).toMatch(selectPattern);
      expect(postcheckBlock).toMatch(selectPattern);
    });
  });

  describe('scope containment', () => {
    it('performs no profiles row DML (no INSERT/UPDATE/DELETE against a profiles row, no row-content SELECT)', () => {
      expect(executable).not.toMatch(/INSERT INTO public\.profiles\s*\(/i);
      expect(executable).not.toMatch(/UPDATE public\.profiles SET/i);
      expect(executable).not.toMatch(/DELETE FROM public\.profiles/i);
      expect(executable).not.toMatch(/SELECT\s+\*\s+FROM public\.profiles\b/i);
    });

    it('never mentions ALTER DEFAULT PRIVILEGES', () => {
      expect(executable).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
    });

    it('never issues GRANT or REVOKE on public.profiles (that is the separate privilege migration)', () => {
      // Matches only actual statement shapes, not the word "grant" inside
      // "grant option" prose in a RAISE EXCEPTION message.
      expect(executable).not.toMatch(
        /\b(?:GRANT|REVOKE)\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN|EXECUTE|USAGE)\b/i,
      );
    });

    it('touches no table other than public.profiles (and only ever reads public.set_updated_at)', () => {
      expect(executable).not.toMatch(/CREATE TABLE(?!\s+IF NOT EXISTS public\.profiles)/i);
      expect(executable).not.toMatch(/ALTER TABLE(?!\s+public\.profiles)/i);
      expect(executable).not.toMatch(/DROP TABLE/i);
      // Matches only actual DML statement shapes against auth.users, not
      // the FK's "REFERENCES auth.users(id) ON DELETE CASCADE" action
      // clause (which legitimately contains the word DELETE nearby).
      expect(executable).not.toMatch(/INSERT\s+INTO\s+auth\.users\b/i);
      expect(executable).not.toMatch(/UPDATE\s+auth\.users\s+SET\b/i);
      expect(executable).not.toMatch(/DELETE\s+FROM\s+auth\.users\b/i);
    });

    it('uses no dynamic SQL with interpolated values (only fully static EXECUTE strings)', () => {
      const execBlocks = executable.match(/EXECUTE\s+\$sql\$[\s\S]*?\$sql\$/g) ?? [];
      expect(execBlocks.length).toBeGreaterThanOrEqual(4); // 3 policies + 1 trigger
      for (const block of execBlocks) {
        expect(block).not.toMatch(/\|\|/); // no string concatenation
        expect(block).not.toMatch(/format\s*\(/i); // no format() interpolation
      }
    });
  });

  describe('comment corrections', () => {
    // These check the RAW file (comments included), not `executable`
    // (which has every `--` comment line stripped and so can never
    // contain prose corrections by construction).
    it('does not claim repository callers exist ("actively-used")', () => {
      expect(sql).not.toMatch(/actively-used/i);
    });

    it('describes public.profiles as "purpose-built", not a caller-existence claim', () => {
      expect(sql).toMatch(/purpose-built table/i);
    });

    it('does not use "byte-for-byte" phrasing', () => {
      expect(sql).not.toMatch(/byte-for-byte/i);
    });

    it('uses "matches the complete audited catalog contract" phrasing', () => {
      expect(sql).toMatch(/matches the complete audited catalog contract/i);
    });
  });
});

describe('migration: revoke_profiles_unneeded_privileges', () => {
  const { sql, executable } = loadBySuffix(SUFFIX_PRIVILEGE);
  const preflightBlock = preflightBlockOf(executable);
  const postcheckBlock = postcheckBlockOf(executable);

  describe('ordering and fail-closed shape', () => {
    it('the preflight DO block appears before the REVOKE statements', () => {
      const preflightIdx = executable.indexOf('$preflight$');
      const revokeAnonIdx = executable.indexOf('REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon');
      expect(preflightIdx).toBeGreaterThan(-1);
      expect(revokeAnonIdx).toBeGreaterThan(-1);
      expect(preflightIdx).toBeLessThan(revokeAnonIdx);
    });

    it('the postcheck DO block appears after both REVOKE statements', () => {
      const postcheckIdx = executable.indexOf('$postcheck$');
      const revokeAnonIdx = executable.indexOf('REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon');
      const revokeAuthIdx = executable.indexOf('REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN');
      expect(postcheckIdx).toBeGreaterThan(revokeAnonIdx);
      expect(postcheckIdx).toBeGreaterThan(revokeAuthIdx);
    });

    it('fail-closed RAISE EXCEPTION appears multiple times', () => {
      const count = (executable.match(/RAISE EXCEPTION/g) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(8);
    });
  });

  describe('exact REVOKE statements', () => {
    it('revokes ALL PRIVILEGES from anon', () => {
      expect(executable).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.profiles FROM anon;/);
    });

    it('revokes exactly DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN from authenticated', () => {
      expect(executable).toMatch(
        /REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN\s*\n?\s*ON TABLE public\.profiles FROM authenticated;/,
      );
    });

    it('does not revoke SELECT, INSERT or UPDATE from authenticated', () => {
      const authRevoke = executable.match(/REVOKE[^;]*FROM authenticated;/g) ?? [];
      expect(authRevoke.length).toBeGreaterThan(0);
      for (const stmt of authRevoke) {
        expect(stmt).not.toMatch(/\bSELECT\b/);
        expect(stmt).not.toMatch(/\bINSERT\b/);
        expect(stmt).not.toMatch(/\bUPDATE\b/);
      }
    });

    it('never GRANTs anything to anon or authenticated', () => {
      expect(executable).not.toMatch(/GRANT[^;]*\bTO\s+(anon|authenticated)\b/i);
    });

    it('never revokes from or grants to service_role', () => {
      expect(executable).not.toMatch(/REVOKE[^;]*FROM\s+service_role/i);
      expect(executable).not.toMatch(/GRANT[^;]*TO\s+service_role/i);
    });

    it('touches only public.profiles in every GRANT/REVOKE statement', () => {
      // Anchored to an actual statement keyword immediately followed by a
      // privilege list, not the word "grant" inside "grant option" prose
      // in a RAISE EXCEPTION message.
      const stmts =
        executable.match(
          /\b(?:GRANT|REVOKE)\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN|EXECUTE|USAGE)\b[\s\S]*?;/g,
        ) ?? [];
      expect(stmts.length).toBeGreaterThan(0);
      for (const s of stmts) {
        expect(s).toMatch(/public\.profiles/);
      }
    });
  });

  describe('preflight: owner verified before use as the expected grantor', () => {
    it('fetches and verifies public.profiles owner is exactly postgres', () => {
      expect(preflightBlock).toMatch(/pg_catalog\.pg_get_userbyid\(c\.relowner\)::text\s*AS owner/);
      expect(preflightBlock).toMatch(/IF rel\.owner IS DISTINCT FROM 'postgres' THEN/);
    });

    it('the owner check appears before the raw ACL comparison that relies on it', () => {
      const ownerCheckIdx = preflightBlock.indexOf(`IF rel.owner IS DISTINCT FROM 'postgres' THEN`);
      // Search for the comparison's actual usage, not the "acl_mismatches
      // int;" DECLARE line (which appears before BEGIN and would always
      // be found first regardless of statement order).
      const aclIdx = preflightBlock.indexOf('SELECT pg_catalog.count(*) INTO acl_mismatches');
      expect(ownerCheckIdx).toBeGreaterThan(-1);
      expect(aclIdx).toBeGreaterThan(-1);
      expect(ownerCheckIdx).toBeLessThan(aclIdx);
    });
  });

  describe('preflight: exact raw pre-state ACL, fail closed, never touches PUBLIC/unknown roles', () => {
    it('expects the full 8-privilege pre-state set for anon, authenticated and service_role, each granted by rel.owner and not grantable (24 rows)', () => {
      const roles = ['anon', 'authenticated', 'service_role'];
      const privs = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'];
      for (const role of roles) {
        for (const priv of privs) {
          expect(
            preflightBlock,
            `preflight pre-state must expect ('${role}', '${priv}', rel.owner, false)`,
          ).toMatch(new RegExp(`'${role}',\\s*'${priv}',\\s*rel\\.owner,\\s*false\\)`));
        }
      }
    });

    it('the expected grantor is the verified table owner (rel.owner), not a silently-guessed literal', () => {
      // Every expected row uses the plpgsql variable rel.owner, not a
      // hardcoded 'postgres' string, as its grantor column.
      expect(preflightBlock).not.toMatch(/'anon',\s*'SELECT',\s*'postgres',\s*false\)/);
      expect(preflightBlock).toMatch(/expected\(grantee, privilege_type, grantor, is_grantable\)/);
    });

    it('compares the raw pre-state ACL via aclexplode with a PUBLIC-safe grantee AND grantor expression', () => {
      expect(preflightBlock).toMatch(/pg_catalog\.aclexplode\(\s*\n?\s*COALESCE\(c\.relacl,\s*pg_catalog\.acldefault\('r',\s*c\.relowner\)\)\s*\n?\s*\)/);
      expect(preflightBlock).toMatch(/CASE WHEN a\.grantee = 0 THEN 'PUBLIC' ELSE a\.grantee::regrole::text END/);
      expect(preflightBlock).toMatch(/CASE WHEN a\.grantor = 0 THEN 'PUBLIC' ELSE a\.grantor::regrole::text END/);
      expect(preflightBlock).toMatch(/a\.grantee IS DISTINCT FROM c\.relowner/);
    });

    it('the actual CTE selects is_grantable as part of the raw row identity, not as a separate check', () => {
      expect(preflightBlock).toMatch(/actual\(grantee, privilege_type, grantor, is_grantable\)/);
      expect(preflightBlock).toMatch(/a\.is_grantable\s*\n\s*FROM pg_catalog\.pg_class c/);
    });

    it('uses a symmetric EXCEPT ALL over the complete 4-column row identity, not a FULL OUTER JOIN on (grantee, privilege_type)', () => {
      expect(preflightBlock).toMatch(
        /\(SELECT \* FROM expected EXCEPT ALL SELECT \* FROM actual\)\s*\n?\s*UNION ALL\s*\n?\s*\(SELECT \* FROM actual EXCEPT ALL SELECT \* FROM expected\)/,
      );
      // The old join-based comparison must be gone entirely.
      expect(preflightBlock).not.toMatch(/FULL OUTER JOIN[\s\S]*?USING \(grantee, privilege_type\)/);
      expect(preflightBlock).not.toMatch(/WHERE actual\.grantee IS NULL OR expected\.grantee IS NULL/);
      expect(preflightBlock).toMatch(/acl_mismatches/);
    });

    it('fails closed on acl_mismatches without ever granting/revoking PUBLIC or an unknown role', () => {
      expect(preflightBlock).toMatch(/IF acl_mismatches <> 0 THEN/);
      expect(preflightBlock).toMatch(/RAISE EXCEPTION/);
      // Matches only actual statement shapes, not the word "grant" inside
      // "grant option" prose in a RAISE EXCEPTION message.
      expect(preflightBlock).not.toMatch(
        /\b(?:GRANT|REVOKE)\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER|MAINTAIN|EXECUTE|USAGE)\b/i,
      );
    });

    it('still checks for a pre-REVOKE column-level attacl', () => {
      expect(preflightBlock).toMatch(/a\.attacl IS NOT NULL/);
    });
  });

  describe('preflight and postcheck: total non-internal trigger count and complete shape, resolved by set_updated_at OID', () => {
    it('counts ALL non-internal triggers, not filtered by name, in both blocks', () => {
      const trgCountQuery = /SELECT pg_catalog\.count\(\*\) INTO trg_count\s*\n?\s*FROM pg_catalog\.pg_trigger t\s*\n?\s*WHERE t\.tgrelid = 'public\.profiles'::regclass AND NOT t\.tgisinternal;/;
      expect(preflightBlock).toMatch(trgCountQuery);
      expect(postcheckBlock).toMatch(trgCountQuery);
    });

    it('resolves public.set_updated_at() OID independently in both blocks', () => {
      expect(preflightBlock).toMatch(/FROM pg_catalog\.pg_proc p[\s\S]{0,200}?p\.proname = 'set_updated_at'/);
      expect(postcheckBlock).toMatch(/FROM pg_catalog\.pg_proc p[\s\S]{0,200}?p\.proname = 'set_updated_at'/);
    });

    it('validates trigger name, tgfoid (against the resolved OID), tgtype=19, tgenabled=O and tgnargs=0 together, in both blocks', () => {
      const validation = /trg\.tgname IS DISTINCT FROM 'trg_profiles_updated_at'\s*\n?\s*OR trg\.tgfoid IS DISTINCT FROM fn_oid\s*\n?\s*OR trg\.tgtype IS DISTINCT FROM 19\s*\n?\s*OR trg\.tgenabled IS DISTINCT FROM 'O'\s*\n?\s*OR trg\.tgnargs IS DISTINCT FROM 0/;
      expect(preflightBlock).toMatch(validation);
      expect(postcheckBlock).toMatch(validation);
    });
  });

  describe('postcheck: logical-polarity privilege checks (not merely that has_table_privilege appears)', () => {
    it('anon: every one of the 8 privileges is checked as FORBIDDEN (positive has_table_privilege, fails if TRUE)', () => {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
        assertPrivilegeCheckPolarity(
          postcheckBlock,
          `has_table_privilege('anon', 'public.profiles', '${priv}')`,
          false,
        );
      }
    });

    it('authenticated: SELECT/INSERT/UPDATE are checked as REQUIRED (negated, fails if FALSE)', () => {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE']) {
        assertPrivilegeCheckPolarity(
          postcheckBlock,
          `has_table_privilege('authenticated', 'public.profiles', '${priv}')`,
          true,
        );
      }
    });

    it('authenticated: the other 5 privileges are checked as FORBIDDEN (positive, fails if TRUE)', () => {
      for (const priv of ['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
        assertPrivilegeCheckPolarity(
          postcheckBlock,
          `has_table_privilege('authenticated', 'public.profiles', '${priv}')`,
          false,
        );
      }
    });

    it('service_role: every one of the 8 privileges is checked as REQUIRED (negated, fails if FALSE)', () => {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
        assertPrivilegeCheckPolarity(
          postcheckBlock,
          `has_table_privilege('service_role', 'public.profiles', '${priv}')`,
          true,
        );
      }
    });

    it('postgres (owner): SELECT and UPDATE are checked as REQUIRED', () => {
      assertPrivilegeCheckPolarity(postcheckBlock, "has_table_privilege('postgres', 'public.profiles', 'SELECT')", true);
      assertPrivilegeCheckPolarity(postcheckBlock, "has_table_privilege('postgres', 'public.profiles', 'UPDATE')", true);
    });
  });

  describe('postcheck: owner re-verified before use as the expected grantor', () => {
    it('re-fetches and verifies public.profiles owner is still exactly postgres', () => {
      expect(postcheckBlock).toMatch(/pg_catalog\.pg_get_userbyid\(c\.relowner\)::text INTO owner_name/);
      expect(postcheckBlock).toMatch(/IF owner_name IS DISTINCT FROM 'postgres' THEN/);
    });

    it('the owner check appears before the raw ACL comparison that relies on it', () => {
      const ownerCheckIdx = postcheckBlock.indexOf(`IF owner_name IS DISTINCT FROM 'postgres' THEN`);
      // Search for the comparison's actual usage, not the "acl_mismatches
      // int;" DECLARE line (which appears before BEGIN and would always
      // be found first regardless of statement order).
      const aclIdx = postcheckBlock.indexOf('SELECT pg_catalog.count(*) INTO acl_mismatches');
      expect(ownerCheckIdx).toBeGreaterThan(-1);
      expect(aclIdx).toBeGreaterThan(-1);
      expect(ownerCheckIdx).toBeLessThan(aclIdx);
    });
  });

  describe('postcheck: exact direct EXCEPT ALL comparison of the post-state ACL', () => {
    it('expects exactly SELECT/INSERT/UPDATE for authenticated and the full 8-privilege set for service_role, each granted by owner_name and not grantable (11 rows), nothing for anon/PUBLIC', () => {
      for (const priv of ['SELECT', 'INSERT', 'UPDATE']) {
        expect(postcheckBlock).toMatch(new RegExp(`'authenticated',\\s*'${priv}',\\s*owner_name,\\s*false\\)`));
      }
      for (const priv of ['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
        // authenticated must NOT appear paired with these in the expected post-state VALUES list.
        expect(postcheckBlock).not.toMatch(new RegExp(`'authenticated',\\s*'${priv}',`));
      }
      for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']) {
        expect(postcheckBlock).toMatch(new RegExp(`'service_role',\\s*'${priv}',\\s*owner_name,\\s*false\\)`));
      }
      // Scoped to the 4-column expected-row shape, not the whole block --
      // a bare `'anon',\s*'` would also match the legitimate
      // has_table_privilege('anon', 'public.profiles', ...) calls earlier
      // in postcheck that verify anon has zero effective privileges.
      expect(postcheckBlock).not.toMatch(/'anon',\s*'[A-Z]+',\s*owner_name,\s*false\)/);
    });

    it('the expected grantor is the re-verified owner_name variable, not a silently-guessed literal', () => {
      expect(postcheckBlock).not.toMatch(/'authenticated',\s*'SELECT',\s*'postgres',\s*false\)/);
      expect(postcheckBlock).toMatch(/expected\(grantee, privilege_type, grantor, is_grantable\)/);
    });

    it('compares via aclexplode with a PUBLIC-safe grantee AND grantor expression', () => {
      expect(postcheckBlock).toMatch(/pg_catalog\.aclexplode\(\s*\n?\s*COALESCE\(c\.relacl,\s*pg_catalog\.acldefault\('r',\s*c\.relowner\)\)\s*\n?\s*\)/);
      expect(postcheckBlock).toMatch(/CASE WHEN a\.grantee = 0 THEN 'PUBLIC' ELSE a\.grantee::regrole::text END/);
      expect(postcheckBlock).toMatch(/CASE WHEN a\.grantor = 0 THEN 'PUBLIC' ELSE a\.grantor::regrole::text END/);
    });

    it('the actual CTE selects is_grantable as part of the raw row identity, not as a separate check', () => {
      expect(postcheckBlock).toMatch(/actual\(grantee, privilege_type, grantor, is_grantable\)/);
      expect(postcheckBlock).toMatch(/a\.is_grantable\s*\n\s*FROM pg_catalog\.pg_class c/);
    });

    it('the owner entry is excluded from the non-owner comparison (grantee IS DISTINCT FROM c.relowner)', () => {
      expect(postcheckBlock).toMatch(/a\.grantee IS DISTINCT FROM c\.relowner/);
    });

    it('uses a symmetric EXCEPT ALL over the complete 4-column row identity, not a FULL OUTER JOIN on (grantee, privilege_type)', () => {
      expect(postcheckBlock).toMatch(
        /\(SELECT \* FROM expected EXCEPT ALL SELECT \* FROM actual\)\s*\n?\s*UNION ALL\s*\n?\s*\(SELECT \* FROM actual EXCEPT ALL SELECT \* FROM expected\)/,
      );
      expect(postcheckBlock).not.toMatch(/FULL OUTER JOIN[\s\S]*?USING \(grantee, privilege_type\)/);
      expect(postcheckBlock).not.toMatch(/WHERE actual\.grantee IS NULL OR expected\.grantee IS NULL/);
    });

    it('fails closed on acl_mismatches', () => {
      expect(postcheckBlock).toMatch(/IF acl_mismatches <> 0 THEN/);
    });

    it('still checks for a post-REVOKE column-level attacl', () => {
      expect(postcheckBlock).toMatch(/a\.attacl IS NOT NULL/);
    });
  });

  describe('no trace of the defective FULL OUTER JOIN (grantee, privilege_type) comparison remains anywhere in the file', () => {
    it('the whole file contains no FULL OUTER JOIN on (grantee, privilege_type)', () => {
      expect(executable).not.toMatch(/FULL OUTER JOIN[\s\S]*?USING \(grantee, privilege_type\)/);
    });

    it('the whole file contains no ACL mismatch WHERE clause keyed only on grantee IS NULL', () => {
      expect(executable).not.toMatch(/WHERE actual\.grantee IS NULL OR expected\.grantee IS NULL/);
    });

    it('both raw ACL comparisons (pre-state and post-state) use EXCEPT ALL, appearing exactly twice', () => {
      const count = (executable.match(/EXCEPT ALL/g) ?? []).length;
      expect(count).toBe(4); // 2 EXCEPT ALL per comparison x 2 comparisons (preflight + postcheck)
    });
  });

  describe('scope containment', () => {
    it('performs no schema mutation (no CREATE/ALTER/DROP TABLE/POLICY/TRIGGER/SCHEMA)', () => {
      expect(executable).not.toMatch(/\bCREATE\s+TABLE\b/i);
      expect(executable).not.toMatch(/\bALTER\s+TABLE\b/i);
      expect(executable).not.toMatch(/\bDROP\s+TABLE\b/i);
      expect(executable).not.toMatch(/\bCREATE\s+POLICY\b/i);
      expect(executable).not.toMatch(/\bALTER\s+POLICY\b/i);
      expect(executable).not.toMatch(/\bDROP\s+POLICY\b/i);
      expect(executable).not.toMatch(/\bCREATE\s+TRIGGER\b/i);
      expect(executable).not.toMatch(/\bDROP\s+TRIGGER\b/i);
      expect(executable).not.toMatch(/\bCREATE\s+SCHEMA\b/i);
    });

    it('never mentions ALTER DEFAULT PRIVILEGES', () => {
      expect(executable).not.toMatch(/ALTER DEFAULT PRIVILEGES/i);
    });

    it('uses no dynamic SQL (no EXECUTE statement anywhere)', () => {
      expect(executable).not.toMatch(/\bEXECUTE\b/i);
    });

    it('asserts RLS remains enabled and not forced, and asserts the same three policies with no DELETE policy', () => {
      expect(postcheckBlock).toMatch(/rel\.rls_enabled IS DISTINCT FROM true/);
      expect(postcheckBlock).toMatch(/rel\.force_rls IS DISTINCT FROM false/);
      expect(postcheckBlock).toMatch(/cmd = 'DELETE'/);
    });
  });

  describe('comment corrections', () => {
    // These check the RAW file (comments included), not `executable`
    // (which has every `--` comment line stripped and so can never
    // contain prose corrections by construction).
    it('does not claim the preflight confirms the complete table shape', () => {
      expect(sql).not.toMatch(/established \(table\s*\n?\s*--?\s*shape,/i);
    });

    it('describes the preflight as checking the baseline security subset', () => {
      expect(sql).toMatch(/baseline security subset/i);
    });
  });
});
