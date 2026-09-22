import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the CLI-generated migration
//   supabase/migrations/<CLI_TIMESTAMP>_harden_recipe_catalog_client_write_boundary.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL via string/regex/tuple-parse matching
// against the comment-stripped text -- not a real SQL parse/execution.
// Assertions run against the SQL with `--` line comments stripped, so a
// word appearing only in prose cannot accidentally satisfy or violate a
// contract check meant to verify actual executable statements. Raw
// (un-stripped) `sql` is used only to assert that specific out-of-scope
// mentions, or the documented design-decision prose, are confined to
// comment lines and are present there.
//
// IMPORTANT (fixed during the H-1/H-2/H-3 correction pass): comment-text
// anchors (e.g. a literal like 'HARDENED_FINAL_STATE candidate' that only
// ever appears inside a `--` comment) do NOT survive `stripLineComments`
// and must never be used to slice `executable`-derived text -- doing so
// silently returns `indexOf(...) === -1`, and a subsequent `.slice(-1)`
// degrades to a 1-character string against which almost any `not.toMatch`
// assertion passes for the wrong reason. Every block-extraction helper
// below anchors exclusively on executable SQL tokens (keywords, variable
// names, `AS expected(...)` headers) that are provably present in
// `executable`, and asserts `toBeGreaterThan(-1)` before slicing.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_harden_recipe_catalog_client_write_boundary.sql';

const TARGET_TABLES = [
  'ingredients',
  'units',
  'equipment',
  'recipes',
  'recipe_ingredients',
  'recipe_steps',
  'recipe_equipment',
  'ingredient_substitutions',
].sort();

const REMOVED_WRITE_POLICIES: Array<[string, string]> = [
  ['recipes', 'insert own recipes'],
  ['recipes', 'Allow insert for authenticated users'],
  ['recipes', 'update own recipes'],
  ['recipes', 'delete own recipes'],
  ['recipe_ingredients', 'write recipe_ingredients for own recipes'],
  ['recipe_steps', 'write steps for own recipes'],
  ['recipe_equipment', 'write recipe_equipment for own recipes'],
];

const SURVIVING_SELECT_POLICIES: Array<[string, string]> = [
  ['equipment', 'read equipment'],
  ['ingredient_substitutions', 'read ingredient substitutions'],
  ['ingredients', 'read ingredients'],
  ['recipe_equipment', 'read equipment for visible recipes'],
  ['recipe_ingredients', 'read ingredients for visible recipes'],
  ['recipe_steps', 'read steps for visible recipes'],
  ['recipes', 'read public recipes'],
  ['units', 'read units'],
];

const REVOKED_PRIVILEGES = ['DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'TRIGGER', 'TRUNCATE', 'UPDATE'].sort();

// ---------------------------------------------------------------------------
// Ground truth for the full 7-field policy identity (table_name, policy_name,
// command, permissive, roles, qual, with_check), sourced independently from
// the live catalog (BEGIN READ ONLY / SELECT / COMMIT re-confirmation run
// during the second independent static review -- see
// /home/venn/prepmeal-recipe-catalog-write-hardening-static-review.md,
// "STEP 2" -- NOT extracted from this migration file). This is what fixes
// H-1: every field the migration's own preflight/postcheck compare is here
// pinned against a source of truth independent of the file under test.
// ---------------------------------------------------------------------------
type PolicyRow = {
  table: string;
  name: string;
  cmd: string;
  permissive: string;
  roles: string;
  qual: string;
  withcheck: string;
};

const LIVE_VULNERABLE_POLICIES: PolicyRow[] = [
  { table: 'equipment', name: 'read equipment', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: '{public}', qual: 'true', withcheck: 'NULL' },
  { table: 'ingredient_substitutions', name: 'read ingredient substitutions', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: '{public}', qual: 'true', withcheck: 'NULL' },
  { table: 'ingredients', name: 'read ingredients', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: '{public}', qual: 'true', withcheck: 'NULL' },
  {
    table: 'recipe_equipment',
    name: 'read equipment for visible recipes',
    cmd: 'SELECT',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.is_public = true))))',
    withcheck: 'NULL',
  },
  {
    table: 'recipe_equipment',
    name: 'write recipe_equipment for own recipes',
    cmd: 'ALL',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))',
    withcheck: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_equipment.recipe_id) AND (r.author_id = auth.uid()))))',
  },
  {
    table: 'recipe_ingredients',
    name: 'read ingredients for visible recipes',
    cmd: 'SELECT',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.is_public = true))))',
    withcheck: 'NULL',
  },
  {
    table: 'recipe_ingredients',
    name: 'write recipe_ingredients for own recipes',
    cmd: 'ALL',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))',
    withcheck: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_ingredients.recipe_id) AND (r.author_id = auth.uid()))))',
  },
  {
    table: 'recipe_steps',
    name: 'read steps for visible recipes',
    cmd: 'SELECT',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_steps.recipe_id) AND (r.is_public = true))))',
    withcheck: 'NULL',
  },
  {
    table: 'recipe_steps',
    name: 'write steps for own recipes',
    cmd: 'ALL',
    permissive: 'PERMISSIVE',
    roles: '{public}',
    qual: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))',
    withcheck: '(EXISTS ( SELECT 1\n   FROM recipes r\n  WHERE ((r.id = recipe_steps.recipe_id) AND (r.author_id = auth.uid()))))',
  },
  { table: 'recipes', name: 'Allow insert for authenticated users', cmd: 'INSERT', permissive: 'PERMISSIVE', roles: '{authenticated}', qual: 'NULL', withcheck: 'true' },
  { table: 'recipes', name: 'delete own recipes', cmd: 'DELETE', permissive: 'PERMISSIVE', roles: '{public}', qual: '(author_id = auth.uid())', withcheck: 'NULL' },
  { table: 'recipes', name: 'insert own recipes', cmd: 'INSERT', permissive: 'PERMISSIVE', roles: '{public}', qual: 'NULL', withcheck: '(author_id = auth.uid())' },
  { table: 'recipes', name: 'read public recipes', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: '{public}', qual: '(is_public = true)', withcheck: 'NULL' },
  { table: 'recipes', name: 'update own recipes', cmd: 'UPDATE', permissive: 'PERMISSIVE', roles: '{public}', qual: '(author_id = auth.uid())', withcheck: '(author_id = auth.uid())' },
  { table: 'units', name: 'read units', cmd: 'SELECT', permissive: 'PERMISSIVE', roles: '{public}', qual: 'true', withcheck: 'NULL' },
];

const LIVE_HARDENED_POLICIES: PolicyRow[] = LIVE_VULNERABLE_POLICIES.filter(
  (p) => !REMOVED_WRITE_POLICIES.some(([t, n]) => t === p.table && n === p.name),
);

function policyKey(p: PolicyRow): string {
  return `${p.table}::${p.name}`;
}

function sortPolicies(rows: PolicyRow[]): PolicyRow[] {
  return [...rows].sort((a, b) => policyKey(a).localeCompare(policyKey(b)));
}

// ---------------------------------------------------------------------------
// SQL text helpers
// ---------------------------------------------------------------------------

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

function loadMigration(): { file: string; version: string; sql: string; executable: string } {
  const all = activeMigrationFiles();
  const matches = all.filter((f) => f.endsWith(SUFFIX));
  expect(matches.length, `exactly one *${SUFFIX} migration should exist, found: ${JSON.stringify(matches)}`).toBe(1);
  const file = matches[0];
  const version = file.slice(0, 14);
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  return { file, version, sql, executable: stripLineComments(sql) };
}

function preflightBlockOf(executable: string): string {
  const start = executable.indexOf('DO $preflight$');
  const end = executable.indexOf('$preflight$;') + '$preflight$;'.length;
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return executable.slice(start, end);
}

function postcheckBlockOf(executable: string): string {
  const start = executable.indexOf('DO $postcheck$');
  expect(start).toBeGreaterThan(-1);
  return executable.slice(start);
}

/** Everything strictly between the end of preflight and the start of postcheck. */
function mutationBlockOf(executable: string): string {
  const preflightEnd = executable.indexOf('$preflight$;') + '$preflight$;'.length;
  const postcheckStart = executable.indexOf('DO $postcheck$');
  expect(preflightEnd).toBeGreaterThan(0);
  expect(postcheckStart).toBeGreaterThan(preflightEnd);
  return executable.slice(preflightEnd, postcheckStart);
}

/** Extract the string contents of a Postgres ARRAY['a','b',...] literal, sorted. */
function extractArrayLiteral(sql: string, marker: string): string[] {
  const idx = sql.indexOf(marker);
  expect(idx, `expected to find array literal near: ${marker}`).toBeGreaterThan(-1);
  const arrStart = sql.indexOf('ARRAY[', idx);
  const arrEnd = sql.indexOf(']', arrStart);
  expect(arrStart).toBeGreaterThan(-1);
  const inner = sql.slice(arrStart + 'ARRAY['.length, arrEnd);
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^'/, '').replace(/'$/, ''))
    .sort();
}

/** Slice `text` strictly between two markers, both required to be present, searched from `fromIndex`. */
function sliceBetweenMarkers(text: string, startMarker: string, endMarker: string, fromIndex = 0): string {
  const s = text.indexOf(startMarker, fromIndex);
  expect(s, `expected to find start marker "${startMarker}" from index ${fromIndex}`).toBeGreaterThan(-1);
  const afterStart = s + startMarker.length;
  const e = text.indexOf(endMarker, afterStart);
  expect(e, `expected to find end marker "${endMarker}" after start marker "${startMarker}"`).toBeGreaterThan(-1);
  return text.slice(afterStart, e);
}

