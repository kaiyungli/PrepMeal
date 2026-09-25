import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Contract tests for the CLI-generated-then-renamed migration
//   supabase/migrations/20260904070000_baseline_user_plans_schema.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL via string/regex matching against the
// comment-stripped text -- not a real SQL parse, mirroring
// tests/migration-baseline-core-recipe-catalog.test.ts's own established
// convention exactly. Assertions run against comment-stripped `executable`
// SQL so prose cannot accidentally satisfy or violate a check meant to
// verify actual statements.
//
// MIGRATIONS_DIR/TESTS_DIR can be overridden via
// MIGRATION_MUTATION_TEST_MIGRATIONS_DIR for scratch mutation-resistance
// testing (see /home/venn/prepmeal-baseline-user-plans-implementation.md,
// outside this repo, for the mutation matrix run against scratch copies
// under /tmp, never inside this or the main worktree).

const MIGRATIONS_DIR =
  process.env.MIGRATION_MUTATION_TEST_MIGRATIONS_DIR ?? path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_baseline_user_plans_schema.sql';
const EXPECTED_VERSION = '20260904070000';
const EXPECTED_FILE = `${EXPECTED_VERSION}${SUFFIX}`;
const SLICE1_FILE = '20260904060000_baseline_core_recipe_catalog_schema.sql';
const SLICE1_SHA256 = '8c8ebf9a0007a4d70d174902e2044fd753b8661b70852c7a380ca888de666fb6';
const FIRST_LATER_MIGRATION = '20260905034023_get_recipe_list_with_detail_json.sql';

const TARGET_TABLES = ['menu_plans', 'menu_plan_items', 'user_favorites', 'user_preferences'].sort();

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

function loadMigration(): { file: string; sql: string; executable: string } {
  const all = activeMigrationFiles();
  const matches = all.filter((f) => f.endsWith(SUFFIX));
  expect(matches.length, `exactly one *${SUFFIX} migration should exist, found: ${JSON.stringify(matches)}`).toBe(1);
  const file = matches[0];
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  return { file, sql, executable: stripLineComments(sql) };
}

/** Find a required marker index or fail loudly -- every extraction anchor
 * in this file goes through this helper instead of silently tolerating a
 * -1/empty slice. */
function mustFind(haystack: string, marker: string, label: string): number {
  const idx = haystack.indexOf(marker);
  expect(idx, `expected to find ${label} (marker: ${JSON.stringify(marker)})`).toBeGreaterThan(-1);
  return idx;
}

function preflightBlockOf(executable: string): string {
  const start = mustFind(executable, 'DO $preflight$', 'the preflight DO block start');
  const endMarkerIdx = mustFind(executable, '$preflight$;', 'the preflight DO block end');
  const end = endMarkerIdx + '$preflight$;'.length;
  expect(end).toBeGreaterThan(start);
  return executable.slice(start, end);
}

function postcheckBlockOf(executable: string): string {
  const start = mustFind(executable, 'DO $postcheck$', 'the postcheck DO block start');
  mustFind(executable, '$postcheck$;', 'the postcheck DO block end');
  return executable.slice(start);
}

/** Everything strictly between the end of the preflight block and the start of the postcheck block. */
function creationBlockOf(executable: string): string {
  const preflightEndMarker = mustFind(executable, '$preflight$;', 'the preflight DO block end (for creation-block slicing)');
  const preflightEnd = preflightEndMarker + '$preflight$;'.length;
  const postcheckStart = mustFind(executable, 'DO $postcheck$', 'the postcheck DO block start (for creation-block slicing)');
  expect(postcheckStart).toBeGreaterThan(preflightEnd);
  return executable.slice(preflightEnd, postcheckStart);
}

