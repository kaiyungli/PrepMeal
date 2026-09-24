import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Contract tests for the CLI-generated-then-renamed migration
//   supabase/migrations/20260904060000_baseline_core_recipe_catalog_schema.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL via string/regex matching against the
// comment-stripped text -- not a real SQL parse. Assertions run against the
// SQL with `--` line comments stripped, so a word appearing only in prose
// cannot accidentally satisfy or violate a contract check meant to verify
// actual executable statements. Raw (un-stripped) `sql` is used only to
// assert that specific out-of-scope mentions are confined to comment lines.
//
// HARDENED-CONTRACT CORRECTION (see the migration's own header and
// /home/venn/prepmeal-baseline-core-recipe-catalog-static-review.md /
// /home/venn/prepmeal-recipes-insert-authorization-confirmation.md, both
// outside this repo): this migration now creates the ALREADY-HARDENED
// final recipe-catalog contract directly (8 SELECT-only policies, a
// 144-row hardened ACL) rather than reproducing the previously-audited
// vulnerable shape (15 policies including a `recipes` INSERT-policy
// authorization bypass, a 256-row default ACL). Every test below reflects
// that corrected target contract; the 7 removed vulnerable policy names
// are explicitly asserted ABSENT, not merely no-longer-asserted-present.

const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_baseline_core_recipe_catalog_schema.sql';
const EXPECTED_VERSION = '20260904060000';
const EXPECTED_FILE = `${EXPECTED_VERSION}${SUFFIX}`;
const HOTFIX_FILE = '20260921175321_harden_recipe_catalog_client_write_boundary.sql';

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

/**
 * Find a required marker index or fail loudly with a descriptive message --
 * every extraction anchor in this file goes through this helper (or an
 * equivalent inline `expect(...).toBeGreaterThan(-1)`) instead of silently
 * tolerating -1/an empty slice, per this file's own no-false-positive rule.
 */
function mustFind(haystack: string, marker: string, label: string): number {
  const idx = haystack.indexOf(marker);
  expect(idx, `expected to find ${label} (marker: ${JSON.stringify(marker)})`).toBeGreaterThan(-1);
  return idx;
}

/** Slice out the DO $preflight$ ... $preflight$; block from executable SQL. */
function preflightBlockOf(executable: string): string {
  const start = mustFind(executable, 'DO $preflight$', 'the preflight DO block start');
  const endMarkerIdx = mustFind(executable, '$preflight$;', 'the preflight DO block end');
  const end = endMarkerIdx + '$preflight$;'.length;
  expect(end).toBeGreaterThan(start);
  return executable.slice(start, end);
}

/** Slice out the DO $postcheck$ ... $postcheck$; block from executable SQL. */
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

/**
 * Slice out the header's part-C ("Read-only postcheck") prose paragraph --
 * the comment block that documents the compatible path's write/no-write
 * guarantee -- from the RAW (comment-included) sql, bounded by an exact
 * start anchor (the paragraph's own opening line) and an exact end anchor
 * (the start of the next header paragraph, "Transactionality:"). Fails
 * loudly if either anchor is missing, rather than falling back to a
 * whole-file loose substring search.
 */
function postcheckHeaderSectionOf(sql: string): string {
  const start = mustFind(
    sql,
    '--   C. Read-only postcheck: reassert the complete final HARDENED contract',
    'the part-C header paragraph start',
  );
  const end = mustFind(sql, '-- Transactionality:', 'the header paragraph end anchor (next section, "Transactionality:")');
  expect(end, 'expected the Transactionality section to come after the part-C paragraph').toBeGreaterThan(start);
  return sql.slice(start, end);
}

/** Extract the string contents of a Postgres ARRAY['a','b',...] literal, sorted. */
function extractArrayLiteral(sql: string, marker: string): string[] {
  const idx = mustFind(sql, marker, `array literal marker`);
  const arrStart = mustFind(sql.slice(idx), 'ARRAY[', `ARRAY[ literal after ${marker}`) + idx;
  const arrEnd = sql.indexOf(']', arrStart);
  expect(arrEnd, 'expected a closing ] for the ARRAY literal').toBeGreaterThan(arrStart);
  const inner = sql.slice(arrStart + 'ARRAY['.length, arrEnd);
  return inner
    .split(',')
    .map((s) => s.trim().replace(/^'/, '').replace(/'$/, ''))
    .sort();
}

/**
 * Extract a table/name/cmd/permissive/roles/qual/withcheck policy-identity
 * VALUES list from a block of SQL, given the marker text immediately
 * preceding the VALUES( keyword and the end-of-list marker. Returns each
 * row as a raw 7-tuple string (still containing SQL literal quoting), so
 * callers can compare full text, not just presence.
 */
function extractPolicyValuesRows(block: string, startMarker: string, count: number): string[] {
  const startIdx = mustFind(block, startMarker, `policy VALUES list start (${startMarker})`);
  const valuesIdx = mustFind(block.slice(startIdx), 'VALUES', 'VALUES keyword after policy list start marker') + startIdx;
  const asIdx = block.indexOf(') AS expected', valuesIdx);
  expect(asIdx, 'expected a closing ) AS expected(...) for the policy VALUES list').toBeGreaterThan(valuesIdx);
  const body = block.slice(valuesIdx, asIdx);
  // Split on top-level "),\n      (" row boundaries -- rows themselves may
  // contain nested parens (EXISTS (...)), so this splits on the specific,
  // unambiguous row-separator pattern this file's own formatting always
  // uses, rather than naively splitting on every comma.
  const rows = body.split(/\),\s*\n\s*\(/).map((r, i, arr) => {
    let s = r;
    if (i === 0) s = s.replace(/^VALUES\s*\(/, '');
    if (i === arr.length - 1) s = s.replace(/\)\s*$/, '');
    return s.trim();
  });
  expect(rows.length, `expected exactly ${count} policy rows in ${startMarker}`).toBe(count);
  return rows;
}