function indexOfOrFail(text: string, marker: string, label: string, fromIndex = 0): number {
  const idx = text.indexOf(marker, fromIndex);
  expect(idx, `expected to find ${label}: "${marker}"`).toBeGreaterThan(-1);
  return idx;
}

/**
 * Extract the single SQL statement "SELECT count(*) INTO <varName> FROM ( ...
 * ) AS (symmetric_diff|diff);" for a given mismatch-counter variable, bounded
 * by that exact marker through the statement's own terminating ";". Used both
 * by the H-2 global-scope tests and by the associativity-grouping tests below
 * -- hoisted to module scope (moved out of the H-2 describe block, not
 * duplicated) so both can share one implementation.
 */
function extractIntoStatement(text: string, varName: string): string {
  const marker = `SELECT count(*) INTO ${varName} FROM (`;
  const start = indexOfOrFail(text, marker, `"${marker}" statement start`);
  const semi = text.indexOf(';', start);
  expect(semi, `expected a terminating ";" for the ${varName} statement`).toBeGreaterThan(start);
  return text.slice(start, semi + 1);
}

/**
 * Find the index of the ")" that matches the "(" at `openIdx`, respecting
 * single-quoted string literals (with '' escaping) so a literal "(" or ")"
 * embedded in a qual/with_check string value (e.g.
 * "(EXISTS ( SELECT 1 ... ))") never perturbs the paren-depth count.
 */