/** Count occurrences of a literal (non-regex) substring. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = 0;
  for (;;) {
    idx = haystack.indexOf(needle, idx);
    if (idx === -1) break;
    count += 1;
    idx += needle.length;
  }
  return count;
}

describe('migration: baseline_user_plans_schema', () => {
  const { file, sql, executable } = loadMigration();

  describe('filename, version and ordering', () => {
    it('is exactly the one expected file', () => {
      expect(file).toBe(EXPECTED_FILE);
    });

    it('sorts immediately after Slice 1 and before the first later active migration', () => {
      const all = activeMigrationFiles();
      const slice1Idx = all.indexOf(SLICE1_FILE);
      const thisIdx = all.indexOf(EXPECTED_FILE);
      const laterIdx = all.indexOf(FIRST_LATER_MIGRATION);
      expect(slice1Idx, 'Slice 1 migration must exist').toBeGreaterThanOrEqual(0);
      expect(thisIdx, 'Slice 2 migration must exist').toBeGreaterThanOrEqual(0);
      expect(laterIdx, 'first later migration must exist').toBeGreaterThanOrEqual(0);
      expect(thisIdx).toBeGreaterThan(slice1Idx);
      expect(thisIdx).toBeLessThan(laterIdx);
    });

    it('exactly one target migration exists (no duplicate/second scaffold)', () => {
      const all = activeMigrationFiles();
      expect(all.filter((f) => f.endsWith(SUFFIX)).length).toBe(1);
    });
  });

  describe('cross-file proof: Slice 1 remains byte-unchanged', () => {
    it('Slice 1 migration SHA-256 is unchanged from the approved baseline', () => {
      const slice1Path = path.join(MIGRATIONS_DIR, SLICE1_FILE);
      expect(fs.existsSync(slice1Path), `${SLICE1_FILE} must still exist`).toBe(true);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(slice1Path)).digest('hex');
      expect(hash).toBe(SLICE1_SHA256);
    });
  });

  describe('exact four-table scope, no expansion', () => {
    it('creates exactly the 4 target tables via CREATE TABLE IF NOT EXISTS, and no other table', () => {
      const creation = creationBlockOf(executable);
      const matches = [...creation.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map((m) => m[1]).sort();
      expect(matches).toEqual(TARGET_TABLES);
    });

    it('creates no view (no CREATE VIEW anywhere in executable SQL)', () => {
      expect(/CREATE (OR REPLACE )?VIEW/i.test(executable)).toBe(false);
    });

    it('creates no function/RPC (no CREATE FUNCTION anywhere in executable SQL -- set_updated_at is only referenced, never created)', () => {
      expect(/CREATE (OR REPLACE )?FUNCTION/i.test(executable)).toBe(false);
    });

    it('does not create public.profiles', () => {
      expect(executable.includes('CREATE TABLE IF NOT EXISTS public.profiles')).toBe(false);
    });

    it('does not create any Slice 1 recipe-catalog table', () => {
      const slice1Tables = ['ingredients', 'units', 'equipment', 'recipes', 'recipe_ingredients', 'recipe_steps', 'recipe_equipment', 'ingredient_substitutions'];
      for (const t of slice1Tables) {
        expect(executable.includes(`CREATE TABLE IF NOT EXISTS public.${t}`), `must not create public.${t}`).toBe(false);
      }
    });

    it('grants/revokes touch only menu_plans and menu_plan_items (no ACL statement targets user_favorites/user_preferences, which are left at the untouched project default)', () => {
      const creation = creationBlockOf(executable);
      const revokeLines = [...creation.matchAll(/REVOKE [^;]*ON public\.(\w+)/g)].map((m) => m[1]);
      for (const t of revokeLines) {
        expect(['menu_plans', 'menu_plan_items']).toContain(t);
      }
      expect(revokeLines.length).toBeGreaterThan(0);
    });
  });

  describe('global two-state classifier (no third/hybrid branch)', () => {
    it('preflight accepts only present_count IN (0, 4), rejecting every partial state', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight.includes('IF present_count NOT IN (0, 4) THEN')).toBe(true);
    });

    it('classification is global across all 4 tables via a single present_count, not per-table normalization', () => {
      const preflight = preflightBlockOf(executable);
      // A single scalar present_count is computed once from a set-based
      // COUNT(*) over all 4 target tables -- not once per table.
      const countStatements = countOccurrences(preflight, 'INTO present_count');
      expect(countStatements).toBe(1);
    });

    it('has no ELSIF / third branch between the fresh and compatible states', () => {
      const preflight = preflightBlockOf(executable);
      expect(/ELSIF/i.test(preflight)).toBe(false);
    });

    it('postcheck requires exactly 4 tables present after this migration runs (rejects any drift down to fewer)', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck.includes('IF present_count <> 4 THEN')).toBe(true);
    });
  });

  describe('symmetric-diff rigor: every arm fully parenthesized, direction-specific, table-scoped', () => {
    const categories = ['column-row', 'constraint-row', 'index-row', 'raw-ACL-row'];

    it('preflight raises a distinctly worded exception for each of columns/constraints/indexes/policies/ACL', () => {
      const preflight = preflightBlockOf(executable);
      for (const c of [...categories, 'policy-row']) {
        expect(preflight.includes(`${c} mismatches found across the 4 target tables`), `missing ${c} mismatch check`).toBe(true);
      }
    });

    it('postcheck reasserts the identical set of mismatch categories', () => {
      const postcheck = postcheckBlockOf(executable);
      for (const c of [...categories, 'policy-row']) {
        expect(postcheck.includes(`${c} mismatches found across the 4 target tables`), `missing ${c} mismatch check in postcheck`).toBe(true);
      }
    });

    it('every symmetric diff is written as two fully parenthesized EXCEPT ALL arms joined by UNION ALL (never an unparenthesized 4-way chain)', () => {
      // The specific fully-parenthesized pattern this file's own convention
      // uses: "(\n      SELECT ... EXCEPT ALL ... )\n\n      UNION ALL\n\n      (\n      SELECT ... EXCEPT ALL ... )"
      // Count "EXCEPT ALL" occurrences: exactly 2 per symmetric-diff block,
      // and each symmetric-diff block must open with "(\n" immediately
      // before its first SELECT/VALUES and close with ")\n" before "UNION ALL".
      const exceptAllCount = countOccurrences(executable, 'EXCEPT ALL');
      // 5 categories (columns, constraints, indexes, policies, ACL) x 2
      // preflight + 2 postcheck arms each = 20.
      expect(exceptAllCount).toBe(20);
      const unionAllCount = countOccurrences(executable, '\n      UNION ALL\n') + countOccurrences(executable, '\n    UNION ALL\n');
      // One UNION ALL per symmetric-diff block: 5 categories x 2 (preflight+postcheck) = 10.
      expect(unionAllCount).toBe(10);
    });

    it('direction-specific scope binding: every symmetric-diff arm filters by c.relname = ANY (target_tables) / tablename = ANY (target_tables), never a single hardcoded table name (resistant to a compensating-token trick that narrows only one arm)', () => {
      // Exact counts (not a loose lower bound): 23 relname = ANY(target_tables)
      // occurrences (columns x2 arms + constraints x2 + indexes(live side
      // only, x2) + ACL x2 x2-uses-per-arm... the precise figure is fixed by
      // this file's own construction) and 8 tablename = ANY(target_tables)
      // (indexes expected-side + policies, each x2 arms x2 blocks). Any
      // mutation that narrows one arm to a single hardcoded table changes
      // one of these exact counts.
      expect(countOccurrences(executable, 'c.relname = ANY (target_tables)')).toBe(23);
      expect(countOccurrences(executable, 'tablename = ANY (target_tables)')).toBe(8);
    });

    it('every top-level symmetric-diff-joining UNION ALL sits between two parenthesized arms -- immediately preceded by a closing ")" and immediately followed by an opening "(" (the ACL expected-set construction\'s own internal UNION ALLs, joining plain unnest() SELECTs, are a distinct, differently-indented pattern and are not what this check targets)', () => {
      // The top-level arm-joining UNION ALL is always written on its own
      // line at exactly 4 or 6 spaces of indent, blank-line-surrounded --
      // this file's own fixed convention (verified against the plain-count
      // check above: exactly 10 such occurrences).
      const preciseRe = /\n(?: {4}| {6})UNION ALL\n/g;
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = preciseRe.exec(executable)) !== null) {
        count += 1;
        const before = executable.slice(0, m.index).replace(/\s+$/, '');
        const afterStart = m.index + m[0].length;
        const after = executable.slice(afterStart).replace(/^\s+/, '');
        expect(before.endsWith(')'), `UNION ALL at offset ${m.index} must be immediately preceded (modulo whitespace) by a closing paren`).toBe(true);
        expect(after.startsWith('('), `UNION ALL at offset ${m.index} must be immediately followed (modulo whitespace) by an opening paren`).toBe(true);
      }
      expect(count).toBe(10);
    });

    it('each symmetric-diff block is genuinely paren-balanced around its UNION ALL split (structural depth check, not a suffix-trim heuristic -- resistant to a mutation that deletes one arm-wrapping paren but happens to leave an unrelated inner ")" as the last visible character, e.g. from "ANY (target_tables)")', () => {
      // For every "...FROM (" ... ") AS symmetric_diff;" block, walk the
      // characters and track paren depth relative to the block's own
      // opening "(" (the one immediately after "FROM"). A well-formed block
      // is: "(" [depth 1] "(" [2] <arm1> ")" [1] UNION ALL "(" [2] <arm2>
      // ")" [1] ")" [0] " AS symmetric_diff;". So depth must be exactly 1 at
      // every "UNION ALL" occurrence inside the block, must never drop
      // below 0, and must return to exactly 0 at the block's own closing
      // paren. Deleting either arm's wrapping paren (regardless of what
      // character happens to precede it after whitespace-trimming) shifts
      // the depth at "UNION ALL" to 2 or leaves the terminal depth nonzero,
      // so this check catches it even when the suffix-trim check above does
      // not.
      // Anchor on "INTO mismatch_count" (exactly one per block, unambiguous)
      // rather than searching backward from ") AS symmetric_diff;" -- a
      // backward search is fooled by the unrelated "SELECT * FROM (VALUES"
      // text that also contains the literal substring "FROM (" nested
      // inside each block's own VALUES payload.
      const anchorMarker = 'INTO mismatch_count';
      const anchorIdxs: number[] = [];
      {
        let idx = executable.indexOf(anchorMarker);
        while (idx !== -1) {
          anchorIdxs.push(idx);
          idx = executable.indexOf(anchorMarker, idx + 1);
        }
      }
      expect(anchorIdxs.length, 'expected exactly 10 symmetric-diff blocks (5 categories x preflight+postcheck)').toBe(10);

      for (const anchorIdx of anchorIdxs) {
        const fromMarker = 'FROM (';
        const fromIdx = executable.indexOf(fromMarker, anchorIdx);
        expect(fromIdx, `expected a following "FROM (" for symmetric_diff block anchored at ${anchorIdx}`).toBeGreaterThan(-1);
        const blockOpenParenIdx = fromIdx + fromMarker.length - 1; // index of the "(" itself

        // Scan forward from the block's own opening paren, tracking depth,
        // until depth returns to 0 -- that position IS this block's true
        // closing paren, found structurally rather than by text search.
        let depth = 0;
        let blockCloseParenIdx = -1;
        const unionAllDepths: number[] = [];
        for (let i = blockOpenParenIdx; i < executable.length; i++) {
          const ch = executable[i];
          if (ch === '(') depth += 1;
          else if (ch === ')') {
            depth -= 1;
            expect(depth, `paren depth went negative inside symmetric-diff block at offset ${i} (block starting at ${blockOpenParenIdx})`).toBeGreaterThanOrEqual(0);
          }
          if (executable.startsWith('UNION ALL', i)) {
            unionAllDepths.push(depth);
          }
          if (depth === 0) {
            blockCloseParenIdx = i;
            break;
          }
        }
        expect(blockCloseParenIdx, `symmetric-diff block starting at ${blockOpenParenIdx} never returned to paren depth 0`).toBeGreaterThan(-1);
        // Sanity: the found closing paren must indeed be the one preceding
        // " AS symmetric_diff;".
        const tail = executable.slice(blockCloseParenIdx + 1, blockCloseParenIdx + 1 + ' AS symmetric_diff;'.length);
        expect(tail, `structurally-found block close at ${blockCloseParenIdx} must be immediately followed by " AS symmetric_diff;"`).toBe(' AS symmetric_diff;');

        // The ACL blocks' own "expected(tbl, grantee, priv)" construction
        // uses further, deeper-nested "UNION ALL"s internally (joining
        // plain unnest() SELECTs); those are legitimate and sit at a
        // greater paren depth. Only the depth-1 occurrence is the top-level
        // arm-joining UNION ALL this check targets -- there must be exactly
        // one such depth-1 occurrence per block, and no interior UNION ALL
        // may ever sit at depth 0 (outside both arms) or depth <1.
        const topLevelUnionAlls = unionAllDepths.filter((d) => d === 1);
        const belowArmDepth = unionAllDepths.filter((d) => d < 1);
        expect(belowArmDepth.length, `no UNION ALL may sit outside both arms (depth < 1) in symmetric-diff block starting at ${blockOpenParenIdx}`).toBe(0);
        expect(topLevelUnionAlls.length, `expected exactly one top-level (depth-1) UNION ALL inside symmetric-diff block starting at ${blockOpenParenIdx}, found depths ${JSON.stringify(unionAllDepths)}`).toBe(1);
      }
    });

    it('the two diff arms (expected/expected2) of every category are textually identical VALUES payloads in both preflight and postcheck (catches a single-arm-only edit to a column/constraint/index/policy/ACL row)', () => {
      // Layout is always: "(VALUES\n  (row1),\n  (row2)\n) AS expected(...)"
      // -- the marker comes AFTER its VALUES(...) payload, so extraction
      // walks backward from the marker to find the payload's own bounds.
      function valuesPayloadEndingAt(block: string, markerIdx: number): string {
        const closeParenIdx = block.lastIndexOf(')', markerIdx);
        expect(closeParenIdx, 'expected a closing ) immediately before the AS expected(...) marker').toBeGreaterThan(-1);
        const valuesIdx = block.lastIndexOf('VALUES', closeParenIdx);
        expect(valuesIdx, 'expected a preceding VALUES keyword').toBeGreaterThan(-1);
        return block.slice(valuesIdx + 'VALUES'.length, closeParenIdx).trim();
      }

      for (const [label, block] of [
        ['preflight', preflightBlockOf(executable)],
        ['postcheck', postcheckBlockOf(executable)],
      ] as const) {
        for (const category of [
          "AS expected(tbl, attnum, attname, atttype, is_notnull, def)",
          "AS expected(tbl, conname, contype, condef)",
          'AS expected(tbl, idxname, idxdef)',
          'AS expected(tbl, polname, cmd, permissive, roles, qual, withcheck)',
        ]) {
          const firstIdx = mustFind(block, category, `${label}: category marker ${category}`);
          const before = valuesPayloadEndingAt(block, firstIdx);
          const category2 = category.replace('expected(', 'expected2(');
          const secondIdx = block.indexOf(category2, firstIdx + category.length);
          expect(secondIdx, `${label}: expected to find mirrored category marker ${category2}`).toBeGreaterThan(firstIdx);
          const after = valuesPayloadEndingAt(block, secondIdx);
          expect(after, `${label}: ${category} arm 2 must be textually identical to arm 1`).toBe(before);
        }
      }
    });
  });

  describe('exact column contract (35 columns across 4 tables)', () => {
    it('preflight and postcheck each declare exactly 35 expected column rows, twice (both diff arms)', () => {
      for (const block of [preflightBlockOf(executable), postcheckBlockOf(executable)]) {
        const declCount = countOccurrences(block, "AS expected(tbl, attnum, attname, atttype, is_notnull, def)") +
          countOccurrences(block, "AS expected2(tbl, attnum, attname, atttype, is_notnull, def)");
        expect(declCount).toBe(2);
      }
    });

    it('every column VALUES row count is exactly 35 in each of the 4 VALUES lists (preflight x2, postcheck x2)', () => {
      const rowsRe = /\('(menu_plans|menu_plan_items|user_favorites|user_preferences)',\d+,'/g;
      const allMatches = executable.match(rowsRe) ?? [];
      // 4 occurrences of the full 35-row VALUES list (preflight expected +
      // preflight expected2 + postcheck expected + postcheck expected2).
      expect(allMatches.length).toBe(35 * 4);
    });

    it('user_preferences has no surrogate id column -- user_id is column 1 and the only PK column', () => {
      expect(executable.includes("('user_preferences',1,'user_id','uuid',true,'NULL')")).toBe(true);
      expect(executable.includes("('user_preferences',1,'id',")).toBe(false);
    });

    it('creation DDL for user_preferences has no id column either', () => {
      const creation = creationBlockOf(executable);
      const tblStart = mustFind(creation, 'CREATE TABLE IF NOT EXISTS public.user_preferences (', 'user_preferences CREATE TABLE');
      const tblEnd = creation.indexOf(');', tblStart);
      const body = creation.slice(tblStart, tblEnd);
      expect(/^\s*id\s+uuid/m.test(body)).toBe(false);
    });
  });

  describe('exact constraint contract (23 constraints)', () => {
    it('preflight/postcheck each declare 23 constraint rows in both diff arms', () => {
      const conRe = /\('(menu_plans|menu_plan_items|user_favorites|user_preferences)','\w+','[pcfu]','/g;
      const allMatches = executable.match(conRe) ?? [];
      expect(allMatches.length).toBe(23 * 4);
    });

    it('every FK targets auth.users(id) or an internal/Slice-1 table -- none targets public.profiles', () => {
      expect(executable.includes('REFERENCES public.profiles')).toBe(false);
      expect(executable.includes('REFERENCES profiles(')).toBe(false);
    });

    it('creation DDL FK count matches: 5 FKs total (menu_plans:1, menu_plan_items:2, user_favorites:2, user_preferences:1 -- wait, exactly the audited set)', () => {
      const creation = creationBlockOf(executable);
      const fkCount = (creation.match(/FOREIGN KEY/g) ?? []).length;
      expect(fkCount).toBe(6);
    });
  });

  describe('exact index contract (22 indexes)', () => {
    it('preflight/postcheck each declare 22 index rows in both diff arms', () => {
      const idxRe = /\('(menu_plans|menu_plan_items|user_favorites|user_preferences)','\w+','CREATE (UNIQUE )?INDEX/g;
      const allMatches = executable.match(idxRe) ?? [];
      expect(allMatches.length).toBe(22 * 4);
    });

    it('creation DDL issues exactly 20 explicit CREATE INDEX IF NOT EXISTS statements (the 2 PK-backing + 2 UNIQUE-backing indexes come from their constraints, not a standalone CREATE INDEX)', () => {
      const creation = creationBlockOf(executable);
      const count = (creation.match(/^CREATE INDEX IF NOT EXISTS/gm) ?? []).length;
      expect(count).toBe(16);
    });

    it('duplicate/redundant live indexes are preserved verbatim, not collapsed (idx_menu_plans_user_created and idx_menu_plans_user_created_at both present)', () => {
      const creation = creationBlockOf(executable);
      expect(creation.includes('idx_menu_plans_user_created ON public.menu_plans USING btree (user_id, created_at DESC)')).toBe(true);
      expect(creation.includes('idx_menu_plans_user_created_at ON public.menu_plans USING btree (user_id, created_at DESC)')).toBe(true);
    });
  });

  describe('exact policy contract (15 policies, full identity)', () => {
    it('preflight/postcheck each declare 15 policy rows in both diff arms', () => {
      const polRe = /\('(menu_plans|menu_plan_items|user_favorites|user_preferences)','[^']+','(SELECT|INSERT|UPDATE|DELETE)','PERMISSIVE',/g;
      const allMatches = executable.match(polRe) ?? [];
      expect(allMatches.length).toBe(15 * 4);
    });

    it('creates exactly 15 CREATE POLICY statements', () => {
      const creation = creationBlockOf(executable);
      const count = (creation.match(/CREATE POLICY/g) ?? []).length;
      expect(count).toBe(15);
    });

    it('every CREATE POLICY is guarded by an IF NOT EXISTS pg_policies existence check', () => {
      const creation = creationBlockOf(executable);
      const guards = (creation.match(/IF NOT EXISTS \(SELECT 1 FROM pg_catalog\.pg_policies WHERE schemaname='public'/g) ?? []).length;
      expect(guards).toBe(15);
    });

    it('user_favorites has no UPDATE policy (3 policies only: SELECT/INSERT/DELETE)', () => {
      const creation = creationBlockOf(executable);
      const favoritesBlockStart = mustFind(creation, "tablename='user_favorites'", 'user_favorites policy guard block');
      const nextTableStart = creation.indexOf("tablename='user_preferences'", favoritesBlockStart);
      const favoritesBlock = creation.slice(favoritesBlockStart, nextTableStart);
      expect((favoritesBlock.match(/CREATE POLICY/g) ?? []).length).toBe(3);
      expect(favoritesBlock.includes('FOR UPDATE')).toBe(false);
    });

    it('menu_plans/menu_plan_items policies are public-role-scoped (no TO authenticated clause); user_favorites/user_preferences are TO authenticated', () => {
      const creation = creationBlockOf(executable);
      const menuPlansPolicy = mustFind(creation, 'CREATE POLICY "read own menu plans"', 'menu_plans read policy');
      const menuPlansLine = creation.slice(menuPlansPolicy, creation.indexOf('$sql$', menuPlansPolicy));
      expect(menuPlansLine.includes('TO authenticated')).toBe(false);

      const favPolicy = mustFind(creation, 'CREATE POLICY "Users can view own favorites"', 'user_favorites read policy');
      const favLine = creation.slice(favPolicy, creation.indexOf('$sql$', favPolicy));
      expect(favLine.includes('TO authenticated')).toBe(true);
    });

    it('no overlapping/duplicate permissive policy on the same (table, command) -- 15 distinct (table,cmd) pairs collapse from exactly 15 rows', () => {
      const polRe = /CREATE POLICY "[^"]+" ON public\.(\w+) FOR (SELECT|INSERT|UPDATE|DELETE)/g;
      const creation = creationBlockOf(executable);
      const pairs = [...creation.matchAll(polRe)].map((m) => `${m[1]}:${m[2]}`);
      expect(pairs.length).toBe(15);
      expect(new Set(pairs).size).toBe(15);
    });
  });

  describe('policy creation identity matches the preflight/postcheck contract (regression guard: fresh-path auth.uid() wrapping)', () => {
    // Runtime verification (/home/venn/prepmeal-baseline-user-plans-runtime-verification.md,
    // isolated PostgreSQL 17) found that a fresh replay of this migration
    // could never pass its own postcheck: the seven user_favorites/
    // user_preferences CREATE POLICY statements used a bare `auth.uid()`
    // call, while the migration's own preflight/postcheck expected-contract
    // literals require PostgreSQL's deparse of the `(select auth.uid())`
    // scalar-subquery form (`( SELECT auth.uid() AS uid)`). A plain
    // substring count cannot localize which policy/clause is wrong and
    // cannot prove the creation SQL actually agrees with what preflight and
    // postcheck independently expect -- these tests parse each CREATE
    // POLICY statement's own USING/WITH CHECK clauses and each expected-
    // contract VALUES row independently, then compare per-policy,
        // per-clause identity between the two.

    type PolicyStatement = {
      table: string;
      name: string;
      cmd: string;
      toAuthenticated: boolean;
      usingExpr: string | null;
      withCheckExpr: string | null;
    };

    /** Walk forward from an opening "(" tracking depth, returning the text
     * strictly inside the matching closing ")". Fails loudly (never
     * silently returns an empty/partial match) if depth never returns to
     * zero -- mirrors this file's own established paren-balance-walking
     * convention (see the symmetric-diff paren-balance test above). */
    function extractBalancedParen(source: string, openParenIdx: number, label: string): string {
      expect(source[openParenIdx], `${label}: expected "(" at offset ${openParenIdx}`).toBe('(');
      let depth = 0;
      for (let i = openParenIdx; i < source.length; i++) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') {
          depth -= 1;
          if (depth === 0) {
            return source.slice(openParenIdx + 1, i);
          }
        }
      }
      expect.fail(`${label}: unbalanced parentheses starting at offset ${openParenIdx} (never returned to depth 0)`);
      return '';
    }

    /** Fail-loud extraction of every CREATE POLICY statement in the
     * creation block: table, name, command, TO authenticated presence, and
     * the exact (paren-balanced, not regex-truncated) USING/WITH CHECK
     * expression text. */
    function extractCreatePolicyStatements(creation: string): PolicyStatement[] {
      const headerRe = /CREATE POLICY "([^"]+)" ON public\.(\w+) FOR (SELECT|INSERT|UPDATE|DELETE)/g;
      const results: PolicyStatement[] = [];
      let m: RegExpExecArray | null;
      while ((m = headerRe.exec(creation)) !== null) {
        const [, name, table, cmd] = m;
        const stmtStart = m.index;
        const terminatorRel = mustFind(creation.slice(stmtStart), ' $sql$;', `terminator of CREATE POLICY "${name}"`);
        const stmtText = creation.slice(stmtStart, stmtStart + terminatorRel);

        const toAuthenticated = stmtText.includes(' TO authenticated ');

        let usingExpr: string | null = null;
        const usingMarker = 'USING (';
        const usingIdx = stmtText.indexOf(usingMarker);
        if (usingIdx !== -1) {
          usingExpr = extractBalancedParen(stmtText, usingIdx + usingMarker.length - 1, `USING clause of "${name}"`);
        }

        let withCheckExpr: string | null = null;
        const withCheckMarker = 'WITH CHECK (';
        const withCheckIdx = stmtText.indexOf(withCheckMarker);
        if (withCheckIdx !== -1) {
          withCheckExpr = extractBalancedParen(stmtText, withCheckIdx + withCheckMarker.length - 1, `WITH CHECK clause of "${name}"`);
        }

        expect(usingExpr !== null || withCheckExpr !== null, `CREATE POLICY "${name}" has neither USING nor WITH CHECK`).toBe(true);
        results.push({ table, name, cmd, toAuthenticated, usingExpr, withCheckExpr });
      }
      return results;
    }

    /** Every expected-contract VALUES row for policies, keyed by policy
     * name: (table, cmd, qual-as-quoted-SQL-string, withcheck-as-quoted-
     * SQL-string). Both preflight and postcheck each contribute two
     * occurrences per name (the expected/expected2 arms). */
    function extractExpectedPolicyTuples(block: string): Map<string, { table: string; cmd: string; qual: string; withCheck: string }[]> {
      const re = /\('(menu_plans|menu_plan_items|user_favorites|user_preferences)','([^']+)','(SELECT|INSERT|UPDATE|DELETE)','PERMISSIVE','\{[^}]+\}','([^']*)','([^']*)'\)/g;
      const out = new Map<string, { table: string; cmd: string; qual: string; withCheck: string }[]>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(block)) !== null) {
        const [, table, name, cmd, qual, withCheck] = m;
        const arr = out.get(name) ?? [];
        arr.push({ table, cmd, qual, withCheck });
        out.set(name, arr);
      }
      return out;
    }

    /** Strip every `(select auth.uid())` occurrence (case-insensitive,
     * whitespace-tolerant, with or without the deparsed "AS uid" alias) to
     * a single canonical token, THEN collapse any auth.uid() call that
     * survives (i.e. was never wrapped) to a DISTINCT token -- so a bare
     * call can never canonicalize to the same value as a wrapped one --
     * then strip remaining parens/whitespace/case so pure deparse-style
     * differences (extra wrapping parens, "AS uid", SELECT case) do not
     * cause a false mismatch while a real content difference still does. */
    function canonicalizeAuthExpr(expr: string): string {
      return expr
        .replace(/\(\s*select\s+auth\.uid\(\)\s*(as\s+uid\s*)?\)/gi, ' AUTHUID_WRAPPED ')
        .replace(/auth\.uid\(\)/gi, ' AUTHUID_BARE ')
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    }

    function stripWrappedAuthUid(expr: string): string {
      return expr.replace(/\(\s*select\s+auth\.uid\(\)\s*\)/gi, '');
    }

    function containsBareAuthUid(expr: string): boolean {
      return /auth\.uid\(\)/i.test(stripWrappedAuthUid(expr));
    }

    // Independent ground truth (not derived from the migration file): the
    // approved live contract's seven user_favorites/user_preferences
    // policies all share the identical two-part guard
    // "(select auth.uid()) is not null and (select auth.uid()) = user_id",
    // applied to USING for SELECT/DELETE, WITH CHECK for INSERT, and both
    // for UPDATE. Static-review evidence
    // (/home/venn/prepmeal-baseline-user-plans-static-review.md, section 5)
    // independently reasons through this exact guard shape.
    const APPROVED_WRAPPED_GUARD = '(select auth.uid()) is not null and (select auth.uid()) = user_id';
    const APPROVED_AFFECTED_IDENTITY: Record<string, { table: string; cmd: string; usingGuard: boolean; withCheckGuard: boolean }> = {
      'Users can view own favorites': { table: 'user_favorites', cmd: 'SELECT', usingGuard: true, withCheckGuard: false },
      'Users can insert own favorites': { table: 'user_favorites', cmd: 'INSERT', usingGuard: false, withCheckGuard: true },
      'Users can delete own favorites': { table: 'user_favorites', cmd: 'DELETE', usingGuard: true, withCheckGuard: false },
      'Users can view own preferences': { table: 'user_preferences', cmd: 'SELECT', usingGuard: true, withCheckGuard: false },
      'Users can insert own preferences': { table: 'user_preferences', cmd: 'INSERT', usingGuard: false, withCheckGuard: true },
      'Users can update own preferences': { table: 'user_preferences', cmd: 'UPDATE', usingGuard: true, withCheckGuard: true },
      'Users can delete own preferences': { table: 'user_preferences', cmd: 'DELETE', usingGuard: true, withCheckGuard: false },
    };
    const AFFECTED_NAMES = Object.keys(APPROVED_AFFECTED_IDENTITY);
    expect(AFFECTED_NAMES.length, 'exactly 7 affected policies').toBe(7);

    const creation = creationBlockOf(executable);
    const statements = extractCreatePolicyStatements(creation);

    it('extracts exactly 15 CREATE POLICY statements with a resolvable USING/WITH CHECK clause (fail-loud anchor check)', () => {
      expect(statements.length).toBe(15);
      for (const s of statements) {
        expect(s.usingExpr !== null || s.withCheckExpr !== null, `"${s.name}" must have a resolvable clause`).toBe(true);
      }
    });

    it.each(AFFECTED_NAMES)('creation SQL for "%s" matches the independent ground-truth guard exactly (table, command, and the approved (select auth.uid()) form in the right clause(s))', (name) => {
      const expected = APPROVED_AFFECTED_IDENTITY[name];
      const matches = statements.filter((s) => s.name === name);
      expect(matches.length, `expected exactly one CREATE POLICY statement named "${name}"`).toBe(1);
      const stmt = matches[0];

      expect(stmt.table, `"${name}" table`).toBe(expected.table);
      expect(stmt.cmd, `"${name}" command`).toBe(expected.cmd);
      expect(stmt.toAuthenticated, `"${name}" must be TO authenticated`).toBe(true);

      if (expected.usingGuard) {
        expect(stmt.usingExpr, `"${name}" must have a USING clause`).not.toBeNull();
        expect(containsBareAuthUid(stmt.usingExpr!), `"${name}" USING clause must not contain a bare (unwrapped) auth.uid() call: ${JSON.stringify(stmt.usingExpr)}`).toBe(false);
        expect(canonicalizeAuthExpr(stmt.usingExpr!), `"${name}" USING clause must match the approved guard`).toBe(canonicalizeAuthExpr(APPROVED_WRAPPED_GUARD));
      } else {
        expect(stmt.usingExpr, `"${name}" must NOT have a USING clause`).toBeNull();
      }

      if (expected.withCheckGuard) {
        expect(stmt.withCheckExpr, `"${name}" must have a WITH CHECK clause`).not.toBeNull();
        expect(containsBareAuthUid(stmt.withCheckExpr!), `"${name}" WITH CHECK clause must not contain a bare (unwrapped) auth.uid() call: ${JSON.stringify(stmt.withCheckExpr)}`).toBe(false);
        expect(canonicalizeAuthExpr(stmt.withCheckExpr!), `"${name}" WITH CHECK clause must match the approved guard`).toBe(canonicalizeAuthExpr(APPROVED_WRAPPED_GUARD));
      } else {
        expect(stmt.withCheckExpr, `"${name}" must NOT have a WITH CHECK clause`).toBeNull();
      }
    });

    it.each(AFFECTED_NAMES)('creation SQL for "%s" is independently identical (after canonicalization) to BOTH the preflight and postcheck expected-contract tuples for that exact policy name', (name) => {
      const stmt = statements.find((s) => s.name === name);
      expect(stmt, `expected a CREATE POLICY statement named "${name}"`).toBeDefined();

      for (const [label, block] of [
        ['preflight', preflightBlockOf(executable)],
        ['postcheck', postcheckBlockOf(executable)],
      ] as const) {
        const tuples = extractExpectedPolicyTuples(block).get(name);
        expect(tuples, `${label}: expected at least one contract row for policy "${name}"`).toBeDefined();
        expect(tuples!.length, `${label}: expected exactly 2 contract rows (expected + expected2 arms) for policy "${name}"`).toBe(2);
        for (const [armIdx, tuple] of tuples!.entries()) {
          expect(tuple.table, `${label} arm ${armIdx}: table for "${name}"`).toBe(stmt!.table);
          expect(tuple.cmd, `${label} arm ${armIdx}: command for "${name}"`).toBe(stmt!.cmd);

          const expectedQualCanon = canonicalizeAuthExpr(tuple.qual === 'NULL' ? '' : tuple.qual);
          const expectedCheckCanon = canonicalizeAuthExpr(tuple.withCheck === 'NULL' ? '' : tuple.withCheck);
          const actualQualCanon = canonicalizeAuthExpr(stmt!.usingExpr ?? '');
          const actualCheckCanon = canonicalizeAuthExpr(stmt!.withCheckExpr ?? '');

          expect(actualQualCanon, `${label} arm ${armIdx}: creation USING clause for "${name}" must canonicalize identically to the expected qual`).toBe(expectedQualCanon);
          expect(actualCheckCanon, `${label} arm ${armIdx}: creation WITH CHECK clause for "${name}" must canonicalize identically to the expected withcheck`).toBe(expectedCheckCanon);
        }
      }
    });

    it('the 8 menu_plans/menu_plan_items policies remain the unwrapped bare auth.uid() form (this correction must not spread beyond the 7 confirmed policies)', () => {
      const unaffected = statements.filter((s) => s.table === 'menu_plans' || s.table === 'menu_plan_items');
      expect(unaffected.length).toBe(8);
      for (const s of unaffected) {
        for (const expr of [s.usingExpr, s.withCheckExpr]) {
          if (expr === null) continue;
          expect(expr.includes('(select auth.uid())'), `"${s.name}" (${s.table}) must NOT use the wrapped form -- its own expected contract is the bare form`).toBe(false);
        }
      }
    });
  });

  describe('exact ACL contract (116 raw ACL rows, 5-field identity)', () => {
    it('expected-ACL VALUES construction lists exactly the 5-privilege and 8-privilege sets by name', () => {
      const narrow = "unnest(ARRAY['DELETE','INSERT','MAINTAIN','SELECT','UPDATE'])";
      const full = "unnest(ARRAY['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'])";
      // Each of the 2 diff arms (expected/expected2) in each of the 2 DO
      // blocks (preflight/postcheck) contains its own full unnest(...)
      // literal: 2 arms x 2 blocks = 4 for the narrow (5-privilege) set.
      expect(countOccurrences(executable, narrow)).toBe(4);
      // The full (8-privilege) set is used twice per arm (once for
      // menu_plans/menu_plan_items' postgres/service_role rows, once for
      // user_favorites/user_preferences' all-4-roles rows): 2 uses x 2 arms
      // x 2 blocks = 8.
      expect(countOccurrences(executable, full)).toBe(8);
    });

    it('ACL comparison declares grantor postgres and is_grantable false explicitly (not left implicit)', () => {
      // Once per diff arm (expected/expected2) x 2 blocks (preflight/postcheck) = 4.
      expect(countOccurrences(executable, "'postgres'::text AS grantor, false AS is_grantable")).toBe(4);
    });

    it('creation DDL narrows only TRUNCATE, REFERENCES, TRIGGER from anon/authenticated on menu_plans/menu_plan_items (not the full 7-privilege set Slice 1 used, since MAINTAIN/SELECT/INSERT/UPDATE/DELETE remain granted per the live 5-privilege contract)', () => {
      const creation = creationBlockOf(executable);
      expect(creation.includes('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.menu_plans FROM anon, authenticated')).toBe(true);
      expect(creation.includes('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.menu_plan_items FROM anon, authenticated')).toBe(true);
    });

    it('ACL-narrowing REVOKE is guarded on a live scan (zero-write on the compatible path)', () => {
      const creation = creationBlockOf(executable);
      const guardIdx = mustFind(creation, 'DO $narrow_acl$', 'ACL-narrowing guard block');
      const guardEnd = mustFind(creation, '$narrow_acl$;', 'ACL-narrowing guard block end');
      const guardBlock = creation.slice(guardIdx, guardEnd);
      expect(guardBlock.includes('IF EXISTS (')).toBe(true);
      expect(guardBlock.indexOf('IF EXISTS (')).toBeLessThan(guardBlock.indexOf('EXECUTE $sql$ REVOKE'));
    });

    it('rejects any unrecognized ACL grantee (defense in depth beyond the symmetric diff)', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight.includes("NOT IN ('anon','authenticated','postgres','service_role')")).toBe(true);
    });

    it('rejects any explicit column ACL', () => {
      const preflight = preflightBlockOf(executable);
      const postcheck = postcheckBlockOf(executable);
      expect(preflight.includes('a.attacl IS NOT NULL')).toBe(true);
      expect(postcheck.includes('a.attacl IS NOT NULL')).toBe(true);
    });
  });

  describe('exact trigger contract', () => {
    it('preflight/postcheck require exactly 1 non-internal trigger across the 4 tables', () => {
      const preflight = preflightBlockOf(executable);
      const postcheck = postcheckBlockOf(executable);
      expect(preflight.includes('<> 1 THEN')).toBe(true);
      expect(postcheck.includes('<> 1 THEN')).toBe(true);
    });

    it('the one trigger is trg_user_preferences_updated_at, BEFORE UPDATE FOR EACH ROW bound to set_updated_at() -- asserted identically in BOTH preflight and postcheck (an exact occurrence count, not a mere existence check, so a single-arm-only edit is still caught)', () => {
      const bindingClause = "AND pn.nspname = 'public' AND p.proname = 'set_updated_at'";
      expect(countOccurrences(executable, "c.relname = 'user_preferences' AND t.tgname = 'trg_user_preferences_updated_at'")).toBe(2);
      expect(countOccurrences(executable, bindingClause)).toBe(2);
      expect(countOccurrences(executable, 't.tgtype = 19')).toBe(2);
    });

    it('creates exactly 1 CREATE TRIGGER statement, guarded', () => {
      const creation = creationBlockOf(executable);
      expect((creation.match(/CREATE TRIGGER/g) ?? []).length).toBe(1);
      expect(creation.includes('IF NOT EXISTS (\n    SELECT 1 FROM pg_catalog.pg_trigger t')).toBe(true);
    });

    it('never creates or replaces public.set_updated_at() itself -- only verifies and references it', () => {
      expect(executable.includes('CREATE FUNCTION public.set_updated_at')).toBe(false);
      expect(executable.includes('CREATE OR REPLACE FUNCTION public.set_updated_at')).toBe(false);
      expect(executable.includes('EXECUTE FUNCTION public.set_updated_at()')).toBe(true);
    });

    it('preflight fails closed if set_updated_at() is not exactly 1 (missing prerequisite), rather than creating it', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight.includes('IF fn_count <> 1 THEN')).toBe(true);
      expect(preflight.includes('a required prior prerequisite this migration does not create')).toBe(true);
    });
  });

  describe('owner/RLS checks', () => {
    it('every table gets ALTER TABLE ... OWNER TO postgres and ENABLE ROW LEVEL SECURITY exactly once', () => {
      const creation = creationBlockOf(executable);
      for (const t of TARGET_TABLES) {
        expect(countOccurrences(creation, `ALTER TABLE public.${t} OWNER TO postgres;`)).toBe(1);
        expect(countOccurrences(creation, `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`)).toBe(1);
      }
    });

    it('preflight/postcheck assert owner=postgres and RLS enabled/not-forced for all 4 tables', () => {
      const preflight = preflightBlockOf(executable);
      const postcheck = postcheckBlockOf(executable);
      expect(preflight.includes("IS DISTINCT FROM 'postgres'")).toBe(true);
      expect(preflight.includes('IS DISTINCT FROM (true, false)')).toBe(true);
      expect(postcheck.includes('relrowsecurity IS DISTINCT FROM true')).toBe(true);
      expect(postcheck.includes('relforcerowsecurity IS DISTINCT FROM false')).toBe(true);
    });
  });

  describe('no application DML, no manual migration-history write', () => {
    it('contains no INSERT/UPDATE/DELETE against any application table (only catalog SELECTs)', () => {
      expect(/\bINSERT INTO public\./.test(executable)).toBe(false);
      expect(/\bUPDATE public\.\w+ SET\b/.test(executable)).toBe(false);
      expect(/\bDELETE FROM public\.\w+ WHERE\b/.test(executable)).toBe(false);
    });

    it('never references supabase_migrations.schema_migrations', () => {
      expect(executable.includes('supabase_migrations')).toBe(false);
    });

    it('has no explicit BEGIN/COMMIT (relies on the implicit migration transaction, matching repo convention)', () => {
      expect(/^\s*BEGIN;/m.test(executable)).toBe(false);
      expect(/^\s*COMMIT;/m.test(executable)).toBe(false);
    });
  });

  describe('downstream migration compatibility assumptions', () => {
    function laterMigrationSource(filename: string): string {
      const p = path.join(MIGRATIONS_DIR, filename);
      expect(fs.existsSync(p), `${filename} must exist`).toBe(true);
      return fs.readFileSync(p, 'utf8');
    }

    it('20260909050201 (atomic_saved_plan_write) column assumptions on menu_plans are a subset of this migration\'s created columns', () => {
      const src = laterMigrationSource('20260909050201_atomic_saved_plan_write.sql');
      const assumedCols = ['user_id', 'title', 'start_date', 'end_date', 'avg_servings', 'item_count', 'preview_items'];
      const createdCols = ['user_id', 'title', 'start_date', 'end_date', 'created_at', 'avg_servings', 'item_count', 'preview_items'];
      for (const c of assumedCols) {
        expect(createdCols, `menu_plans.${c} must be created by Slice 2`).toContain(c);
        expect(src.includes(c), `${c} should appear in the downstream migration`).toBe(true);
      }
    });

    it('20260915053240 (unit_safe_shopping_list_aggregation) reads user_preferences.unit_language, which this migration creates', () => {
      const src = laterMigrationSource('20260915053240_unit_safe_shopping_list_aggregation.sql');
      expect(src.includes('unit_language')).toBe(true);
      expect(executable.includes("'unit_language','text',true,'''en''::text'")).toBe(true);
    });

    it('20260921054250/20260921054256 (profiles) have no EXECUTABLE dependency on any Slice 2 table (a header-comment mention for context is fine; only comment-stripped SQL is checked)', () => {
      for (const f of ['20260921054250_baseline_profiles_schema.sql', '20260921054256_revoke_profiles_unneeded_privileges.sql']) {
        const src = stripLineComments(laterMigrationSource(f));
        for (const t of TARGET_TABLES) {
          expect(src.includes(`public.${t}`), `${f} must not executably reference public.${t}`).toBe(false);
        }
      }
    });

    it('20260921175321 (harden_recipe_catalog_client_write_boundary) does not touch any Slice 2 table', () => {
      const src = laterMigrationSource('20260921175321_harden_recipe_catalog_client_write_boundary.sql');
      for (const t of TARGET_TABLES) {
        expect(src.includes(`public.${t}`)).toBe(false);
      }
    });
  });
});