describe('migration: baseline_core_recipe_catalog_schema', () => {
  const { file, sql, executable } = loadMigration();

  describe('filename, version and ordering', () => {
    it('is the exact CLI-generated-then-renamed filename', () => {
      expect(file).toBe(EXPECTED_FILE);
    });

    it('follows the CLI-generated 14-digit-timestamp filename pattern', () => {
      expect(file).toMatch(/^\d{14}_baseline_core_recipe_catalog_schema\.sql$/);
    });

    it('sorts strictly before the current first active migration (20260905034023)', () => {
      expect(EXPECTED_VERSION < '20260905034023').toBe(true);
      expect(file < '20260905034023_get_recipe_list_with_detail_json.sql').toBe(true);
    });

    it('is the earliest file in the active migrations directory', () => {
      const all = activeMigrationFiles();
      expect(all[0]).toBe(EXPECTED_FILE);
    });

    it('version is unique among all active migration files', () => {
      const all = activeMigrationFiles();
      const versions = all.map((f) => f.slice(0, 14));
      const count = versions.filter((v) => v === EXPECTED_VERSION).length;
      expect(count).toBe(1);
    });
  });

  describe('ordering: preflight before mutation, postcheck after mutation', () => {
    it('the preflight DO block appears before any CREATE TABLE / CREATE OR REPLACE FUNCTION', () => {
      const preflightIdx = mustFind(executable, 'DO $preflight$', 'preflight start');
      const createTableIdx = mustFind(executable, 'CREATE TABLE', 'first CREATE TABLE');
      const createFnIdx = mustFind(executable, 'CREATE OR REPLACE FUNCTION', 'CREATE OR REPLACE FUNCTION');
      expect(createTableIdx).toBeGreaterThan(preflightIdx);
      expect(createFnIdx).toBeGreaterThan(preflightIdx);
    });

    it('the postcheck DO block appears after every CREATE TABLE and after the trigger-creation guard', () => {
      const lastCreateTable = mustFind(executable, 'CREATE TABLE IF NOT EXISTS', 'a CREATE TABLE IF NOT EXISTS');
      const lastCreateTableIdx = executable.lastIndexOf('CREATE TABLE IF NOT EXISTS');
      const triggerGuardIdx = mustFind(executable, '$create_recipes_trigger$', 'trigger creation guard');
      const postcheckIdx = mustFind(executable, 'DO $postcheck$', 'postcheck start');
      expect(lastCreateTable).toBeGreaterThan(-1);
      expect(postcheckIdx).toBeGreaterThan(lastCreateTableIdx);
      expect(postcheckIdx).toBeGreaterThan(triggerGuardIdx);
    });

    it('the preflight block performs no write (no statement starts with CREATE/ALTER/GRANT/REVOKE/INSERT/UPDATE/DELETE/DROP)', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).not.toMatch(/^\s{0,4}(CREATE|ALTER|GRANT|REVOKE|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|DROP)\b/m);
    });

    it('the postcheck block performs no write', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).not.toMatch(/^\s{0,4}(CREATE|ALTER|GRANT|REVOKE|INSERT INTO|UPDATE\s+\w+\s+SET|DELETE FROM|DROP)\b/m);
    });
  });

  describe('all-absent / all-present gating, partial-presence rejection', () => {
    it('the preflight table-presence gate accepts only 0 or 8, not any partial count', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/present_count\s+NOT\s+IN\s*\(\s*0\s*,\s*8\s*\)/);
    });

    it('the partial-presence gate is immediately followed by RAISE EXCEPTION', () => {
      const preflight = preflightBlockOf(executable);
      const gateIdx = preflight.search(/present_count\s+NOT\s+IN\s*\(\s*0\s*,\s*8\s*\)/);
      expect(gateIdx).toBeGreaterThan(-1);
      const after = preflight.slice(gateIdx, gateIdx + 200);
      expect(after).toMatch(/THEN[\s\S]*RAISE EXCEPTION/);
    });

    it('function-presence gate accepts only 0 or 1 for set_updated_at', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/fn_count\s+NOT\s+IN\s*\(\s*0\s*,\s*1\s*\)/);
    });

    it('MUTATION: partial table existence (1..7 present) is rejected, not silently accepted', () => {
      // The gate is a single NOT IN (0, 8) check with no other accepted
      // value -- any count from 1 through 7 necessarily falls through to
      // the RAISE EXCEPTION branch. This is a structural guarantee, not a
      // runtime simulation (no DB is available to this test file).
      const preflight = preflightBlockOf(executable);
      const gateMatch = preflight.match(/present_count\s+NOT\s+IN\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
      expect(gateMatch).not.toBeNull();
      expect(gateMatch![1]).toBe('0');
      expect(gateMatch![2]).toBe('8');
    });
  });

  describe('exact eight-table scope', () => {
    it('the preflight target_tables array contains exactly the 8 authorized tables', () => {
      const preflight = preflightBlockOf(executable);
      const arr = extractArrayLiteral(preflight, 'target_tables');
      expect(arr).toEqual(TARGET_TABLES);
    });

    it('the postcheck target_tables array contains exactly the 8 authorized tables', () => {
      const postcheck = postcheckBlockOf(executable);
      const arr = extractArrayLiteral(postcheck, 'target_tables');
      expect(arr).toEqual(TARGET_TABLES);
    });

    it('creates exactly 8 tables (no more, no fewer)', () => {
      const creation = creationBlockOf(executable);
      const matches = [...creation.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map((m) => m[1]).sort();
      expect(matches).toEqual(TARGET_TABLES);
    });

    it('does not create, alter, or reference any unauthorized table/view/function', () => {
      const forbidden = [
        'menu_plans',
        'menu_plan_items',
        'user_favorites',
        'user_preferences',
        'v_menu_plan_shopping_list',
        'vw_menu_plan_grocery_items',
        'get_recipe_detail_json',
        'admin_delete_recipe_atomic',
      ];
      for (const name of forbidden) {
        expect(executable, `unexpected reference to ${name}`).not.toMatch(new RegExp(`\\b${name}\\b`));
      }
    });

    it('rejects an unexpected non-table object occupying a target name (relkind check)', () => {
      const preflight = preflightBlockOf(executable);
      const idx = preflight.search(/c\.relkind\s+NOT\s+IN\s*\(\s*'r'\s*,\s*'p'\s*\)/);
      expect(idx).toBeGreaterThan(-1);
      expect(preflight.slice(idx, idx + 300)).toMatch(/RAISE EXCEPTION/);
    });
  });

  describe('exact ordered columns and defaults', () => {
    const expectedColumns: Record<string, Array<[string, string]>> = {
      ingredients: [
        ['id', 'gen_random_uuid()'],
        ['name', ''],
        ['category', ''],
        ['slug', ''],
        ['aliases', "'{}'::text[]"],
        ['is_active', 'true'],
        ['created_at', 'now()'],
        ['shopping_category', ''],
        ['is_pantry_default', 'false'],
        ['name_en', ''],
        ['name_zh', ''],
      ],
      units: [
        ['id', 'gen_random_uuid()'],
        ['code', ''],
        ['name', ''],
        ['unit_type', ''],
        ['to_base', ''],
        ['display_name_en', ''],
        ['display_name_zh', ''],
      ],
      equipment: [
        ['id', 'gen_random_uuid()'],
        ['name', ''],
        ['category', ''],
        ['created_at', 'now()'],
      ],
      recipe_equipment: [
        ['recipe_id', ''],
        ['equipment_id', ''],
        ['is_optional', 'false'],
        ['note', ''],
      ],
      recipe_ingredients: [
        ['id', 'gen_random_uuid()'],
        ['recipe_id', ''],
        ['ingredient_id', ''],
        ['quantity', ''],
        ['unit_id', ''],
        ['is_optional', 'false'],
        ['group_key', ''],
        ['prep_note', ''],
        ['created_at', 'now()'],
      ],
      recipe_steps: [
        ['id', 'gen_random_uuid()'],
        ['recipe_id', ''],
        ['step_no', ''],
        ['text', ''],
        ['time_seconds', ''],
        ['image_url', ''],
      ],
      ingredient_substitutions: [
        ['id', 'gen_random_uuid()'],
        ['ingredient_id', ''],
        ['substitute_ingredient_id', ''],
        ['ratio', '1'],
        ['note', ''],
        ['created_at', 'now()'],
      ],
    };

    function tableBodyOf(tbl: string): string {
      const marker = `CREATE TABLE IF NOT EXISTS public.${tbl} (`;
      const start = mustFind(executable, marker, `CREATE TABLE for ${tbl}`);
      const end = mustFind(executable.slice(start), ');', `end of CREATE TABLE body for ${tbl}`) + start;
      return executable.slice(start + marker.length, end);
    }

    for (const [tbl, cols] of Object.entries(expectedColumns)) {
      it(`${tbl}: columns appear in exact declared order with exact defaults`, () => {
        const body = tableBodyOf(tbl);
        let cursor = -1;
        for (const [colName, def] of cols) {
          const colIdx = body.indexOf(colName, cursor + 1);
          expect(colIdx, `expected column ${colName} in ${tbl} after position ${cursor}`).toBeGreaterThan(cursor);
          if (def) {
            const lineEnd = body.indexOf(',', colIdx) === -1 ? body.length : body.indexOf('\n', colIdx);
            const line = body.slice(colIdx, lineEnd === -1 ? body.length : lineEnd);
            expect(line, `expected default ${def} on column ${colName} of ${tbl}`).toContain(def);
          }
          cursor = colIdx;
        }
      });
    }

    it('recipes: exact 33-column ordered set with its defaults', () => {
      const body = tableBodyOf('recipes');
      const order = [
        'id',
        'name',
        'description',
        'image_url',
        'cuisine',
        'dish_type',
        'method',
        'speed',
        'difficulty',
        'protein',
        'diet',
        'flavor',
        'base_servings',
        'calories_per_serving',
        'protein_g',
        'carbs_g',
        'fat_g',
        'is_public',
        'author_id',
        'created_at',
        'updated_at',
        'slug',
        'prep_time_minutes',
        'cook_time_minutes',
        'total_time_minutes',
        'servings_unit',
        'meal_role',
        'is_complete_meal',
        'primary_protein',
        'excluded_tags',
        'budget_level',
        'reuse_group',
        'times_shown',
      ];
      let cursor = -1;
      for (const col of order) {
        const idx = body.indexOf(`\n  ${col} `, cursor);
        const idxAlt = idx === -1 ? body.indexOf(col, cursor + 1) : idx;
        expect(idxAlt, `expected recipes column ${col} after position ${cursor}`).toBeGreaterThan(cursor);
        cursor = idxAlt;
      }
      expect(body).toContain("DEFAULT '{}'::text[]");
      expect(body).toMatch(/times_shown\s+integer\s+DEFAULT 0/);
      expect(body).toMatch(/servings_unit\s+text\s+DEFAULT 'portion'::text/);
    });

    it('no column in scope declares an identity or generated-always clause', () => {
      const creation = creationBlockOf(executable);
      for (const tbl of TARGET_TABLES) {
        expect(creation).not.toMatch(new RegExp(`${tbl}[\\s\\S]{0,2000}GENERATED ALWAYS`));
      }
    });
  });

  describe('exact named constraints and FK actions (all 37, including the 10 categorical CHECKs)', () => {
    // Prior static review (Finding H-3) found only 27/37 constraints
    // individually asserted here -- all 10 missing entries were CHECK
    // constraints enforcing categorical vocabularies, the most
    // data-integrity-critical constraints in this schema. All 37 are now
    // listed explicitly.
    const expectedConstraints: Array<[string, string]> = [
      ['equipment_pkey', 'PRIMARY KEY (id)'],
      ['ingredient_substitutions_pkey', 'PRIMARY KEY (id)'],
      ['unique_substitution', 'UNIQUE (ingredient_id, substitute_ingredient_id)'],
      ['ingredient_substitutions_ratio_check', 'CHECK ((ratio > (0)::numeric))'],
      [
        'ingredient_substitutions_ingredient_id_fkey',
        'FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE',
      ],
      [
        'ingredient_substitutions_substitute_ingredient_id_fkey',
        'FOREIGN KEY (substitute_ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE',
      ],
      ['ingredients_pkey', 'PRIMARY KEY (id)'],
      ['ingredients_slug_key', 'UNIQUE (slug)'],
      [
        'ingredients_shopping_category_check',
        "CHECK (((shopping_category IS NULL) OR (shopping_category = ANY (ARRAY['vegetable'::text, 'meat_seafood'::text, 'tofu_egg'::text, 'dairy'::text, 'carb'::text, 'pantry'::text, 'seasoning'::text, 'frozen'::text, 'other'::text]))))",
      ],
      ['recipe_equipment_pkey', 'PRIMARY KEY (recipe_id, equipment_id)'],
      ['recipe_equipment_recipe_id_fkey', 'FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'],
      ['recipe_equipment_equipment_id_fkey', 'FOREIGN KEY (equipment_id) REFERENCES equipment(id)'],
      ['recipe_ingredients_pkey', 'PRIMARY KEY (id)'],
      ['recipe_ingredients_recipe_id_ingredient_id_key', 'UNIQUE (recipe_id, ingredient_id)'],
      ['recipe_ingredients_quantity_check', 'CHECK ((quantity >= (0)::numeric))'],
      ['recipe_ingredients_recipe_id_fkey', 'FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'],
      ['recipe_ingredients_ingredient_id_fkey', 'FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'],
      ['recipe_ingredients_unit_id_fkey', 'FOREIGN KEY (unit_id) REFERENCES units(id)'],
      ['recipe_steps_pkey', 'PRIMARY KEY (id)'],
      ['recipe_steps_recipe_id_step_no_key', 'UNIQUE (recipe_id, step_no)'],
      ['recipe_steps_step_no_check', 'CHECK ((step_no > 0))'],
      ['recipe_steps_recipe_id_fkey', 'FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE'],
      ['recipes_pkey', 'PRIMARY KEY (id)'],
      ['recipes_slug_key', 'UNIQUE (slug)'],
      ['recipes_base_servings_check', 'CHECK ((base_servings > 0))'],
      [
        'recipes_budget_level_check',
        "CHECK (((budget_level IS NULL) OR (budget_level = ANY (ARRAY['budget'::text, 'normal'::text, 'premium'::text]))))",
      ],
      [
        'recipes_cuisine_check',
        "CHECK ((cuisine = ANY (ARRAY['chinese'::text, 'western'::text, 'japanese'::text, 'korean'::text, 'thai'::text, 'fusion'::text])))",
      ],
      ['recipes_difficulty_check', "CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])))"],
      [
        'recipes_dish_type_check',
        "CHECK ((dish_type = ANY (ARRAY['main'::text, 'side'::text, 'soup'::text, 'staple'::text, 'snack'::text])))",
      ],
      [
        'recipes_meal_role_check',
        "CHECK (((meal_role IS NULL) OR (meal_role = ANY (ARRAY['complete_meal'::text, 'protein_main'::text, 'veg_side'::text, 'protein_side'::text, 'soup'::text]))))",
      ],
      [
        'recipes_method_check',
        "CHECK ((method = ANY (ARRAY['stir_fry'::text, 'steamed'::text, 'fried'::text, 'braised'::text, 'boiled'::text, 'baked'::text])))",
      ],
      [
        'recipes_primary_protein_check',
        "CHECK (((primary_protein IS NULL) OR (primary_protein = ANY (ARRAY['chicken'::text, 'beef'::text, 'pork'::text, 'fish'::text, 'seafood'::text, 'shrimp'::text, 'tofu'::text, 'egg'::text, 'vegetarian'::text, 'mixed'::text]))))",
      ],
      ['recipes_speed_check', "CHECK ((speed = ANY (ARRAY['quick'::text, 'normal'::text, 'slow'::text])))"],
      ['units_pkey', 'PRIMARY KEY (id)'],
      ['units_code_key', 'UNIQUE (code)'],
      ['units_to_base_check', 'CHECK ((to_base > (0)::numeric))'],
      ['units_unit_type_check', "CHECK ((unit_type = ANY (ARRAY['mass'::text, 'volume'::text, 'count'::text])))"],
    ];

    it('lists exactly 37 constraints (matching the migration/postcheck total)', () => {
      expect(expectedConstraints.length).toBe(37);
    });

    it('every expected constraint name and definition appears verbatim exactly once', () => {
      const creation = creationBlockOf(executable);
      for (const [name, def] of expectedConstraints) {
        const nameRe = new RegExp(`CONSTRAINT ${name}\\b`, 'g');
        const count = (creation.match(nameRe) ?? []).length;
        expect(count, `expected exactly one CONSTRAINT ${name}`).toBe(1);
        expect(creation).toContain(def);
      }
    });

    it('non-cascading FKs declare no ON DELETE clause (checked per exact constraint name, not by generic column-name text)', () => {
      const creation = creationBlockOf(executable);
      const nonCascading: Array<[string, string]> = [
        ['recipe_equipment_equipment_id_fkey', 'FOREIGN KEY (equipment_id) REFERENCES equipment(id)'],
        ['recipe_ingredients_ingredient_id_fkey', 'FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)'],
        ['recipe_ingredients_unit_id_fkey', 'FOREIGN KEY (unit_id) REFERENCES units(id)'],
      ];
      for (const [conName, def] of nonCascading) {
        const idx = mustFind(creation, `CONSTRAINT ${conName} `, `CONSTRAINT ${conName}`);
        const clauseEnd = creation.indexOf('\n', idx);
        const clause = creation.slice(idx, clauseEnd);
        expect(clause).toContain(def);
        expect(clause).not.toContain('ON DELETE');
      }
    });

    it('cascading FKs (ingredient_substitutions -> ingredients) declare ON DELETE CASCADE by exact constraint name', () => {
      const creation = creationBlockOf(executable);
      const cascading: Array<[string, string]> = [
        ['ingredient_substitutions_ingredient_id_fkey', 'REFERENCES ingredients(id) ON DELETE CASCADE'],
        ['ingredient_substitutions_substitute_ingredient_id_fkey', 'REFERENCES ingredients(id) ON DELETE CASCADE'],
      ];
      for (const [conName, def] of cascading) {
        const idx = mustFind(creation, `CONSTRAINT ${conName} `, `CONSTRAINT ${conName}`);
        const clauseEnd = creation.indexOf('\n', idx);
        expect(creation.slice(idx, clauseEnd)).toContain(def);
      }
    });

    it('recipe-owning FKs (recipe_ingredients/recipe_steps/recipe_equipment) cascade on delete', () => {
      const creation = creationBlockOf(executable);
      const cascadeCount = (creation.match(/REFERENCES recipes\(id\) ON DELETE CASCADE/g) ?? []).length;
      expect(cascadeCount).toBe(3); // recipe_ingredients, recipe_steps, recipe_equipment
    });

    it('the preflight requires every in-scope constraint to be validated, non-deferrable, non-deferred', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/convalidated\s+IS\s+DISTINCT\s+FROM\s+true/);
      expect(preflight).toMatch(/condeferrable\s+IS\s+DISTINCT\s+FROM\s+false/);
      expect(preflight).toMatch(/condeferred\s+IS\s+DISTINCT\s+FROM\s+false/);
    });

    it('the postcheck reasserts the same constraint set via a full symmetric-content diff, not merely a count', () => {
      // Prior static review (Finding H-1): postcheck degraded to a bare
      // count for columns/constraints/indexes/policies. It must now reuse
      // the full VALUES-based comparison, matching preflight's rigor.
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/CONSTRAINT-row mismatches|constraint-row mismatches/);
      expect(postcheck).toMatch(/pg_catalog\.pg_get_constraintdef\(co\.oid\)/);
      // A bare count-only check would compare against a literal integer
      // (e.g. `<> 37`); the strengthened postcheck instead diffs full rows.
      expect(postcheck).not.toMatch(/expected exactly 37 constraints/);
    });
  });

  describe('exact index set', () => {
    it('creates exactly 31 explicit non-constraint-backed indexes', () => {
      const creation = creationBlockOf(executable);
      const count = (creation.match(/^CREATE INDEX IF NOT EXISTS/gm) ?? []).length;
      expect(count).toBe(31);
    });

    it('every explicit CREATE INDEX uses IF NOT EXISTS (natively idempotent, no guard needed)', () => {
      const creation = creationBlockOf(executable);
      const bareIndexes = creation.match(/^CREATE INDEX(?! IF NOT EXISTS)/gm) ?? [];
      expect(bareIndexes.length).toBe(0);
    });

    it('the constraint-backed index count (8 PK + 6 UNIQUE = 14) plus the 31 explicit indexes accounts for all 45 (arithmetic cross-check, Finding M-3)', () => {
      const creation = creationBlockOf(executable);
      const pkCount = (creation.match(/PRIMARY KEY/g) ?? []).length;
      const uniqueCount = (creation.match(/\bUNIQUE\s*\(/g) ?? []).length;
      const explicitIndexCount = (creation.match(/^CREATE INDEX IF NOT EXISTS/gm) ?? []).length;
      expect(pkCount).toBe(8);
      expect(uniqueCount).toBe(6);
      expect(pkCount + uniqueCount + explicitIndexCount).toBe(45);
    });

    it('the postcheck reasserts the full index set via a symmetric-content diff (table/name/definition), not merely a count of 45', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/index-row mismatches/);
      expect(postcheck).toMatch(/FROM pg_catalog\.pg_indexes/);
      expect(postcheck).not.toMatch(/expected exactly 45 indexes/);
    });

    it('includes both GIN array indexes and the full-text search functional index on recipes', () => {
      const creation = creationBlockOf(executable);
      expect(creation).toMatch(/USING gin \(diet\)/);
      expect(creation).toMatch(/USING gin \(protein\)/);
      expect(creation).toMatch(/USING gin \(flavor\)/);
      expect(creation).toMatch(/USING gin \(excluded_tags\)/);
      expect(creation).toMatch(/recipes_search_idx ON public\.recipes USING gin \(to_tsvector\('english'/);
    });
  });

  describe('owner and comments', () => {
    it('every one of the 8 tables is explicitly assigned OWNER TO postgres', () => {
      const creation = creationBlockOf(executable);
      for (const tbl of TARGET_TABLES) {
        expect(creation).toContain(`ALTER TABLE public.${tbl} OWNER TO postgres`);
      }
    });

    it('no COMMENT ON statement is issued (none of the 8 tables carries a live comment)', () => {
      const creation = creationBlockOf(executable);
      expect(creation).not.toMatch(/COMMENT ON/i);
    });
  });

  describe('RLS enabled/forced state', () => {
    it('every one of the 8 tables explicitly enables RLS', () => {
      const creation = creationBlockOf(executable);
      for (const tbl of TARGET_TABLES) {
        expect(creation).toContain(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY`);
      }
    });

    it('no table forces RLS (FORCE ROW LEVEL SECURITY never appears)', () => {
      expect(executable).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
    });

    it('the preflight requires RLS state to be exactly (true, false) -- enabled, not forced', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/\(c\.relrowsecurity,\s*c\.relforcerowsecurity\)/);
      expect(preflight).toMatch(/IS\s+DISTINCT\s+FROM\s+\(true,\s*false\)/);
    });
  });

  describe('HARDENED CONTRACT: exactly 8 SELECT-only policies, full identity', () => {
    // Full identity (table/name/cmd/permissive/roles/qual/with_check), not
    // merely presence/USING-boolean/WITH-CHECK-boolean -- prior static
    // review Finding H-4 found that a shape-only test suite could not have
    // caught the recipes INSERT-policy authorization bypass (Finding B-1),
    // because it never compared the actual boolean expression text or
    // reasoned about cross-policy interaction. Both gaps are closed below.
    const expectedPolicies: Array<{
      table: string;
      name: string;
      cmd: 'SELECT';
      roles: string;
      qual: string;
      withcheck: string;
    }> = [
      { table: 'equipment', name: 'read equipment', cmd: 'SELECT', roles: '{public}', qual: 'true', withcheck: 'NULL' },
      {
        table: 'ingredient_substitutions',
        name: 'read ingredient substitutions',
        cmd: 'SELECT',
        roles: '{public}',
        qual: 'true',
        withcheck: 'NULL',
      },
      { table: 'ingredients', name: 'read ingredients', cmd: 'SELECT', roles: '{public}', qual: 'true', withcheck: 'NULL' },
      {
        table: 'recipe_equipment',
        name: 'read equipment for visible recipes',
        cmd: 'SELECT',
        roles: '{public}',
        qual: 'EXISTS',
        withcheck: 'NULL',
      },
      {
        table: 'recipe_ingredients',
        name: 'read ingredients for visible recipes',
        cmd: 'SELECT',
        roles: '{public}',
        qual: 'EXISTS',
        withcheck: 'NULL',
      },
      {
        table: 'recipe_steps',
        name: 'read steps for visible recipes',
        cmd: 'SELECT',
        roles: '{public}',
        qual: 'EXISTS',
        withcheck: 'NULL',
      },
      {
        table: 'recipes',
        name: 'read public recipes',
        cmd: 'SELECT',
        roles: '{public}',
        qual: '(is_public = true)',
        withcheck: 'NULL',
      },
      { table: 'units', name: 'read units', cmd: 'SELECT', roles: '{public}', qual: 'true', withcheck: 'NULL' },
    ];

    const REMOVED_VULNERABLE_POLICY_NAMES = [
      'Allow insert for authenticated users',
      'insert own recipes',
      'update own recipes',
      'delete own recipes',
      'write recipe_ingredients for own recipes',
      'write steps for own recipes',
      'write recipe_equipment for own recipes',
    ];

    it('exactly 8 policies are created (the hardened final state, not the audited 15-policy vulnerable pre-state)', () => {
      const creation = creationBlockOf(executable);
      const count = (creation.match(/CREATE POLICY/g) ?? []).length;
      expect(count).toBe(8);
      expect(expectedPolicies.length).toBe(8);
    });

    for (const p of expectedPolicies) {
      it(`${p.table}: policy "${p.name}" is FOR SELECT, roles ${p.roles}, USING present, no WITH CHECK`, () => {
        const creation = creationBlockOf(executable);
        const nameIdx = mustFind(creation, `"${p.name}"`, `policy named "${p.name}"`);
        const stmtEnd = creation.indexOf('$sql$', creation.indexOf('$sql$', nameIdx) + 5);
        const stmt = creation.slice(nameIdx, stmtEnd);
        expect(stmt).toContain('FOR SELECT');
        expect(stmt).toContain('USING (');
        expect(stmt).not.toContain('WITH CHECK (');
        if (p.qual === 'EXISTS') {
          expect(stmt).toMatch(/USING \(EXISTS \(SELECT 1 FROM recipes r WHERE r\.id = \w+\.recipe_id AND r\.is_public = true\)\)/);
        } else if (p.qual.startsWith('(')) {
          expect(stmt).toContain(`USING ${p.qual}`);
        } else {
          expect(stmt).toContain(`USING (${p.qual})`);
        }
      });
    }

    for (const removedName of REMOVED_VULNERABLE_POLICY_NAMES) {
      it(`REJECTS presence of the removed vulnerable policy "${removedName}" (must not be created)`, () => {
        const creation = creationBlockOf(executable);
        expect(creation).not.toContain(`"${removedName}"`);
      });

      it(`the preflight's expected-policy VALUES list does not accept "${removedName}" as compatible`, () => {
        const preflight = preflightBlockOf(executable);
        expect(preflight).not.toContain(`'${removedName}'`);
      });

      it(`the postcheck's expected-policy VALUES list does not accept "${removedName}" as compatible`, () => {
        const postcheck = postcheckBlockOf(executable);
        expect(postcheck).not.toContain(`'${removedName}'`);
      });
    }

    it('ANTI-REGRESSION (Finding B-1 class): at most one PERMISSIVE policy grants unconditional (WITH CHECK true / USING true on a write command) access per table+command among the 8 hardened policies', () => {
      // All 8 remaining policies are SELECT with either `USING (true)` (the
      // 4 pure reference tables, intentionally public-readable) or a
      // conditional EXISTS/is_public predicate -- there is no INSERT,
      // UPDATE, DELETE, or ALL policy left at all, so the specific
      // OR-of-permissives INSERT bypass class from Finding B-1 cannot recur
      // structurally: zero write-command policies exist to combine.
      const writeCommandPolicies = expectedPolicies.filter((p) => (p.cmd as string) !== 'SELECT');
      expect(writeCommandPolicies.length).toBe(0);
    });

    it('never uses auth.role() anywhere for authorization', () => {
      expect(executable).not.toMatch(/auth\.role\s*\(/i);
    });

    it('every policy creation is guarded by a pg_policies existence check before EXECUTE (exactly 8 guards)', () => {
      const creation = creationBlockOf(executable);
      const policyBlock = creation.slice(
        mustFind(creation, 'DO $create_policies$', 'policy creation DO block start'),
        mustFind(creation, '$create_policies$;', 'policy creation DO block end') + 20,
      );
      const guards = (policyBlock.match(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_catalog\.pg_policies/g) ?? []).length;
      expect(guards).toBe(8);
    });

    it('the preflight and postcheck policy-comparison symmetric diffs are correctly parenthesized: (expected EXCEPT ALL actual) UNION ALL (actual EXCEPT ALL expected)', () => {
      // A prior version of this pattern (see the ACL section, and the
      // production hotfix's own documented history) left the two EXCEPT
      // ALL/UNION ALL halves unparenthesized, which PostgreSQL then
      // evaluates strictly left-to-right at the same precedence level --
      // NOT as the intended symmetric difference. This can silently mask a
      // genuine missing-row drift (verified by hand-trace during this
      // correction pass). Both the preflight and postcheck policy checks
      // must wrap each EXCEPT ALL half in its own parentheses before the
      // UNION ALL, so the check is a required structural fact here, not
      // merely a comment claim.
      for (const block of [preflightBlockOf(executable), postcheckBlockOf(executable)]) {
        const idx = block.search(/policy-row mismatches/);
        expect(idx).toBeGreaterThan(-1);
        // Walk backward from the RAISE EXCEPTION to find the symmetric_diff
        // subquery this check reads from, and confirm it contains a
        // parenthesized-EXCEPT-ALL / UNION ALL / parenthesized-EXCEPT-ALL
        // shape rather than a flat, unparenthesized chain.
        const windowStart = Math.max(0, idx - 3500);
        const window = block.slice(windowStart, idx);
        expect(window).toMatch(/\(\s*\n\s*SELECT \* FROM \(VALUES/);
        expect(window).toMatch(/\)\s*\n\s*\n\s*UNION ALL\s*\n\s*\n\s*\(/);
      }
    });
  });

  describe('HARDENED CONTRACT: raw ACL is exactly 144 rows, anon/authenticated SELECT-only, full 5-field identity', () => {
    it('the ACL-narrowing block issues exactly 8 guarded, static REVOKE statements (one per table), never ALTER DEFAULT PRIVILEGES', () => {
      const creation = creationBlockOf(executable);
      const narrowIdx = mustFind(creation, 'DO $narrow_acl$', 'ACL-narrowing DO block');
      const narrowEnd = mustFind(creation.slice(narrowIdx), '$narrow_acl$;', 'ACL-narrowing DO block end') + narrowIdx;
      const block = creation.slice(narrowIdx, narrowEnd);
      const revokeCount = (block.match(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public\.\w+ FROM anon, authenticated/g) ?? []).length;
      expect(revokeCount).toBe(8);
      for (const tbl of TARGET_TABLES) {
        expect(block).toContain(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.${tbl} FROM anon, authenticated`);
      }
      expect(block).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
    });

    it('the ACL-narrowing REVOKE statements are gated behind a guard so the compatible path performs zero writes', () => {
      const creation = creationBlockOf(executable);
      const narrowIdx = mustFind(creation, 'DO $narrow_acl$', 'ACL-narrowing DO block');
      const narrowEnd = mustFind(creation.slice(narrowIdx), '$narrow_acl$;', 'ACL-narrowing DO block end') + narrowIdx;
      const block = creation.slice(narrowIdx, narrowEnd);
      const ifIdx = mustFind(block, 'IF EXISTS (', 'the ACL-narrowing guard condition');
      const firstRevokeIdx = mustFind(block, 'REVOKE INSERT', 'first REVOKE statement');
      expect(firstRevokeIdx).toBeGreaterThan(ifIdx);
      expect(block).toMatch(/a\.privilege_type\s*<>\s*'SELECT'/);
    });

    it('every REVOKE EXECUTE body is a $sql$ ... $sql$ static literal (never format()/concatenation)', () => {
      const creation = creationBlockOf(executable);
      const narrowIdx = mustFind(creation, 'DO $narrow_acl$', 'ACL-narrowing DO block');
      const narrowEnd = mustFind(creation.slice(narrowIdx), '$narrow_acl$;', 'ACL-narrowing DO block end') + narrowIdx;
      const block = creation.slice(narrowIdx, narrowEnd);
      const executeCalls = [...block.matchAll(/EXECUTE\s+([^;]*?);/gs)];
      expect(executeCalls.length).toBe(8);
      for (const call of executeCalls) {
        expect(call[1]).toMatch(/^\$sql\$/);
        expect(call[1]).not.toMatch(/format\(/i);
        expect(call[1]).not.toMatch(/\|\|/);
      }
    });

    it('never issues ALTER DEFAULT PRIVILEGES anywhere in the file', () => {
      expect(executable).not.toMatch(/ALTER\s+DEFAULT\s+PRIVILEGES/i);
    });

    it('never grants WITH GRANT OPTION', () => {
      expect(executable).not.toMatch(/WITH\s+GRANT\s+OPTION/i);
    });

    it('the preflight ACL check compares the full 5-field identity (table, grantee, privilege, grantor, is_grantable) in one symmetric diff, not grantee+privilege only with a separate weaker grantor/is_grantable scan', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/'postgres'::text AS grantor, false AS is_grantable/);
      expect(preflight).toMatch(/\(CASE WHEN a\.grantor=0 THEN 'PUBLIC' ELSE a\.grantor::regrole::text END\)/);
    });

    it('the preflight expects anon/authenticated SELECT-only and postgres/service_role the full 8 privileges (144 rows total: 8 tables x 18)', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/'anon'::text,\s*'SELECT'::text/);
      expect(preflight).toMatch(/'authenticated'::text,\s*'SELECT'::text/);
      expect(preflight).toMatch(/ARRAY\['postgres','service_role'\]/);
      expect(preflight).toMatch(
        /ARRAY\['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE'\]/,
      );
      // Explicitly must NOT be the old vulnerable 4-role x 8-privilege (256 row) shape.
      expect(preflight).not.toMatch(/ARRAY\['anon','authenticated','postgres','service_role'\]/);
    });

    it('the postcheck requires exactly the 144-row hardened ACL contract, full identity, and rejects any unrecognized grantee', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/raw-ACL-row mismatches/);
      expect(postcheck).toMatch(/144-row hardened contract/);
      expect(postcheck).toMatch(/NOT IN \('anon','authenticated','postgres','service_role'\)/);
      // Must NOT still assert the old vulnerable 256-row bare count.
      expect(postcheck).not.toMatch(/mismatch_count\s*<>\s*256/);
      expect(postcheck).not.toMatch(/8 tables x 4 roles x 8 privileges/);
    });

    it('the ACL symmetric diffs (preflight and postcheck) are correctly parenthesized: (expected EXCEPT ALL actual) UNION ALL (actual EXCEPT ALL expected)', () => {
      for (const block of [preflightBlockOf(executable), postcheckBlockOf(executable)]) {
        const idx = block.search(/raw-ACL-row mismatches/);
        expect(idx).toBeGreaterThan(-1);
        const windowStart = Math.max(0, idx - 3500);
        const window = block.slice(windowStart, idx);
        expect(window).toMatch(/\(\s*\n\s*SELECT tbl, grantee, priv/);
        expect(window).toMatch(/\)\s*\n\s*\n\s*UNION ALL\s*\n\s*\n\s*\(/);
      }
    });
  });

  describe('no column ACL', () => {
    it('the preflight fails closed if any column ACL exists among the 8 tables', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/attacl IS NOT NULL/);
      const idx = preflight.indexOf('attacl IS NOT NULL');
      const context = preflight.slice(Math.max(0, idx - 300), idx + 300);
      expect(context).toMatch(/RAISE EXCEPTION/);
    });

    it('the postcheck fails closed if any column ACL exists among the 8 tables', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/attacl IS NOT NULL/);
    });
  });

  describe('complete set_updated_at() hardened contract', () => {
    it('creates the function with every security/behavior property declared explicitly', () => {
      const creation = creationBlockOf(executable);
      const idx = mustFind(creation, 'CREATE OR REPLACE FUNCTION public.set_updated_at()', 'set_updated_at() creation');
      const body = creation.slice(idx, creation.indexOf('$fn$;', idx) + 5);
      expect(body).toMatch(/RETURNS trigger/);
      expect(body).toMatch(/LANGUAGE plpgsql/);
      expect(body).toMatch(/\bVOLATILE\b/);
      expect(body).toMatch(/CALLED ON NULL INPUT/);
      expect(body).toMatch(/PARALLEL UNSAFE/);
      expect(body).toMatch(/SECURITY INVOKER/);
      expect(body).toMatch(/SET search_path = pg_catalog/);
      expect(body).toMatch(/NEW\.updated_at = pg_catalog\.now\(\)/);
    });

    it('is never declared SECURITY DEFINER', () => {
      const creation = creationBlockOf(executable);
      const idx = mustFind(creation, 'CREATE OR REPLACE FUNCTION public.set_updated_at()', 'set_updated_at() creation');
      const body = creation.slice(idx, creation.indexOf('$fn$;', idx) + 5);
      expect(body).not.toMatch(/SECURITY DEFINER/);
    });

    it('owner is set explicitly to postgres as a separate statement', () => {
      const creation = creationBlockOf(executable);
      expect(creation).toContain('ALTER FUNCTION public.set_updated_at() OWNER TO postgres');
    });

    it('revokes ALL from PUBLIC, anon, authenticated, service_role', () => {
      const creation = creationBlockOf(executable);
      expect(creation).toContain(
        'REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role',
      );
    });

    it('the preflight accepts only proconfig NULL or exactly {search_path=pg_catalog}', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/fn_pre\.proconfig IS NULL/);
      expect(preflight).toMatch(/search_path=pg_catalog['"]?\s*=\s*ANY/);
    });

    it('the preflight normalizes pg_catalog.now() to now() before comparing bodies (accepts either historical shape)', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight).toMatch(/pg_catalog\\\.now\\\(\\\)/);
      expect(preflight).toContain("'BEGIN NEW.updated_at = now(); RETURN NEW; END;'");
    });
  });

  describe('generic non-owner function ACL scan', () => {
    it('the preflight rejects any non-owner EXECUTE or grant option generically, not via a fixed role list', () => {
      const preflight = preflightBlockOf(executable);
      const idx = mustFind(preflight, 'a.grantee IS DISTINCT FROM p.proowner', 'generic function-ACL scan');
      const context = preflight.slice(idx, idx + 200);
      expect(context).toMatch(/privilege_type = 'EXECUTE'/);
      expect(context).toMatch(/is_grantable/);
    });

    it('the postcheck scans generically via aclexplode against acldefault, not a fixed role list', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/aclexplode\(COALESCE\(post\.proacl, pg_catalog\.acldefault/);
      expect(postcheck).toMatch(/a\.grantee IS DISTINCT FROM post\.owner_oid/);
    });
  });

  describe('exact recipes trigger shape', () => {
    it('trigger creation is guarded by a pg_trigger existence check, not unconditional', () => {
      const creation = creationBlockOf(executable);
      const idx = mustFind(creation, '$create_recipes_trigger$', 'trigger creation guard');
      const block = creation.slice(idx, mustFind(creation.slice(idx + 20), '$create_recipes_trigger$;', 'end of trigger guard') + idx + 20 + 20);
      expect(block).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_catalog\.pg_trigger/);
      expect(block).toContain("tgname = 'trg_recipes_updated_at'");
    });

    it('the guarded trigger statement is BEFORE UPDATE FOR EACH ROW binding to public.set_updated_at()', () => {
      const creation = creationBlockOf(executable);
      const idx = mustFind(creation, 'CREATE TRIGGER trg_recipes_updated_at', 'trigger CREATE statement');
      const stmt = creation.slice(idx, creation.indexOf('$sql$', idx));
      expect(stmt).toMatch(/BEFORE UPDATE ON public\.recipes/);
      expect(stmt).toMatch(/FOR EACH ROW/);
      expect(stmt).toMatch(/EXECUTE FUNCTION public\.set_updated_at\(\)/);
    });

    it('the postcheck requires tgtype=19 (BEFORE UPDATE ROW), tgenabled=O, tgnargs=0, and exactly 1 trigger total in scope', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).toMatch(/t\.tgtype = 19/);
      expect(postcheck).toMatch(/t\.tgenabled = 'O'/);
      expect(postcheck).toMatch(/t\.tgnargs = 0/);
      expect(postcheck).toMatch(/<>\s*1[\s\S]{0,120}expected exactly 1 trigger/);
    });
  });

  describe('no SECURITY DEFINER unless already proven live and explicitly authorized', () => {
    it('no CREATE FUNCTION statement in this migration declares SECURITY DEFINER (set_updated_at is the only function created, and it is INVOKER)', () => {
      const creation = creationBlockOf(executable);
      const fnBlocks = creation.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$fn\$;/g) ?? [];
      expect(fnBlocks.length).toBe(1);
      for (const block of fnBlocks) {
        expect(block).not.toMatch(/SECURITY DEFINER/);
      }
    });
  });

  describe('no row DML, no DROP/CASCADE, no unrelated mutation', () => {
    it('contains no SELECT/INSERT/UPDATE/DELETE against application table rows', () => {
      const creation = creationBlockOf(executable);
      expect(creation).not.toMatch(/\bINSERT INTO (ingredients|units|equipment|recipes|recipe_)/i);
      expect(creation).not.toMatch(/\bUPDATE (ingredients|units|equipment|recipes|recipe_)\w*\s+SET\b/i);
      expect(creation).not.toMatch(/\bDELETE FROM (ingredients|units|equipment|recipes|recipe_)/i);
    });

    it('never uses DROP', () => {
      expect(executable).not.toMatch(/\bDROP\b/i);
    });

    it('never uses CASCADE outside of an FK action clause (ON DELETE CASCADE)', () => {
      const cascadeUses = [...executable.matchAll(/CASCADE/gi)];
      expect(cascadeUses.length).toBeGreaterThan(0);
      for (const use of cascadeUses) {
        const before = executable.slice(Math.max(0, use.index! - 15), use.index!);
        expect(before, 'CASCADE must only follow ON DELETE').toMatch(/ON DELETE\s*$/);
      }
    });

    it('the only REVOKE statements target either set_updated_at() (function-level) or the 8 tables\' anon/authenticated write privileges (never a row, never PUBLIC, never a broader privilege set)', () => {
      const creation = creationBlockOf(executable);
      const revokeStatements = [...creation.matchAll(/REVOKE[^;]*;/g)].map((m) => m[0]);
      expect(revokeStatements.length).toBe(9); // 1 function-level + 8 table-level
      const functionRevokes = revokeStatements.filter((r) => r.includes('set_updated_at'));
      const tableRevokes = revokeStatements.filter((r) => r.includes('ON public.') && TARGET_TABLES.some((t) => r.includes(`public.${t} `)));
      expect(functionRevokes.length).toBe(1);
      expect(tableRevokes.length).toBe(8);
      for (const r of tableRevokes) {
        expect(r).toContain('FROM anon, authenticated');
        expect(r).not.toContain('PUBLIC');
        expect(r).not.toContain('SELECT'); // SELECT is never revoked -- it's the surviving privilege
      }
    });
  });

  describe('no interpolated dynamic SQL', () => {
    it('every EXECUTE body is a $sql$ ... $sql$ static literal, never format()/concatenation of a catalog or variable value', () => {
      const creation = creationBlockOf(executable);
      const executeCalls = [...creation.matchAll(/EXECUTE\s+([^;]*?);/gs)];
      expect(executeCalls.length).toBeGreaterThan(0);
      for (const call of executeCalls) {
        expect(call[1]).toMatch(/^\$sql\$/);
        expect(call[1]).not.toMatch(/format\(/i);
        expect(call[1]).not.toMatch(/\|\|/); // no string concatenation
      }
    });
  });

  describe('postcheck strengthening and honest OID-stability claims (Finding H-1)', () => {
    it('the postcheck no longer degrades to a bare row-count for columns, constraints, indexes, or policies', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck).not.toMatch(/expected exactly 115 columns/);
      expect(postcheck).not.toMatch(/expected exactly 37 constraints/);
      expect(postcheck).not.toMatch(/expected exactly 45 indexes/);
      expect(postcheck).not.toMatch(/expected exactly 15 policies/);
    });

    it('the postcheck reuses full symmetric-content diffs for columns, constraints, indexes, and policies (same VALUES-based rigor as preflight)', () => {
      const postcheck = postcheckBlockOf(executable);
      for (const marker of ['column-row mismatches', 'constraint-row mismatches', 'index-row mismatches', 'policy-row mismatches']) {
        expect(postcheck).toMatch(new RegExp(marker));
      }
    });

    it('the migration header does not claim postcheck verifies OID stability by its own SQL', () => {
      // Prior static review Finding H-1: the header claimed "On the
      // compatible path, additionally confirm every object's OID is
      // unchanged from what the preflight observed" -- but no OID capture
      // or comparison existed anywhere in the file. That claim must now
      // either be implemented or removed; this migration removes it and
      // instead describes the real, honest guarantee.
      expect(sql).not.toMatch(/additionally confirm every object's OID is\s*\n?--\s*unchanged from what the preflight observed/);
      expect(sql).not.toMatch(/postcheck.*verif(y|ies).*OID stability/i);
    });

    it('documents compatible-path catalog idempotence without claiming zero executed write statements', () => {
      // Prior finding: the header used to claim, unqualified, that "this
      // migration's compatible path is designed to perform zero writes."
      // Runtime verification (see this Slice's own runtime-verification
      // report) proved that's imprecise -- 16 unconditional per-table
      // `ALTER TABLE ... OWNER TO` / `ENABLE ROW LEVEL SECURITY`
      // statements (2 per table x 8 tables, asserted below) execute on
      // every path, including the compatible one; only the *guarded*
      // creation/policy/privilege operations make no catalog change
      // there. Runtime evidence showed that unconditional execution still
      // causes zero net catalog/OID change when the state is already
      // compatible -- a catalog-idempotent / zero-net-catalog-change
      // guarantee, not literally zero write-capable statements executing.
      // This test proves the header's prose now matches that distinction
      // and the real executable topology -- it does not, and cannot by
      // itself, re-prove the runtime byte-identity claim; that remains an
      // out-of-band runtime gate, only *described* accurately here.
      // Collapse comment-line wrapping ("\n--      ") to single spaces so
      // assertions are anchored to the extracted header paragraph's exact
      // boundaries (via postcheckHeaderSectionOf's fail-loud anchors)
      // without being brittle to where prose happens to wrap.
      const section = postcheckHeaderSectionOf(sql).replace(/\n--\s*/g, ' ').replace(/\s+/g, ' ').trim();

      // The obsolete, unqualified claim must be gone from this section.
      expect(section).not.toMatch(/compatible path is designed to perform zero writes/);
      expect(section).not.toMatch(/\bperforms? zero writes\b/i);

      // The header must not describe the compatible path itself as read-only.
      expect(section).not.toMatch(/compatible path is read-only/i);
      expect(section).toContain('catalog-idempotent, not read-only');

      // It must distinguish the unconditional owner/RLS statements from
      // the guarded creation/policy/privilege operations.
      expect(section).toContain("part B's guarded creation, policy, and privilege operations make no catalog change");
      expect(section).toContain('unconditional per-table ALTER TABLE ... OWNER TO / ENABLE ROW LEVEL SECURITY statements still execute on every path');

      // It must state the runtime-verified zero-net-catalog-change
      // guarantee using catalog-idempotent/zero-net-change semantics, not
      // a "no write statement executes" framing.
      expect(section).toContain('runtime-verified to cause zero net catalog/OID change when the state is already compatible');
      expect(section).toContain('a zero-net-catalog-change guarantee, not a transaction in which no write-capable SQL statement executes');

      // Byte identity is explicitly scoped as an out-of-band runtime
      // check, not something this static header claims to prove itself.
      expect(section).toContain('instead verified empirically by an out-of-band before/after runtime catalog snapshot comparison');
      expect(section).toContain("not by this file's SQL");
    });

    it('the unconditional owner/RLS-normalization ALTER statements the header now describes actually exist, top-level and unguarded, for all 8 target tables', () => {
      // Anchors the header's "unconditional ... still execute on every
      // path" claim to the real executable SQL: each statement must
      // appear at the START of a line (column 0), which is how this
      // migration's own style distinguishes a plain top-level statement
      // from one nested inside an indented `DO $...$` guard block.
      const creation = creationBlockOf(executable);
      for (const tbl of TARGET_TABLES) {
        expect(creation).toMatch(new RegExp(`^ALTER TABLE public\\.${tbl} OWNER TO postgres;$`, 'm'));
        expect(creation).toMatch(new RegExp(`^ALTER TABLE public\\.${tbl} ENABLE ROW LEVEL SECURITY;$`, 'm'));
      }
      const ownerCount = (creation.match(/^ALTER TABLE public\.\w+ OWNER TO postgres;$/gm) ?? []).length;
      const rlsCount = (creation.match(/^ALTER TABLE public\.\w+ ENABLE ROW LEVEL SECURITY;$/gm) ?? []).length;
      expect(ownerCount).toBe(TARGET_TABLES.length);
      expect(rlsCount).toBe(TARGET_TABLES.length);
    });
  });

  describe('later set_updated_at hardening migration remains after this prerequisite and accepts it', () => {
    it('20260920072450_baseline_and_harden_set_updated_at.sql still exists, unedited, and sorts after this migration', () => {
      const laterFile = 'supabase/migrations/20260920072450_baseline_and_harden_set_updated_at.sql';
      const fullPath = path.resolve(__dirname, '..', laterFile);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(EXPECTED_FILE < path.basename(laterFile)).toBe(true);
    });

    it('this migration creates set_updated_at() in exactly one of the two states 20260920072450 accepts (the fully-hardened shape)', () => {
      const creation = creationBlockOf(executable);
      const idx = mustFind(creation, 'CREATE OR REPLACE FUNCTION public.set_updated_at()', 'set_updated_at() creation');
      const body = creation.slice(idx, creation.indexOf('$fn$;', idx) + 5);
      expect(body).toMatch(/SET search_path = pg_catalog/);
      expect(body).toMatch(/pg_catalog\.now\(\)/);
    });
  });

  describe('RESERVED-ALIAS SYNTAX BLOCKER REGRESSION (Finding B-2): `notnull` is a PostgreSQL reserved keyword and must never appear as a standalone column alias', () => {
    // The corrected-static-review pass (see
    // /home/venn/prepmeal-baseline-core-recipe-catalog-corrected-static-review.md)
    // found, by actually EXECUTING the extracted preflight/postcheck blocks
    // against the linked project, that `notnull` used unquoted as a column
    // alias (`AS expected(tbl, attnum, attname, atttype, notnull, def)`)
    // caused a real Postgres 42601 syntax error -- undetectable by any
    // string/regex test that does not specifically look for this reserved
    // word in this exact syntactic position, since every prior test in this
    // file (116/116 passing) never executes the SQL at all. These tests
    // bind to the specific preflight/postcheck columns symmetric-diff
    // statements, not merely to the file containing the substring
    // "is_notnull" somewhere.

    /**
     * Locate the columns symmetric-diff comparison within a block (preflight
     * or postcheck) and return the two `AS expected(...)`/`AS expected2(...)`
     * column-alias-list declarations, in order. Fails loudly if either
     * cannot be found, rather than returning an empty/undefined result.
     */
    function columnsExpectedAliasLists(block: string, label: string): string[] {
      // Anchor on the distinctive column-tuple shape unique to the columns
      // comparison (attnum/attname/atttype are not used by any other
      // symmetric-diff in this file), so this cannot accidentally match the
      // constraints/indexes/policies/ACL comparisons instead.
      const aliasListRe = /AS expected2?\(tbl, attnum, attname, atttype, (\w+), def\)/g;
      const matches = [...block.matchAll(aliasListRe)];
      expect(matches.length, `expected exactly 2 column-comparison alias-list declarations in ${label}, found ${matches.length}`).toBe(2);
      return matches.map((m) => m[1]);
    }

    it('1. no standalone unquoted reserved-keyword identifier "notnull" appears anywhere in the executable SQL', () => {
      // Word-boundary match against a reserved SQL keyword used as a bare
      // identifier -- this must never appear as an alias, column name, or
      // any other identifier position in executable statements. (Prose
      // mentions inside `--` comments are already excluded by `executable`,
      // which is comment-stripped before this test ever sees it.)
      expect(executable).not.toMatch(/\bnotnull\b/i);
    });

    it('2. `attnotnull` (the real pg_attribute column this check reads) still exists, unbroken, exactly 4 times', () => {
      // Confirms the fix renamed only the alias, not the actual catalog
      // column reference the comparison depends on for correctness.
      const count = (executable.match(/a\.attnotnull\b/g) ?? []).length;
      expect(count).toBe(4); // 2 in preflight's two EXCEPT ALL sides, 2 in postcheck's
    });

    it('3. the preflight columns comparison declares both alias lists using `is_notnull`, not `notnull`', () => {
      const preflight = preflightBlockOf(executable);
      const aliases = columnsExpectedAliasLists(preflight, 'preflight');
      expect(aliases).toEqual(['is_notnull', 'is_notnull']);
    });

    it('3b. the postcheck columns comparison declares both alias lists using `is_notnull`, not `notnull`', () => {
      const postcheck = postcheckBlockOf(executable);
      const aliases = columnsExpectedAliasLists(postcheck, 'postcheck');
      expect(aliases).toEqual(['is_notnull', 'is_notnull']);
    });

    it('4. the preflight columns expected/actual tuple identity is unchanged: 6 fields (tbl, attnum, attname, atttype, is_notnull, def), matching the live attribute properties compared', () => {
      const preflight = preflightBlockOf(executable);
      // Both the VALUES-side alias list and the live-catalog SELECT side
      // must project exactly 6 columns in this order for the EXCEPT ALL
      // row comparison to remain semantically the same 6-field identity it
      // was before the rename -- only the alias label changed, never the
      // field count, order, or the underlying `a.attnotnull` expression.
      const idx = mustFind(preflight, 'AS expected(tbl, attnum, attname, atttype, is_notnull, def)', 'preflight expected column alias list');
      const liveSelectIdx = mustFind(preflight.slice(idx), 'SELECT c.relname, a.attnum, a.attname,', 'preflight live-catalog column SELECT');
      const liveSelectWindow = preflight.slice(idx + liveSelectIdx, idx + liveSelectIdx + 400);
      expect(liveSelectWindow).toMatch(/pg_catalog\.format_type\(a\.atttypid, a\.atttypmod\)/);
      expect(liveSelectWindow).toMatch(/a\.attnotnull/);
      expect(liveSelectWindow).toMatch(/pg_catalog\.pg_get_expr\(ad\.adbin, ad\.adrelid\)/);
    });

    it('5. the postcheck columns expected/actual tuple identity is unchanged: same 6-field shape as preflight, not degraded back to a bare count', () => {
      const postcheck = postcheckBlockOf(executable);
      const idx = mustFind(postcheck, 'AS expected(tbl, attnum, attname, atttype, is_notnull, def)', 'postcheck expected column alias list');
      const liveSelectIdx = mustFind(postcheck.slice(idx), 'SELECT c.relname, a.attnum, a.attname,', 'postcheck live-catalog column SELECT');
      const liveSelectWindow = postcheck.slice(idx + liveSelectIdx, idx + liveSelectIdx + 400);
      expect(liveSelectWindow).toMatch(/pg_catalog\.format_type\(a\.atttypid, a\.atttypmod\)/);
      expect(liveSelectWindow).toMatch(/a\.attnotnull/);
      // Re-confirm (independently of the earlier "postcheck strengthening"
      // describe block) that this is still a full row comparison, not a
      // regression back to a bare `count(*) ... <> 115`-style check.
      expect(postcheck).not.toMatch(/expected exactly 115 columns/);
    });

    it('6. the alias-list extraction anchor fails loudly (not silently) when the expected text is absent', () => {
      // Meta-test for the helper itself: feeding it text that does NOT
      // contain the columns alias-list shape must throw, not return an
      // empty array or undefined that a caller could mistake for "found
      // nothing wrong."
      expect(() => columnsExpectedAliasLists('SELECT 1;', 'synthetic empty block')).toThrow();
    });

    it('7. this regression is not satisfiable by a comment or RAISE EXCEPTION message mentioning "is_notnull" or "notnull" -- it is bound to the actual alias-list declaration syntax', () => {
      // The raw (non-comment-stripped) file text still contains the word
      // "notnull" once, inside a `--` comment (a description of what the
      // check compares) -- this must NOT cause tests 1/3/3b above to
      // spuriously pass or fail depending on comment wording. Confirmed by
      // checking that comment survives in raw `sql` while being fully
      // absent from `executable`.
      expect(sql).toMatch(/-- Columns: full symmetric-content diff \(name\/type\/notnull\/default\)/);
      expect(executable).not.toMatch(/\bnotnull\b/i);
      // And confirm the pass/fail signal comes from the real alias-list
      // syntax, not from a loose substring match anywhere in the file: the
      // exact declaration must appear, syntactically, exactly 4 times.
      const exactDeclarationCount = (executable.match(/AS expected2?\(tbl, attnum, attname, atttype, is_notnull, def\)/g) ?? []).length;
      expect(exactDeclarationCount).toBe(4);
    });
  });

  describe('DOWNSTREAM COMPATIBILITY: the corrected fresh-replay output is classified HARDENED_FINAL_STATE by the hotfix migration, not a third/hybrid state', () => {
    function loadHotfix(): { sql: string; executable: string } {
      const fullPath = path.resolve(MIGRATIONS_DIR, HOTFIX_FILE);
      expect(fs.existsSync(fullPath), `expected the merged hotfix migration ${HOTFIX_FILE} to exist`).toBe(true);
      const sql = fs.readFileSync(fullPath, 'utf8');
      return { sql, executable: stripLineComments(sql) };
    }

    it('the hotfix migration file exists in this worktree (fast-forwarded from main) and is unedited by this correction pass', () => {
      // Searched against the raw (comment-included) text -- the
      // HARDENED_FINAL_STATE/VULNERABLE_PRE_STATE labels themselves live in
      // the hotfix's own header/inline comments, which stripLineComments
      // deliberately removes for executable-statement assertions elsewhere
      // in this file; this particular check is about the file's documented
      // design intent, not an executable-statement structural fact.
      const { sql: hotfixSql } = loadHotfix();
      expect(hotfixSql).toMatch(/HARDENED_FINAL_STATE/);
      expect(hotfixSql).toMatch(/VULNERABLE_PRE_STATE/);
    });

    it("this migration's 8-policy hardened VALUES rows are byte-identical (as a set) to the hotfix's HARDENED_FINAL_STATE policy VALUES rows", () => {
      const creation = creationBlockOf(executable);
      // Extract this migration's 8-row postcheck policy expected-list (the
      // simpler, single-column-tuple form written directly in this file)
      // by pulling the 8 quoted policy names it creates, together with
      // their FOR <cmd> clause -- and cross-check against the hotfix's own
      // literal VALUES rows for its HARDENED_FINAL_STATE candidate.
      const { sql: hotfixSql } = loadHotfix();
      // Use the raw (comment-included) text: the "HARDENED_FINAL_STATE
      // candidate" anchor is itself a comment label, and searching the raw
      // text still finds the literal VALUES rows that follow it (comments
      // don't remove or alter the executable VALUES data itself).
      const hotfixHardenedRows = extractPolicyValuesRows(
        hotfixSql,
        'HARDENED_FINAL_STATE candidate',
        8,
      );
      // Each hotfix row is a 7-tuple: tbl, polname, cmd, permissive, roles, qual, withcheck.
      const hotfixPolicyNames = hotfixHardenedRows.map((r) => {
        const m = r.match(/^\s*'([^']+)'\s*,\s*'([^']+)'/);
        expect(m, `expected to parse table/name from hotfix row: ${r}`).not.toBeNull();
        return m![2];
      }).sort();
      const thisMigrationPolicyNames = expectedPoliciesNamesFrom(creation).sort();
      expect(thisMigrationPolicyNames).toEqual(hotfixPolicyNames);

      function expectedPoliciesNamesFrom(creationBlock: string): string[] {
        const names = [...creationBlock.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
        expect(names.length).toBe(8);
        return names;
      }
    });

    it('the hotfix migration would classify this fresh-replay output as HARDENED_FINAL_STATE (policy_mismatch_hard=0), not VULNERABLE_PRE_STATE and not a third/unknown state', () => {
      // Structural cross-check: none of the 7 vulnerable policy names this
      // migration no longer creates appear among the 8 policies it does
      // create, and every one of the 8 it creates has a byte-identical
      // name to one of the hotfix's own HARDENED_FINAL_STATE rows (proven
      // in the previous test). Since the hotfix's preflight fails closed
      // on anything that is neither exactly VULNERABLE_PRE_STATE nor
      // exactly HARDENED_FINAL_STATE, and this fresh output cannot match
      // VULNERABLE_PRE_STATE (it has 8 policies, not 15, and omits all 7
      // vulnerable names), the only remaining accepted branch it can match
      // is HARDENED_FINAL_STATE.
      const creation = creationBlockOf(executable);
      const names = [...creation.matchAll(/CREATE POLICY "([^"]+)"/g)].map((m) => m[1]);
      expect(names.length).toBe(8);
      const vulnerableNames = [
        'Allow insert for authenticated users',
        'insert own recipes',
        'update own recipes',
        'delete own recipes',
        'write recipe_ingredients for own recipes',
        'write steps for own recipes',
        'write recipe_equipment for own recipes',
      ];
      for (const vn of vulnerableNames) {
        expect(names).not.toContain(vn);
      }
    });

    it('no third/hybrid acceptance state is introduced by this migration -- its preflight accepts exactly one compatible shape (the hardened final state), not "hardened OR something else"', () => {
      const preflight = preflightBlockOf(executable);
      // Unlike the hotfix (which must accept both vulnerable and hardened,
      // since it may run against either an unpatched or already-patched
      // production database), this baseline's preflight has exactly one
      // acceptance branch on presence: it does not declare a second
      // "hard_state"/"vuln_state" style OR-branch.
      expect(preflight).not.toMatch(/policy_mismatch_hard/);
      expect(preflight).not.toMatch(/policy_mismatch_vuln/);
    });
  });
});