function findMatchingParen(text: string, openIdx: number): number {
  expect(text[openIdx], `expected "(" at index ${openIdx}`).toBe('(');
  let depth = 0;
  let inQuote = false;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") {
      if (inQuote && text[i + 1] === "'") {
        i++;
        continue;
      }
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract the two independently-parenthesized arms of a
 * "(A EXCEPT ALL B) UNION ALL (C EXCEPT ALL D)" symmetric-diff statement --
 * the exact grouping the postgres left-associativity fix depends on, since
 * an unparenthesized "A EXCEPT ALL B UNION ALL C EXCEPT ALL D" instead
 * parses as "((A EXCEPT ALL B) UNION ALL C) EXCEPT ALL D". Requires a real
 * "(" immediately (whitespace only) after "FROM (", a matching ")" for that
 * arm (via balanced, quote-aware paren matching -- never a naive string
 * split on "UNION ALL"), "UNION ALL" immediately (whitespace only) after
 * that closing paren, and a second independently-parenthesized arm
 * immediately (whitespace only) after "UNION ALL". Returns the INNER text
 * of each arm (the wrapping parens themselves excluded), so a caller
 * inspecting e.g. an arm's WHERE clause never sees a stray leading/trailing
 * grouping paren. Fails loudly -- via `expect` -- on any deviation from
 * this exact shape, rather than silently degrading to a differently-scoped
 * slice.
 */
function extractTwoParenthesizedArms(stmt: string, label: string): { armA: string; armB: string } {
  const fromMarker = 'FROM (';
  const fromIdx = indexOfOrFail(stmt, fromMarker, `${label}: "FROM (" marker`);
  let i = fromIdx + fromMarker.length;
  while (/\s/.test(stmt[i])) i++;
  expect(stmt[i], `${label}: expected arm A to open with "(" immediately (whitespace only) after "FROM ("`).toBe('(');
  const armAOpen = i;
  const armAClose = findMatchingParen(stmt, armAOpen);
  expect(armAClose, `${label}: arm A's opening "(" has no matching ")"`).toBeGreaterThan(armAOpen);
  const armA = stmt.slice(armAOpen + 1, armAClose);

  let j = armAClose + 1;
  while (/\s/.test(stmt[j])) j++;
  expect(
    stmt.slice(j, j + 'UNION ALL'.length),
    `${label}: expected "UNION ALL" immediately (whitespace only) after arm A's closing ")"`,
  ).toBe('UNION ALL');
  j += 'UNION ALL'.length;
  while (/\s/.test(stmt[j])) j++;
  expect(stmt[j], `${label}: expected arm B to open with "(" immediately (whitespace only) after "UNION ALL"`).toBe('(');
  const armBOpen = j;
  const armBClose = findMatchingParen(stmt, armBOpen);
  expect(armBClose, `${label}: arm B's opening "(" has no matching ")"`).toBeGreaterThan(armBOpen);
  const armB = stmt.slice(armBOpen + 1, armBClose);

  return { armA, armB };
}

// ---------------------------------------------------------------------------
// Quote-aware SQL VALUES(...) tuple parser. Handles the multi-line qual/
// with_check fields, which this migration writes as
// 'literal' || chr(10) || 'literal' || chr(10) || 'literal' concatenations
// (reproducing Postgres's own pretty-printed embedded newlines) -- a plain
// substring/regex match cannot evaluate these into their actual string
// value, which is required to compare qual/with_check exactly.
// ---------------------------------------------------------------------------

/** Evaluate a 'literal' / 'literal' || chr(10) || 'literal' expression into its actual string value. */
function evalSqlStringExpr(fieldText: string): string {
  const trimmed = fieldText.trim();
  if (trimmed === 'NULL') return 'NULL';
  const parts = trimmed.split('||').map((p) => p.trim());
  let out = '';
  for (const part of parts) {
    if (part === 'chr(10)') {
      out += '\n';
    } else if (part.startsWith("'") && part.endsWith("'") && part.length >= 2) {
      out += part.slice(1, -1).replace(/''/g, "'");
    } else {
      throw new Error(`migration-harden-recipe-catalog-client-writes.test.ts: unrecognized SQL string-expression fragment: ${JSON.stringify(part)}`);
    }
  }
  return out;
}

/** Split one VALUES row's inner text into its top-level comma-separated fields, respecting '' escaping inside quotes. */
function splitTopLevelSqlFields(row: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === "'") {
      if (inQuote && row[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
      continue;
    }
    if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

/** Parse every top-level (...)-delimited row inside a VALUES block into raw field-text arrays. */
function parseSqlValuesRows(block: string): string[][] {
  const rows: string[][] = [];
  let depth = 0;
  let inQuote = false;
  let cur = '';
  let capturing = false;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "'") {
      if (inQuote && block[i + 1] === "'") {
        cur += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
      if (capturing) cur += ch;
      continue;
    }
    if (!inQuote && ch === '(') {
      depth++;
      if (depth === 1) {
        capturing = true;
        cur = '';
        continue;
      }
    }
    if (!inQuote && ch === ')') {
      depth--;
      if (depth === 0 && capturing) {
        rows.push(splitTopLevelSqlFields(cur).map((f) => f.trim()));
        capturing = false;
        continue;
      }
    }
    if (capturing) cur += ch;
  }
  expect(rows.length, 'expected at least one VALUES row to be parsed').toBeGreaterThan(0);
  return rows;
}

function parsePolicyValuesRows(block: string): PolicyRow[] {
  return parseSqlValuesRows(block).map((fields) => {
    expect(fields.length, `expected a 7-field policy tuple, got ${fields.length}: ${JSON.stringify(fields)}`).toBe(7);
    const [tbl, polname, cmd, permissive, roles, qual, withcheck] = fields;
    return {
      table: evalSqlStringExpr(tbl),
      name: evalSqlStringExpr(polname),
      cmd: evalSqlStringExpr(cmd),
      permissive: evalSqlStringExpr(permissive),
      roles: evalSqlStringExpr(roles),
      qual: evalSqlStringExpr(qual),
      withcheck: evalSqlStringExpr(withcheck),
    };
  });
}

/** Extract the Nth (1-based) VALUES(...) row-set within `region`, ending at `endMarker`. */
function extractValuesRows(region: string, occurrence: number, endMarker: string): PolicyRow[] {
  let searchFrom = 0;
  let startOfValues = -1;
  for (let i = 0; i < occurrence; i++) {
    startOfValues = region.indexOf('VALUES', searchFrom);
    expect(startOfValues, `expected VALUES occurrence #${i + 1} in region`).toBeGreaterThan(-1);
    searchFrom = startOfValues + 'VALUES'.length;
  }
  const endIdx = region.indexOf(endMarker, startOfValues);
  expect(endIdx, `expected "${endMarker}" after VALUES occurrence #${occurrence}`).toBeGreaterThan(startOfValues);
  return parsePolicyValuesRows(region.slice(startOfValues + 'VALUES'.length, endIdx));
}

describe('migration: harden_recipe_catalog_client_write_boundary', () => {
  const { file, version, sql, executable } = loadMigration();
  const preflight = preflightBlockOf(executable);
  const postcheck = postcheckBlockOf(executable);
  const mutation = mutationBlockOf(executable);

  describe('filename, version and ordering', () => {
    it('is the only *_harden_recipe_catalog_client_write_boundary.sql migration', () => {
      expect(file.endsWith(SUFFIX)).toBe(true);
    });

    it('follows the CLI-generated 14-digit-timestamp filename pattern', () => {
      expect(file).toMatch(/^\d{14}_harden_recipe_catalog_client_write_boundary\.sql$/);
    });

    it('sorts strictly after every other currently active migration', () => {
      const all = activeMigrationFiles();
      const others = all.filter((f) => f !== file);
      expect(others.length).toBeGreaterThan(0);
      for (const other of others) {
        expect(file > other, `expected ${file} to sort after ${other}`).toBe(true);
      }
    });

    it('is the last (most recent) file in the active migrations directory', () => {
      const all = activeMigrationFiles();
      expect(all[all.length - 1]).toBe(file);
    });

    it('version is unique among all active migration files', () => {
      const all = activeMigrationFiles();
      const versions = all.map((f) => f.slice(0, 14));
      const count = versions.filter((v) => v === version).length;
      expect(count).toBe(1);
    });

    it('was not hand-authored with an invented/backdated version (CLI-native 14-digit form only, no non-digit characters before the suffix)', () => {
      const prefix = file.slice(0, file.length - SUFFIX.length);
      expect(prefix).toMatch(/^\d{14}$/);
    });
  });

  describe('ordering: preflight before mutation, postcheck after mutation, no write in either read-only block', () => {
    it('the preflight DO block appears before the DROP POLICY / REVOKE mutation', () => {
      const preflightIdx = executable.indexOf('DO $preflight$');
      const dropIdx = executable.indexOf('DO $drop_write_policies$');
      const revokeIdx = executable.indexOf('REVOKE INSERT');
      expect(preflightIdx).toBeGreaterThan(-1);
      expect(dropIdx).toBeGreaterThan(preflightIdx);
      expect(revokeIdx).toBeGreaterThan(preflightIdx);
    });

    it('the postcheck DO block appears after both the policy drops and the REVOKE', () => {
      const dropBlockEnd = executable.indexOf('$drop_write_policies$;') + '$drop_write_policies$;'.length;
      const revokeIdx = executable.indexOf('REVOKE INSERT');
      const postcheckIdx = executable.indexOf('DO $postcheck$');
      expect(dropBlockEnd).toBeGreaterThan(0);
      expect(postcheckIdx).toBeGreaterThan(dropBlockEnd);
      expect(postcheckIdx).toBeGreaterThan(revokeIdx);
    });

    it('the preflight block performs no write (no statement starts with CREATE/ALTER/GRANT/REVOKE/INSERT/UPDATE/DELETE/DROP)', () => {
      expect(preflight).not.toMatch(/^\s{0,4}(CREATE|ALTER|GRANT|REVOKE|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|DROP)\b/m);
    });

    it('the postcheck block performs no write', () => {
      expect(postcheck).not.toMatch(/^\s{0,4}(CREATE|ALTER|GRANT|REVOKE|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|DROP)\b/m);
    });
  });

  describe('accepts exactly vulnerable-or-hardened, rejects mixed/partial state', () => {
    it('the preflight acceptance gate is exactly "(vulnerable policy+ACL match) OR (hardened policy+ACL match)"', () => {
      expect(preflight).toMatch(
        /IF\s+NOT\s*\(\s*\(\s*policy_mismatch_vuln\s*=\s*0\s+AND\s+acl_mismatch_vuln\s*=\s*0\s*\)\s*OR\s*\(\s*policy_mismatch_hard\s*=\s*0\s+AND\s+acl_mismatch_hard\s*=\s*0\s*\)\s*\)/,
      );
    });

    it('the rejection gate is immediately followed by RAISE EXCEPTION (fail closed, not a silent normalize)', () => {
      const gateIdx = preflight.search(/IF\s+NOT\s*\(/);
      expect(gateIdx).toBeGreaterThan(-1);
      const after = preflight.slice(gateIdx, gateIdx + 400);
      expect(after).toMatch(/THEN[\s\S]*RAISE EXCEPTION/);
    });

    it('computes four independent mismatch counters (policy+ACL, for each of the two accepted states) rather than one combined counter', () => {
      for (const name of ['policy_mismatch_vuln', 'acl_mismatch_vuln', 'policy_mismatch_hard', 'acl_mismatch_hard']) {
        const declCount = (preflight.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
        expect(declCount, `expected ${name} to be declared and used`).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('exact eight-table scope', () => {
    it('the preflight target_tables array contains exactly the 8 authorized tables', () => {
      const arr = extractArrayLiteral(preflight, 'target_tables');
      expect(arr).toEqual(TARGET_TABLES);
    });

    it('the postcheck target_tables array contains exactly the 8 authorized tables', () => {
      const arr = extractArrayLiteral(postcheck, 'target_tables');
      expect(arr).toEqual(TARGET_TABLES);
    });

    it('the REVOKE statement names exactly the 8 authorized tables, no more, no fewer', () => {
      const revokeIdx = mutation.indexOf('REVOKE INSERT');
      expect(revokeIdx).toBeGreaterThan(-1);
      const stmtEnd = mutation.indexOf(';', revokeIdx);
      const stmt = mutation.slice(revokeIdx, stmtEnd);
      const tableMatches = [...stmt.matchAll(/public\.(\w+)/g)].map((m) => m[1]).sort();
      expect(tableMatches).toEqual(TARGET_TABLES);
    });

    it('does not create, alter, or reference any table outside the 8-table scope', () => {
      const forbidden = [
        'menu_plans',
        'menu_plan_items',
        'user_preferences',
        'profiles',
        'v_menu_plan_shopping_list',
        'vw_menu_plan_grocery_items',
      ];
      for (const name of forbidden) {
        expect(executable, `unexpected reference to ${name}`).not.toMatch(new RegExp(`\\b${name}\\b`));
      }
    });
  });

  describe('exact ACL row-identity comparison: multiplicity-sensitive symmetric EXCEPT ALL over (table, grantee, privilege_type, grantor, is_grantable)', () => {
    it('both preflight ACL comparisons (vulnerable and hardened) define the full 5-field expected/actual row identity', () => {
      const occurrences = (preflight.match(/expected\(tbl,\s*grantee,\s*privilege_type,\s*grantor,\s*is_grantable\)/g) ?? []).length;
      expect(occurrences).toBe(2);
      const actualOccurrences = (preflight.match(/actual\(tbl,\s*grantee,\s*privilege_type,\s*grantor,\s*is_grantable\)/g) ?? []).length;
      expect(actualOccurrences).toBe(2);
    });

    it('the postcheck ACL comparison defines the same full 5-field row identity exactly once', () => {
      expect((postcheck.match(/expected\(tbl,\s*grantee,\s*privilege_type,\s*grantor,\s*is_grantable\)/g) ?? []).length).toBe(1);
      expect((postcheck.match(/actual\(tbl,\s*grantee,\s*privilege_type,\s*grantor,\s*is_grantable\)/g) ?? []).length).toBe(1);
    });

    it('every ACL comparison uses EXCEPT ALL (multiplicity-sensitive), never bare EXCEPT/EXCEPT DISTINCT, and there are exactly 3 such comparisons', () => {
      const acl_related = executable.match(/expected[\s\S]{0,4000}?EXCEPT(\s+ALL)?\s+SELECT \* FROM actual/g) ?? [];
      expect(acl_related.length).toBe(3); // 2 in preflight (vuln, hard) + 1 in postcheck -- exact, not a lower bound
      for (const clause of acl_related) {
        expect(clause).toMatch(/EXCEPT ALL/);
      }
      expect(executable).not.toMatch(/EXCEPT\s+DISTINCT/);
      expect(executable).not.toMatch(/EXCEPT\s+SELECT/); // would only match a bare EXCEPT with no ALL
    });

    it('the ACL comparison is symmetric (both "expected EXCEPT ALL actual" and "actual EXCEPT ALL expected" appear, unioned)', () => {
      const occurrences = (executable.match(/SELECT \* FROM expected EXCEPT ALL SELECT \* FROM actual/g) ?? []).length;
      const reverseOccurrences = (executable.match(/SELECT \* FROM actual EXCEPT ALL SELECT \* FROM expected/g) ?? []).length;
      expect(occurrences).toBe(3);
      expect(reverseOccurrences).toBe(3);
    });

    it('PUBLIC-safe rendering (grantee=0/grantor=0 -> literal PUBLIC) guards every ::regrole cast, in all 3 `actual` CTEs', () => {
      const grantee = (executable.match(/CASE WHEN a\.grantee = 0 THEN 'PUBLIC' ELSE a\.grantee::regrole::text END/g) ?? []).length;
      const grantor = (executable.match(/CASE WHEN a\.grantor = 0 THEN 'PUBLIC' ELSE a\.grantor::regrole::text END/g) ?? []).length;
      expect(grantee).toBe(3);
      expect(grantor).toBe(3);
    });
  });

  // ---------------------------------------------------------------------
  // H-1 fix: exact policy content (table, name, command, permissive, roles,
  // qual, with_check), independently pinned against LIVE_VULNERABLE_POLICIES
  // / LIVE_HARDENED_POLICIES rather than merely extracted-and-echoed from
  // the migration file. Parses the actual VALUES(...) tuples via a
  // quote-aware tokenizer (not regex substring matching), so a changed
  // qual/with_check/roles/permissive value -- not just a changed name --
  // fails these tests.
  // ---------------------------------------------------------------------
  describe('exact policy contract (H-1): full 7-field identity pinned against independently-sourced live values', () => {
    it('sanity: LIVE_HARDENED_POLICIES is exactly LIVE_VULNERABLE_POLICIES minus the 7 REMOVED_WRITE_POLICIES, and both sets are internally consistent', () => {
      expect(LIVE_VULNERABLE_POLICIES.length).toBe(15);
      expect(LIVE_HARDENED_POLICIES.length).toBe(8);
      expect(sortPolicies(LIVE_HARDENED_POLICIES).map(policyKey)).toEqual(
        sortPolicies(SURVIVING_SELECT_POLICIES.map(([table, name]) => ({ table, name } as PolicyRow))).map(policyKey),
      );
      for (const p of LIVE_HARDENED_POLICIES) {
        expect(p.cmd, `${policyKey(p)} must be SELECT in the hardened set`).toBe('SELECT');
      }
    });

    it("preflight's vulnerable-state VALUES list (both symmetric-diff copies) exactly matches LIVE_VULNERABLE_POLICIES, full 7 fields", () => {
      const vulnStart = indexOfOrFail(preflight, 'SELECT count(*) INTO policy_mismatch_vuln FROM (', 'vulnerable policy comparison start');
      const vulnEnd = indexOfOrFail(preflight, 'SELECT count(*) INTO acl_mismatch_vuln FROM (', 'vulnerable ACL comparison start (region end)');
      expect(vulnEnd).toBeGreaterThan(vulnStart);
      const region = preflight.slice(vulnStart, vulnEnd);

      const copy1 = extractValuesRows(region, 1, ') AS expected(');
      const copy2 = extractValuesRows(region, 2, ') AS expected2(');
      expect(sortPolicies(copy1)).toEqual(sortPolicies(LIVE_VULNERABLE_POLICIES));
      expect(sortPolicies(copy2)).toEqual(sortPolicies(LIVE_VULNERABLE_POLICIES));
    });

    it("preflight's hardened-state VALUES list (both symmetric-diff copies) exactly matches LIVE_HARDENED_POLICIES, full 7 fields", () => {
      const hardStart = indexOfOrFail(preflight, 'SELECT count(*) INTO policy_mismatch_hard FROM (', 'hardened policy comparison start');
      const hardEnd = indexOfOrFail(preflight, 'SELECT count(*) INTO acl_mismatch_hard FROM (', 'hardened ACL comparison start (region end)');
      expect(hardEnd).toBeGreaterThan(hardStart);
      const region = preflight.slice(hardStart, hardEnd);

      const copy1 = extractValuesRows(region, 1, ') AS expected(');
      const copy2 = extractValuesRows(region, 2, ') AS expected2(');
      expect(sortPolicies(copy1)).toEqual(sortPolicies(LIVE_HARDENED_POLICIES));
      expect(sortPolicies(copy2)).toEqual(sortPolicies(LIVE_HARDENED_POLICIES));
    });

    it("postcheck's policy VALUES list (both symmetric-diff copies) exactly matches LIVE_HARDENED_POLICIES, full 7 fields", () => {
      // postcheck's policy comparison is the region from its own DO-block
      // start up to where the ACL CTE's 5-field header begins.
      const region = sliceBetweenMarkers(postcheck, 'SELECT count(*) INTO mismatch_count FROM (', 'expected(tbl, grantee,');
      const copy1 = extractValuesRows(region, 1, ') AS expected(');
      const copy2 = extractValuesRows(region, 2, ') AS expected2(');
      expect(sortPolicies(copy1)).toEqual(sortPolicies(LIVE_HARDENED_POLICIES));
      expect(sortPolicies(copy2)).toEqual(sortPolicies(LIVE_HARDENED_POLICIES));
    });

    for (const [tbl, name] of REMOVED_WRITE_POLICIES) {
      it(`removed policy "${name}" on ${tbl}: full live definition is asserted present in the vulnerable set and absent from the hardened set`, () => {
        const ground = LIVE_VULNERABLE_POLICIES.find((p) => p.table === tbl && p.name === name);
        expect(ground, `expected ground-truth entry for ${tbl}::${name}`).toBeDefined();
        expect(LIVE_HARDENED_POLICIES.some((p) => p.table === tbl && p.name === name)).toBe(false);
      });
    }

    for (const [tbl, name] of SURVIVING_SELECT_POLICIES) {
      it(`surviving SELECT policy "${name}" on ${tbl}: full live definition is asserted present in both the vulnerable and hardened sets`, () => {
        const inVuln = LIVE_VULNERABLE_POLICIES.find((p) => p.table === tbl && p.name === name);
        const inHard = LIVE_HARDENED_POLICIES.find((p) => p.table === tbl && p.name === name);
        expect(inVuln, `expected ${tbl}::${name} in vulnerable ground truth`).toBeDefined();
        expect(inHard, `expected ${tbl}::${name} in hardened ground truth`).toBeDefined();
        expect(inVuln).toEqual(inHard);
        expect(inVuln!.cmd).toBe('SELECT');
        expect(inVuln!.permissive).toBe('PERMISSIVE');
      });
    }
  });

  // ---------------------------------------------------------------------
  // H-2 fix: prove the state classification is GLOBAL (one combined
  // 8-table comparison per state), not performed independently per table.
  // These assertions are about the STRUCTURE of the real migration SQL
  // (statement counts, absence of loops, position ordering) -- not a
  // disconnected TypeScript reimplementation of the intended behavior.
  // ---------------------------------------------------------------------
  describe('global state classification (H-2): one combined 8-table comparison per state, no per-table branch', () => {
    it('each of the four mismatch counters is computed by exactly one SELECT ... INTO statement (not recomputed per table)', () => {
      for (const name of ['policy_mismatch_vuln', 'acl_mismatch_vuln', 'policy_mismatch_hard', 'acl_mismatch_hard']) {
        const intoCount = (preflight.match(new RegExp(`SELECT count\\(\\*\\) INTO ${name} FROM`, 'g')) ?? []).length;
        expect(intoCount, `expected exactly one "SELECT count(*) INTO ${name} FROM" statement`).toBe(1);
      }
    });

    // -----------------------------------------------------------------
    // Second-review correction: the previous version of this test only
    // required "at least one" `= ANY (target_tables)` occurrence per
    // computation. Both policy computations (policy_mismatch_vuln,
    // policy_mismatch_hard) structurally contain TWO independent catalog-
    // scan occurrences of `tablename = ANY (target_tables)` -- one per side
    // of the symmetric `EXCEPT ALL ... UNION ALL ... EXCEPT ALL` diff,
    // since (unlike the ACL comparisons) the live-policy read is written
    // out twice rather than factored into a shared CTE. A regression that
    // hardcodes only ONE of those two sides to a single literal table
    // (e.g. `tablename = 'recipes'`) previously passed every test in this
    // suite undetected, because "at least one" remained true. Fixed by
    // requiring the EXACT count structurally present at each site, so a
    // reduction in either direction (2->1, or 1->0) fails loudly.
    //
    // Each computation is extracted using a STABLE SQL statement boundary
    // -- "SELECT count(*) INTO <exact_variable_name> FROM (" through the
    // statement's own terminating ";" -- never a comment, an exception
    // string, a DECLARE entry, or a guess at where the next computation
    // happens to start. No qual/with_check string literal in this
    // migration contains a literal ";", so the first ";" after the start
    // marker is unambiguously this statement's own terminator (verified
    // below by an explicit sanity check on statement length/shape).
    // -----------------------------------------------------------------
    it('sanity: each of the four INTO-statement extractions is a real, substantial, well-formed statement (not a truncated/degenerate slice)', () => {
      for (const name of ['policy_mismatch_vuln', 'acl_mismatch_vuln', 'policy_mismatch_hard', 'acl_mismatch_hard']) {
        const stmt = extractIntoStatement(preflight, name);
        expect(stmt.length, `${name} statement looks too short to be real`).toBeGreaterThan(200);
        expect(stmt.startsWith(`SELECT count(*) INTO ${name} FROM (`)).toBe(true);
        expect(stmt.endsWith(';')).toBe(true);
        // Every one of the 4 statements is itself an aggregate over a
        // symmetric-diff subquery aliased "symmetric_diff" or "diff".
        expect(stmt).toMatch(/\)\s*AS\s*(symmetric_diff|diff);$/);
      }
    });

    // -----------------------------------------------------------------
    // Third-review correction: a combined whole-statement occurrence COUNT
    // of "exactly 2" is not sufficient. A regression can rewrite one
    // direction's real predicate to a semantically-identical but
    // differently-spelled single-table hardcode (e.g.
    // `tablename = ANY (ARRAY['recipes'])`, which the prior negative regex
    // for bare `tablename = '<literal>'` equality does not match) and then
    // pad the OTHER, untouched direction with a harmless, always-true
    // duplicate of the literal text `tablename = ANY (target_tables)`
    // (e.g. `AND (true OR tablename = ANY (target_tables))`) to keep the
    // total count at 2. That mutation was empirically confirmed to pass
    // all 102 prior tests.
    //
    // Fixed by evaluating each of the two EXCEPT ALL directions
    // INDEPENDENTLY: for each direction, locate its own single live
    // `pg_catalog.pg_policies` read, bound that read's WHERE clause
    // precisely (from `WHERE` to the next `EXCEPT ALL`, or end of
    // direction if none), and require that WHERE clause to be EXACTLY
    // (whitespace-normalized only) `schemaname='public' AND tablename =
    // ANY (target_tables)` -- nothing more, nothing less. An exact-string
    // match cannot be satisfied by `IN (...)`, `ANY (ARRAY[...])`, a
    // second `tablename` predicate, or any padding anywhere in that same
    // WHERE clause, because every one of those alternatives changes the
    // clause's text and therefore fails the equality check outright -- no
    // enumeration of "known bad" spellings is required, and nothing in
    // the OTHER direction's text can compensate, because each direction's
    // WHERE clause is extracted and asserted in complete isolation.
    // -----------------------------------------------------------------
    const REQUIRED_POLICY_WHERE_CLAUSE = "schemaname='public' AND tablename = ANY (target_tables)";

    function normalizeWhitespace(s: string): string {
      return s.replace(/\s+/g, ' ').trim();
    }

    /**
     * Split one policy mismatch-computation statement into its two
     * EXCEPT ALL / UNION ALL directions. Fails loudly if the statement
     * does not have exactly the expected topology (2x EXCEPT ALL, 1x
     * UNION ALL), so a structural change cannot silently turn this into a
     * no-op (e.g. by merging the two directions or adding a third).
     */
    function splitPolicyStatementDirections(stmt: string, label: string): { directionA: string; directionB: string } {
      const exceptAllCount = (stmt.match(/EXCEPT ALL/g) ?? []).length;
      const unionAllCount = (stmt.match(/UNION ALL/g) ?? []).length;
      expect(exceptAllCount, `expected exactly 2 "EXCEPT ALL" in ${label}`).toBe(2);
      expect(unionAllCount, `expected exactly 1 "UNION ALL" in ${label}`).toBe(1);
      // Each direction is independently parenthesized (the postgres
      // left-associativity fix this suite guards) -- extract via balanced,
      // quote-aware paren matching, never a naive string split on
      // "UNION ALL", so a stray grouping paren can never leak into either
      // direction's text (a naive split left arm A's text ending in a
      // trailing ")" once grouping parens were added, which broke its
      // WHERE-clause exact-match below).
      const { armA, armB } = extractTwoParenthesizedArms(stmt, label);
      expect(armA.length, `${label} direction A looks empty/degenerate`).toBeGreaterThan(50);
      expect(armB.length, `${label} direction B looks empty/degenerate`).toBeGreaterThan(50);
      return { directionA: armA, directionB: armB };
    }

    /**
     * Extract the exact WHERE clause bounding the single live
     * pg_catalog.pg_policies read inside one EXCEPT ALL direction. Fails
     * loudly if that FROM clause is missing, appears more than once, is
     * not immediately followed by a WHERE (proving the WHERE genuinely
     * belongs to this FROM, not some other clause), or cannot be bounded
     * (degenerate/empty).
     */
    function extractPolicyDirectionWhereClause(direction: string, label: string): string {
      const fromMarker = 'FROM pg_catalog.pg_policies';
      const fromOccurrences = (direction.match(new RegExp(fromMarker.replace('.', '\\.'), 'g')) ?? []).length;
      expect(fromOccurrences, `expected exactly one live pg_policies read in ${label}`).toBe(1);
      const fromIdx = direction.indexOf(fromMarker);
      const whereIdx = direction.indexOf('WHERE', fromIdx);
      expect(whereIdx, `expected a WHERE clause after the pg_policies read in ${label}`).toBeGreaterThan(fromIdx);
      const between = direction.slice(fromIdx + fromMarker.length, whereIdx);
      expect(
        normalizeWhitespace(between),
        `unexpected tokens between the pg_policies FROM clause and its WHERE in ${label}: ${JSON.stringify(between)}`,
      ).toBe('');
      const exceptIdx = direction.indexOf('EXCEPT ALL', whereIdx);
      const whereEnd = exceptIdx === -1 ? direction.length : exceptIdx;
      const whereClause = direction.slice(whereIdx + 'WHERE'.length, whereEnd).trim();
      expect(whereClause.length, `${label} WHERE clause looks empty/degenerate`).toBeGreaterThan(10);
      return whereClause;
    }

    function assertDirectionWhereClauseIsExactlyRequired(direction: string, computationLabel: string, directionLabel: string) {
      const label = `${computationLabel} ${directionLabel}`;
      const whereClause = extractPolicyDirectionWhereClause(direction, label);
      expect(
        normalizeWhitespace(whereClause),
        `${label}'s WHERE clause must be EXACTLY "${REQUIRED_POLICY_WHERE_CLAUSE}" -- no alternative table restriction (=, IN, ANY(ARRAY[...]), a different array, an extra predicate, or padding) is acceptable`,
      ).toBe(REQUIRED_POLICY_WHERE_CLAUSE);
      const tablenameRefs = (whereClause.match(/\btablename\b/g) ?? []).length;
      expect(tablenameRefs, `${label} must reference "tablename" exactly once in its WHERE clause (a second reference, even a harmless/always-true one, is rejected)`).toBe(1);
    }

    it('policy_mismatch_vuln: EACH of its two EXCEPT ALL directions independently binds its live-policy WHERE clause to exactly the required global-scope predicate', () => {
      const stmt = extractIntoStatement(preflight, 'policy_mismatch_vuln');
      const { directionA, directionB } = splitPolicyStatementDirections(stmt, 'policy_mismatch_vuln');
      assertDirectionWhereClauseIsExactlyRequired(directionA, 'policy_mismatch_vuln', 'direction A (expected EXCEPT ALL actual)');
      assertDirectionWhereClauseIsExactlyRequired(directionB, 'policy_mismatch_vuln', 'direction B (actual EXCEPT ALL expected2)');
    });

    it('policy_mismatch_hard: EACH of its two EXCEPT ALL directions independently binds its live-policy WHERE clause to exactly the required global-scope predicate', () => {
      const stmt = extractIntoStatement(preflight, 'policy_mismatch_hard');
      const { directionA, directionB } = splitPolicyStatementDirections(stmt, 'policy_mismatch_hard');
      assertDirectionWhereClauseIsExactlyRequired(directionA, 'policy_mismatch_hard', 'direction A (expected EXCEPT ALL actual)');
      assertDirectionWhereClauseIsExactlyRequired(directionB, 'policy_mismatch_hard', 'direction B (actual EXCEPT ALL expected2)');
    });

    it('policy_mismatch_vuln/policy_mismatch_hard: the whole-statement occurrence count (kept as defense-in-depth, not as the sole proof) is still exactly 2', () => {
      // Retained alongside the direction-bound exact-match checks above --
      // no longer relied upon alone, since a whole-statement count can be
      // satisfied by a compensating mutation (see the correction note
      // above). Kept as an additional, cheap sanity signal.
      for (const name of ['policy_mismatch_vuln', 'policy_mismatch_hard']) {
        const stmt = extractIntoStatement(preflight, name);
        const count = (stmt.match(/tablename\s*=\s*ANY\s*\(target_tables\)/g) ?? []).length;
        expect(count, `expected exactly 2 occurrences in ${name}`).toBe(2);
      }
    });

    it('acl_mismatch_vuln scopes both its expected-side and actual-side generation to ALL 8 tables -- exactly 1 unnest(target_tables) and exactly 1 c.relname = ANY (target_tables), matching its single-CTE (non-UNION-ALL) shape', () => {
      const stmt = extractIntoStatement(preflight, 'acl_mismatch_vuln');
      const unnestCount = (stmt.match(/unnest\(target_tables\)/g) ?? []).length;
      const relnameAnyCount = (stmt.match(/c\.relname\s*=\s*ANY\s*\(target_tables\)/g) ?? []).length;
      expect(unnestCount, 'expected exactly 1 unnest(target_tables) in the uniform 4-role expected cross join').toBe(1);
      expect(relnameAnyCount, 'expected exactly 1 c.relname = ANY (target_tables) in the single `actual` CTE').toBe(1);
      expect(stmt).not.toMatch(/c\.relname\s*=\s*'[a-z_]+'/);
    });

    it('acl_mismatch_hard scopes both its expected-side and actual-side generation to ALL 8 tables -- exactly 2 unnest(target_tables) (one per role-group UNION ALL branch) and exactly 1 c.relname = ANY (target_tables) (single `actual` CTE)', () => {
      const stmt = extractIntoStatement(preflight, 'acl_mismatch_hard');
      const unnestCount = (stmt.match(/unnest\(target_tables\)/g) ?? []).length;
      const relnameAnyCount = (stmt.match(/c\.relname\s*=\s*ANY\s*\(target_tables\)/g) ?? []).length;
      expect(unnestCount, 'expected exactly 2 unnest(target_tables) (postgres/service_role branch + anon/authenticated branch)').toBe(2);
      expect(relnameAnyCount, 'expected exactly 1 c.relname = ANY (target_tables) in the single `actual` CTE').toBe(1);
      expect(stmt).not.toMatch(/c\.relname\s*=\s*'[a-z_]+'/);
    });

    it('none of the four statements contains a single-table equality anywhere, of any spelling, as a substitute for the array-membership test', () => {
      for (const name of ['policy_mismatch_vuln', 'acl_mismatch_vuln', 'policy_mismatch_hard', 'acl_mismatch_hard']) {
        const stmt = extractIntoStatement(preflight, name);
        expect(stmt, `${name} must not use a single-table equality (e.g. "tablename = tname")`).not.toMatch(/tablename\s*=\s*tname\b/);
        for (const forbidden of [...TARGET_TABLES]) {
          expect(stmt, `${name} must not hardcode a bare equality against '${forbidden}'`).not.toMatch(
            new RegExp(`(?:tablename|c\\.relname)\\s*=\\s*'${forbidden}'(?!\\s*::)`),
          );
        }
      }
    });

    it('preflight contains NO loop of any kind (no FOREACH, no per-table LOOP) -- classification is single-shot, not iterated per table', () => {
      expect(preflight).not.toMatch(/\bFOREACH\b/);
      expect(preflight).not.toMatch(/\bLOOP\b/);
    });

    it('preflight never declares or references a per-table loop variable ("tname") -- that pattern exists only in postcheck\'s effective-privilege checks', () => {
      expect(preflight).not.toMatch(/\btname\b/);
    });

    it('all four mismatch counters are computed strictly before the single acceptance gate that reads them', () => {
      const lastComputation = Math.max(
        indexOfOrFail(preflight, 'SELECT count(*) INTO policy_mismatch_vuln FROM (', 'policy_mismatch_vuln computation'),
        indexOfOrFail(preflight, 'SELECT count(*) INTO acl_mismatch_vuln FROM (', 'acl_mismatch_vuln computation'),
        indexOfOrFail(preflight, 'SELECT count(*) INTO policy_mismatch_hard FROM (', 'policy_mismatch_hard computation'),
        indexOfOrFail(preflight, 'SELECT count(*) INTO acl_mismatch_hard FROM (', 'acl_mismatch_hard computation'),
      );
      const gateIdx = indexOfOrFail(preflight, 'IF NOT (', 'the acceptance gate');
      expect(gateIdx).toBeGreaterThan(lastComputation);
    });

    it('the acceptance gate appears exactly once in preflight, with exactly one top-level OR (exactly two branches, no third/hybrid branch)', () => {
      const gateMatches = [...preflight.matchAll(/IF\s+NOT\s*\([\s\S]{0,400}?\)\s*THEN/g)];
      expect(gateMatches.length).toBe(1);
      const gateText = gateMatches[0][0];
      const orCount = (gateText.match(/\bOR\b/g) ?? []).length;
      expect(orCount, `expected exactly one top-level OR in the gate, got: ${gateText}`).toBe(1);
      const andCount = (gateText.match(/\bAND\b/g) ?? []).length;
      expect(andCount, 'expected exactly two ANDs (one per branch)').toBe(2);
    });

    it('no independent per-table accept/reject is structurally possible: the gate is the ONLY conditional in preflight guarding the transition from read-only to mutation, and it is not inside any loop', () => {
      // Re-derive the exact gate span and confirm no LOOP/FOREACH token
      // encloses it (i.e., it is not nested inside a per-table iteration).
      const gateIdx = indexOfOrFail(preflight, 'IF NOT (', 'the acceptance gate');
      const beforeGate = preflight.slice(0, gateIdx);
      const openLoops = (beforeGate.match(/\bLOOP\b/g) ?? []).length;
      const closedLoops = (beforeGate.match(/\bEND LOOP\b/g) ?? []).length;
      expect(openLoops, 'no LOOP should have opened before the gate').toBe(0);
      expect(closedLoops).toBe(0);
    });

    it('the first mutation statement (policy drop or REVOKE) occurs only after the single global gate has closed', () => {
      const gateIdx = indexOfOrFail(preflight, 'IF NOT (', 'the acceptance gate');
      const preflightEnd = executable.indexOf('$preflight$;');
      expect(preflightEnd).toBeGreaterThan(gateIdx);
      const firstMutationIdx = Math.min(
        indexOfOrFail(executable, 'DO $drop_write_policies$', 'first mutation statement (policy drop block)'),
        indexOfOrFail(executable, 'REVOKE INSERT', 'first mutation statement (REVOKE)'),
      );
      expect(firstMutationIdx).toBeGreaterThan(preflightEnd);
    });
  });

  // ---------------------------------------------------------------------
  // Step 4 fix: verified-owner grantor, not a hardcoded literal.
  // ---------------------------------------------------------------------
  describe('verified-owner expected grantor (resolves the hardcoded-literal finding)', () => {
    it('preflight declares distinct_owner_count and verified_owner', () => {
      expect(preflight).toMatch(/distinct_owner_count\s+int;/);
      expect(preflight).toMatch(/verified_owner\s+text;/);
    });

    it('preflight verifies all 8 owners are identical (exactly 1 distinct value) before ever reading verified_owner', () => {
      const distinctCheckIdx = indexOfOrFail(preflight, 'distinct_owner_count <> 1', 'the distinct-owner-count guard');
      const intoVerifiedIdx = indexOfOrFail(preflight, 'INTO verified_owner', 'the verified_owner assignment');
      expect(intoVerifiedIdx).toBeGreaterThan(distinctCheckIdx);
      const after = preflight.slice(distinctCheckIdx, distinctCheckIdx + 200);
      expect(after).toMatch(/THEN[\s\S]*RAISE EXCEPTION/);
    });

    it('preflight verifies the shared owner is exactly postgres, immediately after assigning verified_owner, and before any ACL comparison', () => {
      const intoVerifiedIdx = indexOfOrFail(preflight, 'INTO verified_owner', 'the verified_owner assignment');
      const checkIdx = indexOfOrFail(preflight, "verified_owner IS DISTINCT FROM 'postgres'", 'the verified_owner=postgres guard');
      expect(checkIdx).toBeGreaterThan(intoVerifiedIdx);
      const after = preflight.slice(checkIdx, checkIdx + 200);
      expect(after).toMatch(/THEN[\s\S]*RAISE EXCEPTION/);

      const firstAclComputation = indexOfOrFail(preflight, 'SELECT count(*) INTO acl_mismatch_vuln FROM (', 'first ACL comparison');
      expect(firstAclComputation).toBeGreaterThan(checkIdx);
    });

    it('all 3 preflight ACL expected-CTEs use the verified_owner variable as the grantor value (2 in vulnerable+hardened branches combined as counted)', () => {
      const asOwnerVuln = (preflight.match(/SELECT t, r, p, verified_owner, false/g) ?? []).length;
      const asOwnerHardFull = (preflight.match(/\(SELECT t, r, p, verified_owner, false/g) ?? []).length;
      const asOwnerHardSelect = (preflight.match(/\(SELECT t, r, 'SELECT', verified_owner, false/g) ?? []).length;
      // vuln branch: 1 occurrence; hard branch: 1 full + 1 select-only = 2.
      expect(asOwnerVuln).toBeGreaterThanOrEqual(1);
      expect(asOwnerHardFull).toBe(1);
      expect(asOwnerHardSelect).toBe(1);
    });

    it('postcheck independently re-declares distinct_owner_count/verified_owner and re-verifies the owner contract (not reused across DO blocks -- Postgres DO blocks cannot share variables)', () => {
      expect(postcheck).toMatch(/distinct_owner_count\s+int;/);
      expect(postcheck).toMatch(/verified_owner\s+text;/);
      const distinctCheckIdx = indexOfOrFail(postcheck, 'distinct_owner_count <> 1', 'postcheck distinct-owner-count guard');
      const intoVerifiedIdx = indexOfOrFail(postcheck, 'INTO verified_owner', 'postcheck verified_owner assignment');
      const eqPostgresIdx = indexOfOrFail(postcheck, "verified_owner IS DISTINCT FROM 'postgres'", 'postcheck verified_owner=postgres guard');
      expect(intoVerifiedIdx).toBeGreaterThan(distinctCheckIdx);
      expect(eqPostgresIdx).toBeGreaterThan(intoVerifiedIdx);
    });

    it('postcheck\'s ACL expected-CTE uses verified_owner as the grantor value, not a literal', () => {
      const full = (postcheck.match(/\(SELECT t, r, p, verified_owner, false/g) ?? []).length;
      const selectOnly = (postcheck.match(/\(SELECT t, r, 'SELECT', verified_owner, false/g) ?? []).length;
      expect(full).toBe(1);
      expect(selectOnly).toBe(1);
    });

    it('no ACL expected-CTE anywhere hardcodes the literal \'postgres\' as a grantor value (the old vulnerable pattern is fully gone)', () => {
      expect(executable).not.toMatch(/SELECT t, r, p, 'postgres', false/);
      expect(executable).not.toMatch(/SELECT t, r, 'SELECT', 'postgres', false/);
    });

    it('the literal \'postgres\' that remains is confined to the owner-verification guard and diagnostic/role-enumeration contexts, never an expected-ACL-row value', () => {
      const literalPostgresLines = executable
        .split('\n')
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => line.includes("'postgres'"));
      for (const { line } of literalPostgresLines) {
        const isVerificationGuard = /verified_owner\s+IS\s+DISTINCT\s+FROM\s+'postgres'/.test(line);
        const isRoleArrayLiteral = /ARRAY\[[^\]]*'postgres'[^\]]*\]/.test(line);
        expect(
          isVerificationGuard || isRoleArrayLiteral,
          `unexpected bare 'postgres' literal outside owner-verification/role-array context: ${line}`,
        ).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------
  // Step 5 fix: exactly two accepted global states, no hybrid acceptance.
  // ---------------------------------------------------------------------
  describe('exactly two accepted global states (H-3 contract decision), no hybrid/third-state acceptance', () => {
    it('exactly four "_mismatch_" identifiers exist (vuln+hard for policy, vuln+hard for ACL) -- no third/hybrid variant', () => {
      const declLine = preflight.slice(0, preflight.indexOf('BEGIN'));
      const names = new Set([...declLine.matchAll(/\b((?:policy|acl)_mismatch_\w+)\s+int;/g)].map((m) => m[1]));
      expect([...names].sort()).toEqual(['acl_mismatch_hard', 'acl_mismatch_vuln', 'policy_mismatch_hard', 'policy_mismatch_vuln']);
    });

    it('the migration header documents the binding fresh-replay contract decision: hybrid states are intentionally rejected, and a future Slice 1 correction must emit the exact hardened final state', () => {
      expect(sql).toMatch(/HYBRID/);
      expect(sql).toMatch(/deliberately does NOT accept/i);
      expect(sql).toMatch(/Slice 1 is corrected/);
      expect(sql).toMatch(/must emit the identical HARDENED_FINAL_STATE/);
    });

    it('the contract-decision prose is confined to comments (not an executable third branch)', () => {
      expect(executable).not.toMatch(/HYBRID/);
      // The only acceptance gate remains the two-branch OR proven above --
      // re-asserted here for locality with the "no hybrid" claim.
      expect((preflight.match(/IF\s+NOT\s*\(/g) ?? []).length).toBe(1);
    });
  });

  describe('exact policy expression/role/command/permissiveness comparison: legacy shape/name checks (superseded in coverage by the H-1 full-tuple tests above, kept for redundancy)', () => {
    it('the vulnerable-state policy comparison in preflight lists exactly 15 policies', () => {
      const firstValuesBlock = preflight.slice(
        preflight.indexOf("VALUES\n      ('equipment','read equipment'"),
        preflight.indexOf('AS expected(tbl, polname, cmd, permissive, roles, qual, withcheck)'),
      );
      const names = [...firstValuesBlock.matchAll(/\('(\w+)','([^']+(?:''[^']*)*)',/g)].map((m) => m[2]);
      expect(names.length).toBe(15);
    });

    for (const [tbl, name] of SURVIVING_SELECT_POLICIES) {
      it(`hardened-state VALUES list includes surviving policy "${name}" on ${tbl} as SELECT`, () => {
        const re = new RegExp(`\\('${tbl}','${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}','SELECT'`);
        expect(preflight).toMatch(re);
      });
    }

    it('the postcheck policy comparison never lists any of the 7 removed policies', () => {
      for (const [tbl, name] of REMOVED_WRITE_POLICIES) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(postcheck).not.toMatch(new RegExp(`\\('${tbl}','${escapedName}'`));
      }
    });
  });

  describe('mutation: only the 7 write policies are dropped, exactly', () => {
    it('drops exactly 7 policies, one guarded EXECUTE per policy', () => {
      const drops = [...mutation.matchAll(/EXECUTE \$sql\$\s*DROP POLICY "([^"]+)" ON public\.(\w+)\s*\$sql\$/g)];
      expect(drops.length).toBe(7);
      const dropped = drops.map((m) => `${m[2]}::${m[1]}`).sort();
      const expectedDropped = REMOVED_WRITE_POLICIES.map(([t, n]) => `${t}::${n}`).sort();
      expect(dropped).toEqual(expectedDropped);
    });

    it('every DROP POLICY is guarded by a pg_policies existence check (count of guards equals count of drops)', () => {
      const guards = (mutation.match(/IF EXISTS \(SELECT 1 FROM pg_catalog\.pg_policies WHERE schemaname='public'/g) ?? []).length;
      expect(guards).toBe(7);
    });

    it('never drops any of the 8 surviving SELECT policies', () => {
      for (const [, name] of SURVIVING_SELECT_POLICIES) {
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        expect(mutation).not.toMatch(new RegExp(`DROP POLICY "${escapedName}"`));
      }
    });

    it('every DROP POLICY EXECUTE body is a static $sql$ literal with no format()/concatenation', () => {
      const executeCalls = [...mutation.matchAll(/EXECUTE\s+([^;]*?);/gs)];
      expect(executeCalls.length).toBe(7);
      for (const call of executeCalls) {
        expect(call[1]).toMatch(/^\$sql\$/);
        expect(call[1]).not.toMatch(/format\(/i);
        expect(call[1]).not.toMatch(/\|\|/);
      }
    });
  });

  describe('mutation: only the authorized REVOKE, exact privilege/role set, never SELECT, never GRANT', () => {
    it('the REVOKE statement revokes exactly the 7 non-SELECT privileges, no more, no fewer', () => {
      const revokeIdx = mutation.indexOf('REVOKE');
      const fromIdx = mutation.indexOf('FROM anon, authenticated', revokeIdx);
      const privClause = mutation.slice(revokeIdx + 'REVOKE'.length, mutation.indexOf('ON TABLE', revokeIdx));
      const privs = privClause
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      expect(privs).toEqual(REVOKED_PRIVILEGES);
      expect(fromIdx).toBeGreaterThan(revokeIdx);
    });

    it('the REVOKE statement never mentions SELECT as a revoked privilege', () => {
      const revokeIdx = mutation.indexOf('REVOKE');
      const onTableIdx = mutation.indexOf('ON TABLE', revokeIdx);
      const privClause = mutation.slice(revokeIdx, onTableIdx);
      expect(privClause).not.toMatch(/\bSELECT\b/);
    });

    it('the REVOKE statement\'s FROM clause is exactly "anon, authenticated" -- never service_role, postgres, or PUBLIC', () => {
      const revokeIdx = mutation.indexOf('REVOKE');
      const stmtEnd = mutation.indexOf(';', revokeIdx);
      const stmt = mutation.slice(revokeIdx, stmtEnd);
      const fromMatch = stmt.match(/FROM\s+([\s\S]+)$/);
      expect(fromMatch).not.toBeNull();
      const roles = fromMatch![1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      expect(roles).toEqual(['anon', 'authenticated']);
    });

    it('exactly one REVOKE statement exists in the entire file', () => {
      const count = (executable.match(/^REVOKE\b/gm) ?? []).length;
      expect(count).toBe(1);
    });

    it('never issues GRANT anywhere in the file', () => {
      expect(executable).not.toMatch(/^\s*GRANT\b/m);
    });

    it('never issues ALTER DEFAULT PRIVILEGES', () => {
      expect(executable).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
    });

    it('never mentions service_role, postgres, or PUBLIC as a grantee/target anywhere in an executable statement', () => {
      // Scoped to the mutation block only -- the preflight/postcheck read-only
      // comparisons legitimately reference these role names as expected data.
      expect(mutation).not.toMatch(/\bservice_role\b/);
      expect(mutation).not.toMatch(/\bpostgres\b/);
      expect(mutation).not.toMatch(/\bPUBLIC\b/);
    });
  });

  describe('no row DML, no schema/constraint/index/comment/view/function mutation', () => {
    it('contains no SELECT/INSERT/UPDATE/DELETE against application table rows', () => {
      expect(mutation).not.toMatch(/\bINSERT INTO (ingredients|units|equipment|recipes|recipe_)/i);
      expect(mutation).not.toMatch(/\bUPDATE (ingredients|units|equipment|recipes|recipe_)\w*\s+SET\b/i);
      expect(mutation).not.toMatch(/\bDELETE FROM (ingredients|units|equipment|recipes|recipe_)/i);
    });

    it('never uses CREATE TABLE, ALTER TABLE, CREATE INDEX, COMMENT ON, CREATE VIEW, CREATE FUNCTION, or DROP TABLE', () => {
      for (const kw of ['CREATE TABLE', 'ALTER TABLE', 'CREATE INDEX', 'COMMENT ON', 'CREATE VIEW', 'CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 'DROP TABLE']) {
        expect(executable, `unexpected ${kw}`).not.toMatch(new RegExp(kw));
      }
    });

    it('never uses CASCADE anywhere', () => {
      expect(executable).not.toMatch(/CASCADE/i);
    });

    it('never uses DROP outside of DROP POLICY', () => {
      const dropMatches = [...executable.matchAll(/\bDROP\s+(\w+)/gi)];
      expect(dropMatches.length).toBeGreaterThan(0);
      for (const m of dropMatches) {
        expect(m[1].toUpperCase()).toBe('POLICY');
      }
    });
  });

  describe('no interpolated dynamic SQL anywhere in the file', () => {
    it('every EXECUTE body is a $sql$ ... $sql$ static literal, never format()/concatenation of a catalog or variable value', () => {
      const executeCalls = [...executable.matchAll(/EXECUTE\s+([^;]*?);/gs)];
      expect(executeCalls.length).toBeGreaterThan(0);
      for (const call of executeCalls) {
        expect(call[1]).toMatch(/^\$sql\$/);
        expect(call[1]).not.toMatch(/format\(/i);
        expect(call[1]).not.toMatch(/\|\|/);
      }
    });
  });

  describe('postcheck: exact hardened final state, effective-privilege polarity, RLS/owner unchanged', () => {
    it('postcheck asserts zero non-SELECT policies remain among the 8 target tables', () => {
      expect(postcheck).toMatch(/tablename\s*=\s*ANY\s*\(target_tables\)\s+AND\s+cmd\s*<>\s*'SELECT'/);
    });

    it('postcheck asserts RLS state unchanged (enabled, not forced) generically across the 8 tables', () => {
      expect(postcheck).toMatch(/\(c\.relrowsecurity,\s*c\.relforcerowsecurity\)\s*IS\s*DISTINCT\s*FROM\s*\(true,\s*false\)/);
    });

    it('postcheck independently re-verifies the shared owner is exactly postgres (via verified_owner, not a bare per-row literal check)', () => {
      expect(postcheck).toMatch(/verified_owner IS DISTINCT FROM 'postgres'/);
    });

    it('postcheck asserts zero column ACL across the 8 tables', () => {
      expect(postcheck).toMatch(/a\.attacl IS NOT NULL/);
    });

    it('postcheck iterates every table x {anon, authenticated} and requires SELECT=true, all 7 write/DDL privileges=false', () => {
      expect(postcheck).toMatch(/FOREACH\s+rname\s+IN\s+ARRAY\s+ARRAY\['anon','authenticated'\]/);
      const clientLoopStart = postcheck.indexOf("FOREACH rname IN ARRAY ARRAY['anon','authenticated']");
      const clientLoopEnd = postcheck.indexOf('END LOOP;', clientLoopStart);
      const clientLoop = postcheck.slice(clientLoopStart, clientLoopEnd);
      expect(clientLoop).toMatch(/NOT pg_catalog\.has_table_privilege\(rname, 'public\.' \|\| tname, 'SELECT'\)/);
      for (const priv of REVOKED_PRIVILEGES) {
        expect(clientLoop).toMatch(new RegExp(`has_table_privilege\\(rname, 'public\\.' \\|\\| tname, '${priv}'\\)`));
      }
    });

    it('postcheck iterates every table x {service_role, postgres} and requires all 8 privileges=true', () => {
      expect(postcheck).toMatch(/FOREACH\s+rname\s+IN\s+ARRAY\s+ARRAY\['service_role','postgres'\]/);
      const adminLoopStart = postcheck.indexOf("FOREACH rname IN ARRAY ARRAY['service_role','postgres']");
      const adminLoopEnd = postcheck.indexOf('END LOOP;', adminLoopStart);
      const adminLoop = postcheck.slice(adminLoopStart, adminLoopEnd);
      for (const priv of [...REVOKED_PRIVILEGES, 'SELECT']) {
        expect(adminLoop).toMatch(new RegExp(`has_table_privilege\\(rname, 'public\\.' \\|\\| tname, '${priv}'\\)`));
      }
    });

    it('postcheck loops FOREACH over all 8 target_tables, not a fixed subset', () => {
      expect(postcheck).toMatch(/FOREACH\s+tname\s+IN\s+ARRAY\s+target_tables\s+LOOP/);
    });
  });

  describe('static application write-path compatibility evidence (documented in this migration, not re-derived here)', () => {
    it('the migration header documents that all legitimate recipe writes go through the service_role-only admin RPCs', () => {
      expect(sql).toMatch(/admin_create_recipe_atomic/);
      expect(sql).toMatch(/admin_update_recipe_atomic/);
      expect(sql).toMatch(/admin_delete_recipe_atomic/);
      expect(sql).toMatch(/service_role only/);
    });

    it('the migration header documents the independent live-confirmation source, not just a static claim', () => {
      expect(sql).toMatch(/LIVE CONFIRMATION PASS/);
      expect(sql).toMatch(/independent read-only\s*\n?-- catalog inspection|independent read-only[\s\S]{0,80}catalog inspection/);
    });

    it('the migration header explicitly excludes track-view.js as a separate, un-fixed follow-up risk', () => {
      expect(sql).toMatch(/track-view\.js/);
      expect(sql).toMatch(/increment_recipe_times_shown/);
    });

    it('track-view.js itself is never referenced as an executable target (only in header prose)', () => {
      expect(executable).not.toMatch(/CREATE OR REPLACE FUNCTION public\.increment_recipe_times_shown/);
    });
  });

  // ---------------------------------------------------------------------
  // Associativity correction pass: PostgreSQL set operators (EXCEPT ALL,
  // UNION ALL) are left-associative with no implicit precedence between
  // them, so an unparenthesized
  //   A EXCEPT ALL B UNION ALL C EXCEPT ALL D
  // parses as ((A EXCEPT ALL B) UNION ALL C) EXCEPT ALL D -- NOT the
  // intended symmetric-diff union of two independent EXCEPT ALL results.
  // Each of the 3 POLICY symmetric-diff comparisons in this migration
  // (policy_mismatch_vuln, policy_mismatch_hard, and postcheck's policy
  // mismatch_count) must therefore wrap each EXCEPT ALL direction in its
  // own parentheses before UNION ALL-ing them together. These tests parse
  // the real SQL text via balanced, quote-aware paren matching (never a
  // naive UNION-ALL string split, never a comment or RAISE EXCEPTION
  // message, never a whole-file paren/EXCEPT-ALL/UNION-ALL token tally)
  // and bind every assertion to its own mismatch variable or postcheck
  // statement.
  // ---------------------------------------------------------------------
  describe('policy symmetric-diff grouping (associativity correction pass): exactly two independently-parenthesized EXCEPT ALL arms per comparison', () => {
    // Reuses the same `preflight`/`postcheck`/`executable` computed once at
    // the top of the outer describe (this migration's loaded SQL), not a
    // fresh reload -- one source of truth for the file under test.
    type PolicyComparisonRef = { label: string; getStmt: () => string };

    const POLICY_COMPARISONS: PolicyComparisonRef[] = [
      { label: 'policy_mismatch_vuln (preflight)', getStmt: () => extractIntoStatement(preflight, 'policy_mismatch_vuln') },
      { label: 'policy_mismatch_hard (preflight)', getStmt: () => extractIntoStatement(preflight, 'policy_mismatch_hard') },
      { label: 'mismatch_count policy comparison (postcheck)', getStmt: () => extractIntoStatement(postcheck, 'mismatch_count') },
    ];

    it('sanity: there are exactly 3 policy comparisons under test, and the postcheck one is genuinely the POLICY comparison, not the ACL one', () => {
      expect(POLICY_COMPARISONS.length).toBe(3);
      const postcheckPolicyStmt = POLICY_COMPARISONS[2].getStmt();
      expect(postcheckPolicyStmt).toMatch(/AS expected\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/);
      expect(postcheckPolicyStmt).not.toMatch(/grantee, privilege_type/);
    });

    for (const { label, getStmt } of POLICY_COMPARISONS) {
      describe(label, () => {
        it('has exactly two independently, fully parenthesized arms joined by exactly one top-level UNION ALL', () => {
          const stmt = getStmt();
          // extractTwoParenthesizedArms itself fails (via expect) unless the
          // grouping is exactly "(A EXCEPT ALL B) UNION ALL (C EXCEPT ALL
          // D)" -- a missing/misplaced paren on either arm, or any stray
          // token between the arms, fails this assertion directly.
          const { armA, armB } = extractTwoParenthesizedArms(stmt, label);
          expect(armA.length).toBeGreaterThan(50);
          expect(armB.length).toBeGreaterThan(50);
        });

        it('each arm contains exactly one EXCEPT ALL (no arm merges both directions, neither arm is a comparison-free stub)', () => {
          const { armA, armB } = extractTwoParenthesizedArms(getStmt(), label);
          expect((armA.match(/EXCEPT ALL/g) ?? []).length, `${label} arm A`).toBe(1);
          expect((armB.match(/EXCEPT ALL/g) ?? []).length, `${label} arm B`).toBe(1);
        });

        it('the left arm is "expected EXCEPT ALL actual" and the right arm is "actual EXCEPT ALL expected2" -- never both directions in one arm, never swapped', () => {
          const { armA, armB } = extractTwoParenthesizedArms(getStmt(), label);

          expect(armA, `${label} arm A must contain the VALUES-sourced "expected" side`).toMatch(
            /AS expected\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/,
          );
          expect(armA, `${label} arm A must not also contain the "expected2" side`).not.toMatch(/AS expected2\(/);
          expect(armA, `${label} arm A must read the live catalog as its "actual" side`).toMatch(/FROM pg_catalog\.pg_policies/);

          expect(armB, `${label} arm B must contain the VALUES-sourced "expected2" side`).toMatch(
            /AS expected2\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/,
          );
          expect(armB, `${label} arm B must not also contain the "expected" side`).not.toMatch(
            /AS expected\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/,
          );
          expect(armB, `${label} arm B must read the live catalog as its "actual" side`).toMatch(/FROM pg_catalog\.pg_policies/);

          // Direction, not just presence: in arm A, "expected" (the VALUES
          // list) must be EXCEPT ALL's LEFT side and the catalog read its
          // RIGHT side; in arm B, the catalog read ("actual") must be the
          // LEFT side and "expected2" the RIGHT side.
          const armAValuesIdx = armA.indexOf('AS expected(tbl,');
          const armAExceptIdx = armA.indexOf('EXCEPT ALL');
          const armACatalogIdx = armA.indexOf('FROM pg_catalog.pg_policies');
          expect(armAValuesIdx, `${label} arm A missing "expected" VALUES header`).toBeGreaterThan(-1);
          expect(armAExceptIdx, `${label} arm A: EXCEPT ALL must come after the "expected" VALUES header`).toBeGreaterThan(armAValuesIdx);
          expect(armACatalogIdx, `${label} arm A: the live-catalog read must come after EXCEPT ALL`).toBeGreaterThan(armAExceptIdx);

          const armBCatalogIdx = armB.indexOf('FROM pg_catalog.pg_policies');
          const armBExceptIdx = armB.indexOf('EXCEPT ALL');
          const armBValuesIdx = armB.indexOf('AS expected2(tbl,');
          expect(armBCatalogIdx, `${label} arm B missing the live-catalog read`).toBeGreaterThan(-1);
          expect(armBExceptIdx, `${label} arm B: EXCEPT ALL must come after the live-catalog read`).toBeGreaterThan(armBCatalogIdx);
          expect(armBValuesIdx, `${label} arm B: "expected2" VALUES header must come after EXCEPT ALL`).toBeGreaterThan(armBExceptIdx);
        });
      });
    }

    it('global invariant: exactly 3 policy symmetric-diff comparisons exist in the whole migration, and every one of them satisfies the grouping shape above', () => {
      const expectedHeaderCount = (executable.match(/AS expected\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/g) ?? []).length;
      const expected2HeaderCount = (executable.match(/AS expected2\(tbl, polname, cmd, permissive, roles, qual, withcheck\)/g) ?? []).length;
      expect(expectedHeaderCount, 'expected exactly 3 policy "expected(...)" VALUES headers in the whole file').toBe(3);
      expect(expected2HeaderCount, 'expected exactly 3 policy "expected2(...)" VALUES headers in the whole file').toBe(3);

      for (const { label, getStmt } of POLICY_COMPARISONS) {
        const { armA, armB } = extractTwoParenthesizedArms(getStmt(), `${label} (global invariant pass)`);
        expect((armA.match(/EXCEPT ALL/g) ?? []).length, `${label} arm A`).toBe(1);
        expect((armB.match(/EXCEPT ALL/g) ?? []).length, `${label} arm B`).toBe(1);
      }
    });

    it('the 3 ACL symmetric-diff comparisons (untouched by this correction pass -- they were already correctly grouped) still wrap each EXCEPT ALL direction in its own parentheses', () => {
      const aclGroupingPattern =
        /\(\s*SELECT \* FROM expected\s+EXCEPT ALL\s+SELECT \* FROM actual\s*\)\s*UNION ALL\s*\(\s*SELECT \* FROM actual\s+EXCEPT ALL\s+SELECT \* FROM expected\s*\)/g;
      const matches = executable.match(aclGroupingPattern) ?? [];
      expect(matches.length, 'expected exactly 3 already-correctly-grouped ACL symmetric-diff comparisons (acl_mismatch_vuln, acl_mismatch_hard, postcheck)').toBe(3);
    });
  });
});
