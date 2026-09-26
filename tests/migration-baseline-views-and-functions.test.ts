import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Contract tests for supabase/migrations/20260904080000_baseline_views_and_functions.sql
//
// There is no Postgres available to the test runner, so these assert the
// STRUCTURE of the migration SQL via string/regex matching against the
// comment-stripped text -- not a real SQL parse, mirroring
// tests/migration-baseline-user-plans-schema.test.ts's own established
// convention exactly (which itself mirrors Slice 1's convention).
//
// MIGRATIONS_DIR/TESTS_DIR can be overridden via
// MIGRATION_MUTATION_TEST_MIGRATIONS_DIR for scratch mutation-resistance
// testing (see /home/venn/prepmeal-baseline-views-functions-implementation.md,
// outside this repo, for the mutation matrix run against scratch copies
// under /tmp, never inside this or the main worktree).

const MIGRATIONS_DIR =
  process.env.MIGRATION_MUTATION_TEST_MIGRATIONS_DIR ?? path.resolve(__dirname, '../supabase/migrations');
const SUFFIX = '_baseline_views_and_functions.sql';
const EXPECTED_VERSION = '20260904080000';
const EXPECTED_FILE = `${EXPECTED_VERSION}${SUFFIX}`;
const SLICE1_FILE = '20260904060000_baseline_core_recipe_catalog_schema.sql';
const SLICE1_SHA256 = '8c8ebf9a0007a4d70d174902e2044fd753b8661b70852c7a380ca888de666fb6';
const SLICE2_FILE = '20260904070000_baseline_user_plans_schema.sql';
const SLICE2_SHA256 = 'b4f5925e56f690c1281cce9faae179a15bcbab4a70fb4771191c71c563857c4e';
const FIRST_LATER_MIGRATION = '20260905034023_get_recipe_list_with_detail_json.sql';
const HARDEN_ADMIN_RPCS_FILE = '20260909061735_harden_admin_rpcs_and_plan_views.sql';
const RECONCILE_ADMIN_RPC_FILE = '20260910060642_reconcile_admin_recipe_rpc_contract.sql';

const VIEW_NAMES = ['v_menu_plan_shopping_list', 'vw_menu_plan_grocery_items'].sort();
const FUNCTION_NAMES = [
  'get_recipe_detail_json',
  'admin_create_recipe_atomic',
  'admin_update_recipe_atomic',
  'admin_delete_recipe_atomic',
].sort();

// Independent ground truth -- hardcoded from the live-capture audit reports
// (/home/venn/prepmeal-baseline-views-functions-final-design.md,
// /home/venn/prepmeal-baseline-slice3-admin-rpc-gap-closure.md), NOT
// derived from the migration file under test.
const GROUND_TRUTH_FUNCTIONDEF_SHA256: Record<string, string> = {
  get_recipe_detail_json: '240402a1aa6a37995bea2d395fb11b80b2d6e3a6177b1dc06c572ebd46707b5a',
  admin_create_recipe_atomic: 'c3cc040daf6aa152bf9f186970fdc3b8a995f2dac1b240954c358f4b08ff35a3',
  admin_update_recipe_atomic: 'c19b58dfd0134ec86d8a45f47a534fc6b915ab8c943d84e7c33297b514f55718',
  admin_delete_recipe_atomic: 'ed630ed3e41fcd6d4bfff013d161e00b00558e6fa62406b01b1848619abe5572',
};
// Independent ground truth for each view's SELECT body -- hardcoded from
// the live-capture audit (not derived from the migration under test), used
// to detect any definition drift a hash-only check would not localize.
const GROUND_TRUTH_VIEW_BODY: Record<string, string> = {
  v_menu_plan_shopping_list: `SELECT mpi.menu_plan_id,
          i.id AS ingredient_id,
          i.name AS ingredient_name,
          i.shopping_category,
          u.code AS unit_code,
          sum(ri.quantity * mpi.servings) AS total_quantity
         FROM menu_plan_items mpi
           JOIN recipe_ingredients ri ON ri.recipe_id = mpi.recipe_id
           JOIN ingredients i ON i.id = ri.ingredient_id
           JOIN units u ON u.id = ri.unit_id
        GROUP BY mpi.menu_plan_id, i.id, i.name, i.shopping_category, u.code`,
  vw_menu_plan_grocery_items: `SELECT mpi.menu_plan_id,
          ri.ingredient_id,
          ing.name AS ingredient_name,
          u.unit_type,
              CASE u.unit_type
                  WHEN 'mass'::text THEN 'g'::text
                  WHEN 'volume'::text THEN 'ml'::text
                  WHEN 'count'::text THEN 'pc'::text
                  ELSE NULL::text
              END AS base_unit_code,
          sum(ri.quantity * (mpi.servings / NULLIF(r.base_servings, 0)::numeric) * u.to_base) AS total_base_quantity
         FROM menu_plan_items mpi
           JOIN recipes r ON r.id = mpi.recipe_id
           JOIN recipe_ingredients ri ON ri.recipe_id = r.id
           JOIN ingredients ing ON ing.id = ri.ingredient_id
           JOIN units u ON u.id = ri.unit_id
        WHERE ri.is_optional = false
        GROUP BY mpi.menu_plan_id, ri.ingredient_id, ing.name, u.unit_type`,
};
const GROUND_TRUTH_VIEW_HASH: Record<string, string> = {
  v_menu_plan_shopping_list: '77fbadb6b924518e628382bba5aaee03c00e5d8bf542c0cb4be3b89e48102558',
  vw_menu_plan_grocery_items: '1bb9715f2a9d0d5b4615bdf2c52c0ac5e51ef90c56f7cea0676bd49f71daa261',
};
// Independent ground truth: the exact `pg_get_viewdef(oid, true)` text as
// captured live (prepmeal-baseline-views-functions-final-design.md Section
// 1a; independently re-confirmed via this worktree's own static-review
// Step 3 fresh capture). NOTE this uses PostgreSQL's OWN canonical
// indentation (a compact, fixed re-print), which is NOT the same
// whitespace as the migration's own hand-authored CREATE VIEW indentation
// (GROUND_TRUTH_VIEW_BODY, above, intentionally matches the migration's
// own formatting for its own byte-exact test). The two are semantically
// identical but differ in incidental whitespace -- this is documented,
// observed PostgreSQL view-definition re-printing behavior, not a drift.
const GROUND_TRUTH_VIEWDEF_TEXT: Record<string, string> = {
  v_menu_plan_shopping_list:
    " SELECT mpi.menu_plan_id,\n    i.id AS ingredient_id,\n    i.name AS ingredient_name,\n    i.shopping_category,\n    u.code AS unit_code,\n    sum(ri.quantity * mpi.servings) AS total_quantity\n   FROM menu_plan_items mpi\n     JOIN recipe_ingredients ri ON ri.recipe_id = mpi.recipe_id\n     JOIN ingredients i ON i.id = ri.ingredient_id\n     JOIN units u ON u.id = ri.unit_id\n  GROUP BY mpi.menu_plan_id, i.id, i.name, i.shopping_category, u.code;",
  vw_menu_plan_grocery_items:
    " SELECT mpi.menu_plan_id,\n    ri.ingredient_id,\n    ing.name AS ingredient_name,\n    u.unit_type,\n        CASE u.unit_type\n            WHEN 'mass'::text THEN 'g'::text\n            WHEN 'volume'::text THEN 'ml'::text\n            WHEN 'count'::text THEN 'pc'::text\n            ELSE NULL::text\n        END AS base_unit_code,\n    sum(ri.quantity * (mpi.servings / NULLIF(r.base_servings, 0)::numeric) * u.to_base) AS total_base_quantity\n   FROM menu_plan_items mpi\n     JOIN recipes r ON r.id = mpi.recipe_id\n     JOIN recipe_ingredients ri ON ri.recipe_id = r.id\n     JOIN ingredients ing ON ing.id = ri.ingredient_id\n     JOIN units u ON u.id = ri.unit_id\n  WHERE ri.is_optional = false\n  GROUP BY mpi.menu_plan_id, ri.ingredient_id, ing.name, u.unit_type;",
};
const GROUND_TRUTH_SECURITY: Record<string, 'DEFINER' | 'INVOKER'> = {
  get_recipe_detail_json: 'DEFINER',
  admin_create_recipe_atomic: 'INVOKER',
  admin_update_recipe_atomic: 'INVOKER',
  admin_delete_recipe_atomic: 'INVOKER',
};
const GROUND_TRUTH_SEARCH_PATH: Record<string, string> = {
  get_recipe_detail_json: "SET search_path TO 'public'",
  admin_create_recipe_atomic: "SET search_path TO 'pg_catalog', 'public', 'pg_temp'",
  admin_update_recipe_atomic: "SET search_path TO 'pg_catalog', 'public', 'pg_temp'",
  admin_delete_recipe_atomic: "SET search_path TO 'pg_catalog', 'public', 'pg_temp'",
};
// Independent ground-truth identity-argument strings, character-for-character
// cross-checked against 20260910060642's own k_create_canon/k_update_canon
// constants at implementation time.
const GROUND_TRUTH_IDENTITY_ARGS: Record<string, string> = {
  get_recipe_detail_json: 'p_id_or_slug text',
  admin_create_recipe_atomic:
    'p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text, p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer, p_base_servings integer, p_image_url text, p_calories_per_serving numeric, p_is_public boolean, p_method text, p_speed text, p_servings_unit text, p_meal_role text, p_is_complete_meal boolean, p_primary_protein text, p_budget_level text, p_reuse_group text, p_ingredients jsonb, p_steps jsonb',
  admin_update_recipe_atomic:
    'p_recipe_id uuid, p_name text, p_slug text, p_description text, p_cuisine text, p_dish_type text, p_difficulty text, p_prep_time_minutes integer, p_cook_time_minutes integer, p_base_servings integer, p_image_url text, p_calories_per_serving numeric, p_is_public boolean, p_method text, p_speed text, p_servings_unit text, p_meal_role text, p_is_complete_meal boolean, p_primary_protein text, p_budget_level text, p_reuse_group text, p_ingredients jsonb, p_steps jsonb',
  admin_delete_recipe_atomic: 'p_recipe_id uuid',
};

// Independent ground truth for volatility/strictness/parallel-safety/
// leakproof-ness, sourced from three independent live-capture sessions
// (prepmeal-baseline-slice3-admin-rpc-gap-closure.md Section 1,
// prepmeal-baseline-slices2-3-implementation-readiness.md Step 8, and this
// worktree's own static-review Step 3 fresh pg_proc capture), all in
// agreement: every one of the 4 functions is VOLATILE (not IMMUTABLE/
// STABLE), not STRICT (CALLED ON NULL INPUT), PARALLEL UNSAFE, and NOT
// LEAKPROOF. None of the 4 CREATE FUNCTION statements in the migration
// declares any of these clauses explicitly -- correctness therefore
// depends on PostgreSQL's own documented, version-stable CREATE FUNCTION
// defaults (VOLATILE / CALLED ON NULL INPUT / PARALLEL UNSAFE / NOT
// LEAKPROOF when omitted), which deriveFunctionAttributes() below maps
// explicitly rather than assuming.
const GROUND_TRUTH_VOLATILITY: Record<string, 'VOLATILE' | 'STABLE' | 'IMMUTABLE'> = {
  get_recipe_detail_json: 'VOLATILE',
  admin_create_recipe_atomic: 'VOLATILE',
  admin_update_recipe_atomic: 'VOLATILE',
  admin_delete_recipe_atomic: 'VOLATILE',
};
const GROUND_TRUTH_STRICT: Record<string, boolean> = {
  get_recipe_detail_json: false,
  admin_create_recipe_atomic: false,
  admin_update_recipe_atomic: false,
  admin_delete_recipe_atomic: false,
};
const GROUND_TRUTH_PARALLEL: Record<string, 'UNSAFE' | 'RESTRICTED' | 'SAFE'> = {
  get_recipe_detail_json: 'UNSAFE',
  admin_create_recipe_atomic: 'UNSAFE',
  admin_update_recipe_atomic: 'UNSAFE',
  admin_delete_recipe_atomic: 'UNSAFE',
};
const GROUND_TRUTH_LEAKPROOF: Record<string, boolean> = {
  get_recipe_detail_json: false,
  admin_create_recipe_atomic: false,
  admin_update_recipe_atomic: false,
  admin_delete_recipe_atomic: false,
};

// Independent ground truth: the complete, verbatim `pg_get_functiondef(oid)`
// text captured live at implementation time (see
// /tmp/prepmeal-slice3-implementation-20260925T055528Z/q07_functiondef_full_result.json,
// captured 2026-09-25T05:57Z, BEFORE the migration file was assembled at
// 06:10Z -- genuinely independent of the migration under test). Its own
// SHA-256 was independently re-verified this task to equal
// GROUND_TRUTH_FUNCTIONDEF_SHA256 exactly, confirming that constant's
// provenance. Used below only to prove the reconstruction/canonicalization
// function is itself correct (byte-exact against a known-good live
// sample) -- the actual drift-detection tests reconstruct from the
// MIGRATION's own extracted pieces and compare the resulting hash against
// GROUND_TRUTH_FUNCTIONDEF_SHA256, never against this literal text.
const LIVE_CAPTURED_FUNCTIONDEF_SAMPLE: Record<string, string> = {
  get_recipe_detail_json:
    "CREATE OR REPLACE FUNCTION public.get_recipe_detail_json(p_id_or_slug text)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nDECLARE\r\n  v_result jsonb;\r\n  v_recipe_id uuid;\r\nBEGIN\r\n  -- Detect if input is UUID by pattern\r\n  IF p_id_or_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN\r\n    SELECT r.id\r\n    INTO v_recipe_id\r\n    FROM public.recipes r\r\n    WHERE r.id = p_id_or_slug::uuid\r\n      AND r.is_public = true\r\n    LIMIT 1;\r\n  ELSE\r\n    SELECT r.id\r\n    INTO v_recipe_id\r\n    FROM public.recipes r\r\n    WHERE r.slug = p_id_or_slug\r\n      AND r.is_public = true\r\n    LIMIT 1;\r\n  END IF;\r\n\r\n  IF v_recipe_id IS NULL THEN\r\n    RETURN NULL;\r\n  END IF;\r\n\r\n  SELECT jsonb_build_object(\r\n    'id', r.id,\r\n    'name', r.name,\r\n    'image_url', r.image_url,\r\n    'description', r.description,\r\n    'difficulty', r.difficulty,\r\n    'method', r.method,\r\n    'speed', r.speed,\r\n    'calories_per_serving', r.calories_per_serving,\r\n    'protein_g', r.protein_g,\r\n    'carbs_g', r.carbs_g,\r\n    'fat_g', r.fat_g,\r\n    'total_time_minutes', r.total_time_minutes,\r\n    'cook_time_minutes', r.cook_time_minutes,\r\n    'prep_time_minutes', r.prep_time_minutes,\r\n    'cuisine', r.cuisine,\r\n    'primary_protein', r.primary_protein,\r\n    'dish_type', r.dish_type,\r\n    'diet', r.diet,\r\n    'is_complete_meal', r.is_complete_meal,\r\n    'created_at', r.created_at,\r\n\r\n    'ingredients', COALESCE(\r\n      (\r\n        SELECT jsonb_agg(\r\n          jsonb_build_object(\r\n            'id', i.id,\r\n            'name', i.name,\r\n            'slug', i.slug,\r\n            'shopping_category', i.shopping_category,\r\n            'quantity', ri.quantity,\r\n            'unit', CASE\r\n              WHEN u.id IS NULL THEN NULL\r\n              ELSE jsonb_build_object(\r\n                'code', u.code,\r\n                'name', u.name\r\n              )\r\n            END\r\n          )\r\n          ORDER BY ri.created_at ASC, ri.id ASC\r\n        )\r\n        FROM public.recipe_ingredients ri\r\n        JOIN public.ingredients i\r\n          ON i.id = ri.ingredient_id\r\n        LEFT JOIN public.units u\r\n          ON u.id = ri.unit_id\r\n        WHERE ri.recipe_id = v_recipe_id\r\n      ),\r\n      '[]'::jsonb\r\n    ),\r\n\r\n    'steps', COALESCE(\r\n      (\r\n        SELECT jsonb_agg(\r\n          jsonb_build_object(\r\n            'step_no', rs.step_no,\r\n            'text', rs.text,\r\n            'time_seconds', rs.time_seconds\r\n          )\r\n          ORDER BY rs.step_no ASC\r\n        )\r\n        FROM public.recipe_steps rs\r\n        WHERE rs.recipe_id = v_recipe_id\r\n      ),\r\n      '[]'::jsonb\r\n    )\r\n  )\r\n  INTO v_result\r\n  FROM public.recipes r\r\n  WHERE r.id = v_recipe_id;\r\n\r\n  RETURN v_result;\r\nEND;\r\n$function$\n",
};

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

/** Walk forward from an opening "(" tracking depth, returning the text
 * strictly inside the matching closing ")". Fails loudly if depth never
 * returns to zero -- mirrors the established paren-balance-walking
 * convention used by the Slice 2 test suite, safely handles arbitrarily
 * nested parentheses (including those inside dollar-quoted function
 * bodies, as long as the search starts outside them). */
function extractBalancedParen(source: string, openParenIdx: number, label: string): string {
  expect(source[openParenIdx], `${label}: expected "(" at offset ${openParenIdx}`).toBe('(');
  let depth = 0;
  for (let i = openParenIdx; i < source.length; i++) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(openParenIdx + 1, i);
    }
  }
  expect.fail(`${label}: unbalanced parentheses starting at offset ${openParenIdx}`);
  return '';
}

/** Extract the text of a dollar-quoted DO block body by its own unique tag,
 * e.g. extractDoBlock(creation, 'create_fn_admin_create'). Fails loudly on
 * a missing or duplicate anchor. Safe for bodies containing nested
 * dollar-quoted strings with DIFFERENT tags (e.g. $sql$/$function_body$),
 * since it only searches for its own exact tag boundaries. */
function extractDoBlock(creation: string, tag: string): string {
  const startMarker = `DO $${tag}$`;
  const endMarker = `$${tag}$;`;
  const startIdx = mustFind(creation, startMarker, `DO block "${tag}" start`);
  const endIdx = creation.indexOf(endMarker, startIdx);
  expect(endIdx, `DO block "${tag}" end marker not found`).toBeGreaterThan(-1);
  // Fail loudly on a duplicate start anchor within the block's own span.
  const dupIdx = creation.indexOf(startMarker, startIdx + startMarker.length);
  if (dupIdx !== -1 && dupIdx < endIdx) {
    expect.fail(`DO block "${tag}": duplicate start anchor found before its own end anchor`);
  }
  return creation.slice(startIdx, endIdx + endMarker.length);
}

/** Extract a CREATE FUNCTION statement's full text (signature through the
 * final semicolon after its own dollar-quoted body close), anchored on the
 * function name. Uses balanced-paren walking for the argument list and a
 * literal search for the function's own "$function_body$" close tag, so it
 * is not fooled by semicolons or parentheses inside the body. */
function extractCreateFunctionStatement(doBlock: string, fnName: string): string {
  const headerMarker = `CREATE FUNCTION public.${fnName}(`;
  const headerIdx = mustFind(doBlock, headerMarker, `CREATE FUNCTION public.${fnName}(...)`);
  const openParenIdx = headerIdx + headerMarker.length - 1;
  // Consume the argument list (balanced), then continue to the statement's
  // own terminating semicolon, which must come after the function body's
  // own "$function_body$" close tag (not merely the first ";" encountered,
  // since the body itself very likely contains semicolons).
  extractBalancedParen(doBlock, openParenIdx, `argument list of ${fnName}`);
  const bodyOpenIdx = doBlock.indexOf('$function_body$', headerIdx);
  expect(bodyOpenIdx, `${fnName}: expected a $function_body$ open tag`).toBeGreaterThan(-1);
  const bodyCloseIdx = doBlock.indexOf('$function_body$', bodyOpenIdx + '$function_body$'.length);
  expect(bodyCloseIdx, `${fnName}: expected a $function_body$ close tag`).toBeGreaterThan(-1);
  const afterBody = bodyCloseIdx + '$function_body$'.length;
  const semiIdx = doBlock.indexOf(';', afterBody);
  expect(semiIdx, `${fnName}: expected a terminating ";" after the function body`).toBeGreaterThan(-1);
  return doBlock.slice(headerIdx, semiIdx + 1);
}

function sha256hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Extract the three raw pieces of a CREATE FUNCTION statement needed to
 * reconstruct pg_get_functiondef's canonical text: the (unnormalized,
 * as-written) argument list, the "header region" (everything between the
 * argument list's closing paren and the function body's own
 * "$function_body$" open tag -- i.e. RETURNS/LANGUAGE/[SECURITY DEFINER]/
 * SET search_path, in whatever order/whitespace the migration wrote them),
 * and the verbatim body text (between the $function_body$ tags, byte-exact,
 * no normalization). Fails loudly on any missing anchor. */
function extractFunctionPieces(
  doBlock: string,
  fnName: string,
): { argsRaw: string; headerRegion: string; bodyText: string } {
  const headerMarker = `CREATE FUNCTION public.${fnName}(`;
  const headerIdx = mustFind(doBlock, headerMarker, `CREATE FUNCTION public.${fnName}(...)`);
  const openParenIdx = headerIdx + headerMarker.length - 1;
  const argsRaw = extractBalancedParen(doBlock, openParenIdx, `argument list of ${fnName}`);
  const afterArgsIdx = openParenIdx + 1 + argsRaw.length + 1; // past the closing ")"
  const bodyOpenIdx = doBlock.indexOf('$function_body$', afterArgsIdx);
  expect(bodyOpenIdx, `${fnName}: expected a $function_body$ open tag`).toBeGreaterThan(-1);
  const headerRegion = doBlock.slice(afterArgsIdx, bodyOpenIdx);
  const bodyStart = bodyOpenIdx + '$function_body$'.length;
  const bodyCloseIdx = doBlock.indexOf('$function_body$', bodyStart);
  expect(bodyCloseIdx, `${fnName}: expected a $function_body$ close tag`).toBeGreaterThan(-1);
  const bodyText = doBlock.slice(bodyStart, bodyCloseIdx);
  return { argsRaw, headerRegion, bodyText };
}

/** Canonicalize a migration-authored CREATE FUNCTION statement's pieces into
 * the EXACT text PostgreSQL 17's own `pg_get_functiondef(oid)` would emit
 * for an equivalent function. This is not a guess: it was derived by
 * reconstructing all 4 of this migration's functions from their own
 * extracted pieces and diffing byte-for-byte against a live
 * `pg_get_functiondef` capture taken at implementation time (see
 * LIVE_CAPTURED_FUNCTIONDEF_SAMPLE and its own self-test below) -- all 4
 * reconstructions were byte-identical to the live sample. The
 * transformations applied are exactly: (1) "CREATE FUNCTION" -> "CREATE OR
 * REPLACE FUNCTION" (pg_get_functiondef always emits this form regardless
 * of how the function was actually created); (2) the argument list is
 * whitespace-normalized to PostgreSQL's own single-space-after-comma,
 * no-line-break form; (3) each header clause (RETURNS/LANGUAGE/[SECURITY
 * DEFINER]/SET search_path) is re-emitted with PostgreSQL's own one-line,
 * single-leading-space format, in PostgreSQL's own fixed clause order;
 * (4) the dollar-quote tag is normalized to PostgreSQL's own default
 * "$function$" (the migration's own "$function_body$" tag choice is not
 * semantically part of the definition); (5) the body text is reproduced
 * byte-for-byte with NO normalization (this is the one piece whose exact
 * content this whole mechanism exists to protect).
 *
 * IMPORTANT SCOPE NOTE: this canonicalizer only emits the clauses actually
 * present in this migration's baseline (RETURNS/LANGUAGE/[SECURITY
 * DEFINER]/SET search_path) -- it does not attempt to emit
 * VOLATILE/STRICT/PARALLEL/LEAKPROOF clauses in PostgreSQL's internal
 * ordering, since none of the 4 functions declares any of them (all are at
 * PostgreSQL's documented defaults) and reconstructing hypothetical
 * clause-ordering for values that don't occur here would be guesswork this
 * migration doesn't need. Volatility/strictness/parallel/leakproof drift is
 * instead independently, explicitly guarded by deriveFunctionAttributes()
 * below, which scans for and would detect the *presence* of any such
 * clause (a mutation this canonicalizer alone would silently ignore, since
 * it does not copy unrecognized header tokens into its output).
 */
function reconstructFunctiondef(fnName: string, argsRaw: string, headerRegion: string, bodyText: string): string {
  const normalizedArgs = argsRaw.replace(/\s+/g, ' ').trim();
  const returnsMatch = headerRegion.match(/RETURNS\s+(\w+)/);
  expect(returnsMatch, `${fnName}: expected a RETURNS clause in the header region`).not.toBeNull();
  const languageMatch = headerRegion.match(/LANGUAGE\s+(\w+)/);
  expect(languageMatch, `${fnName}: expected a LANGUAGE clause in the header region`).not.toBeNull();
  const securityDefiner = /\bSECURITY\s+DEFINER\b/.test(headerRegion);
  const searchPathMatch = headerRegion.match(/SET search_path TO (.+?)\n/);
  expect(searchPathMatch, `${fnName}: expected a SET search_path TO ... clause in the header region`).not.toBeNull();

  let out = `CREATE OR REPLACE FUNCTION public.${fnName}(${normalizedArgs})\n`;
  out += ` RETURNS ${returnsMatch![1]}\n`;
  out += ` LANGUAGE ${languageMatch![1]}\n`;
  if (securityDefiner) out += ' SECURITY DEFINER\n';
  out += ` SET search_path TO ${searchPathMatch![1].trim()}\n`;
  out += 'AS $function$';
  out += bodyText;
  out += '$function$\n';
  return out;
}

/** Independently derive a function's volatility/strictness/parallel-safety/
 * leakproof-ness from its raw header-region text, mapping an OMITTED clause
 * explicitly to PostgreSQL's own documented CREATE FUNCTION default for
 * that attribute (VOLATILE / not STRICT (CALLED ON NULL INPUT) / PARALLEL
 * UNSAFE / NOT LEAKPROOF) rather than assuming or guessing. Uses
 * word-bounded regexes scoped to the already-isolated single-function
 * header region, so it cannot be fooled by an unrelated token elsewhere in
 * the file or by text inside the function's own body (headerRegion never
 * includes body text -- see extractFunctionPieces). Throws (via `expect`)
 * on a contradictory header (e.g. both STRICT and CALLED ON NULL INPUT). */
function deriveFunctionAttributes(
  fnName: string,
  headerRegion: string,
): { volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE'; strict: boolean; parallel: 'UNSAFE' | 'RESTRICTED' | 'SAFE'; leakproof: boolean } {
  const hasImmutable = /\bIMMUTABLE\b/.test(headerRegion);
  const hasStable = /\bSTABLE\b/.test(headerRegion);
  const hasVolatileKeyword = /\bVOLATILE\b/.test(headerRegion);
  const volatilityHits = [hasImmutable, hasStable, hasVolatileKeyword].filter(Boolean).length;
  expect(volatilityHits, `${fnName}: at most one of IMMUTABLE/STABLE/VOLATILE may be present`).toBeLessThanOrEqual(1);
  const volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE' = hasImmutable ? 'IMMUTABLE' : hasStable ? 'STABLE' : 'VOLATILE';

  const hasStrict = /\bSTRICT\b/.test(headerRegion) || /\bRETURNS\s+NULL\s+ON\s+NULL\s+INPUT\b/.test(headerRegion);
  const hasCalledOnNull = /\bCALLED\s+ON\s+NULL\s+INPUT\b/.test(headerRegion);
  expect(hasStrict && hasCalledOnNull, `${fnName}: STRICT and CALLED ON NULL INPUT are contradictory`).toBe(false);
  const strict = hasStrict; // omitted (neither present) -> PostgreSQL default: not strict

  const hasParallelSafe = /\bPARALLEL\s+SAFE\b/.test(headerRegion);
  const hasParallelRestricted = /\bPARALLEL\s+RESTRICTED\b/.test(headerRegion);
  const hasParallelUnsafe = /\bPARALLEL\s+UNSAFE\b/.test(headerRegion);
  const parallelHits = [hasParallelSafe, hasParallelRestricted, hasParallelUnsafe].filter(Boolean).length;
  expect(parallelHits, `${fnName}: at most one PARALLEL clause may be present`).toBeLessThanOrEqual(1);
  const parallel: 'UNSAFE' | 'RESTRICTED' | 'SAFE' = hasParallelSafe ? 'SAFE' : hasParallelRestricted ? 'RESTRICTED' : 'UNSAFE'; // omitted -> PostgreSQL default: UNSAFE

  const hasLeakproof = /\bLEAKPROOF\b/.test(headerRegion) && !/\bNOT\s+LEAKPROOF\b/.test(headerRegion);
  const leakproof = hasLeakproof; // omitted (or explicit NOT LEAKPROOF) -> PostgreSQL default: not leakproof

  return { volatility, strict, parallel, leakproof };
}

describe('migration: baseline_views_and_functions', () => {
  const { file, sql, executable } = loadMigration();

  describe('filename, version and ordering', () => {
    it('is exactly the one expected file', () => {
      expect(file).toBe(EXPECTED_FILE);
    });

    it('sorts immediately after Slice 2 and before the first later active migration', () => {
      const all = activeMigrationFiles();
      const slice2Idx = all.indexOf(SLICE2_FILE);
      const thisIdx = all.indexOf(EXPECTED_FILE);
      const laterIdx = all.indexOf(FIRST_LATER_MIGRATION);
      expect(slice2Idx, 'Slice 2 migration must exist').toBeGreaterThanOrEqual(0);
      expect(thisIdx, 'Slice 3 migration must exist').toBeGreaterThanOrEqual(0);
      expect(laterIdx, 'first later migration must exist').toBeGreaterThanOrEqual(0);
      expect(thisIdx).toBeGreaterThan(slice2Idx);
      expect(thisIdx).toBeLessThan(laterIdx);
    });

    it('exactly one target migration exists (no duplicate/second scaffold)', () => {
      const all = activeMigrationFiles();
      expect(all.filter((f) => f.endsWith(SUFFIX)).length).toBe(1);
    });
  });

  describe('cross-file proof: Slice 1 and Slice 2 remain byte-unchanged', () => {
    it('Slice 1 migration SHA-256 is unchanged from the approved baseline', () => {
      const p = path.join(MIGRATIONS_DIR, SLICE1_FILE);
      expect(fs.existsSync(p), `${SLICE1_FILE} must still exist`).toBe(true);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(hash).toBe(SLICE1_SHA256);
    });

    it('Slice 2 migration SHA-256 is unchanged from the approved (corrected, re-reviewed, merged) baseline', () => {
      const p = path.join(MIGRATIONS_DIR, SLICE2_FILE);
      expect(fs.existsSync(p), `${SLICE2_FILE} must still exist`).toBe(true);
      const hash = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
      expect(hash).toBe(SLICE2_SHA256);
    });
  });

  describe('exact six-object scope, no expansion', () => {
    it('creates exactly the 2 target views via CREATE VIEW, and no other view', () => {
      const creation = creationBlockOf(executable);
      const matches = [...creation.matchAll(/CREATE VIEW public\.(\w+)/g)].map((m) => m[1]).sort();
      expect(matches).toEqual(VIEW_NAMES);
    });

    it('creates exactly the 4 target functions via CREATE FUNCTION, and no other function', () => {
      const creation = creationBlockOf(executable);
      const matches = [...creation.matchAll(/CREATE FUNCTION public\.(\w+)\(/g)].map((m) => m[1]).sort();
      expect(matches).toEqual(FUNCTION_NAMES);
    });

    it('creates no table/index/constraint/policy/trigger anywhere', () => {
      expect(/CREATE TABLE/i.test(executable)).toBe(false);
      expect(/CREATE (UNIQUE )?INDEX/i.test(executable)).toBe(false);
      expect(/CREATE POLICY/i.test(executable)).toBe(false);
      expect(/CREATE TRIGGER/i.test(executable)).toBe(false);
      expect(/ADD CONSTRAINT/i.test(executable)).toBe(false);
    });

    it('never uses CASCADE anywhere', () => {
      expect(/CASCADE/i.test(executable)).toBe(false);
    });

    it('does not modify any Slice 1 or Slice 2 table', () => {
      const slice1And2Tables = [
        'ingredients', 'units', 'equipment', 'recipes', 'recipe_ingredients', 'recipe_steps',
        'recipe_equipment', 'ingredient_substitutions', 'menu_plans', 'menu_plan_items',
        'user_favorites', 'user_preferences',
      ];
      for (const t of slice1And2Tables) {
        expect(executable.includes(`ALTER TABLE public.${t}`), `must not ALTER public.${t}`).toBe(false);
      }
    });
  });

  describe('global two-state classifier (no third/hybrid branch)', () => {
    it('preflight accepts only present_count IN (0, 6), rejecting every partial state', () => {
      const preflight = preflightBlockOf(executable);
      expect(preflight.includes('IF present_count NOT IN (0, 6) THEN')).toBe(true);
    });

    it('classification is global across all 6 objects via a single present_count computed once, not per-object', () => {
      const preflight = preflightBlockOf(executable);
      expect(countOccurrences(preflight, 'INTO present_count')).toBe(1);
    });

    it('has no ELSIF / third branch between the fresh and compatible states', () => {
      const preflight = preflightBlockOf(executable);
      expect(/ELSIF/i.test(preflight)).toBe(false);
    });

    it('postcheck requires exactly 6 objects present after this migration runs', () => {
      const postcheck = postcheckBlockOf(executable);
      expect(postcheck.includes('IF present_count <> 6 THEN')).toBe(true);
    });

    it('preflight and postcheck both classify by view-relkind-existence plus function-any-overload-existence, not row counts alone', () => {
      for (const block of [preflightBlockOf(executable), postcheckBlockOf(executable)]) {
        expect(countOccurrences(block, "c.relkind='v' AND c.relname='v_menu_plan_shopping_list'")).toBe(1);
        expect(countOccurrences(block, "c.relkind='v' AND c.relname='vw_menu_plan_grocery_items'")).toBe(1);
        for (const fn of FUNCTION_NAMES) {
          expect(countOccurrences(block, `p.proname='${fn}') THEN 1 ELSE 0 END`)).toBe(1);
        }
      }
    });
  });

  describe('ordering: preflight before creation before postcheck', () => {
    it('the preflight block appears before the creation block, which appears before the postcheck block', () => {
      const preflightIdx = mustFind(sql, 'DO $preflight$', 'preflight start');
      const creationMarkerIdx = mustFind(sql, '-- B. Creation', 'creation section marker (raw source, it is a comment)');
      const postcheckIdx = mustFind(sql, 'DO $postcheck$', 'postcheck start');
      expect(preflightIdx).toBeLessThan(creationMarkerIdx);
      expect(creationMarkerIdx).toBeLessThan(postcheckIdx);
    });
  });

  describe('creation order, described truthfully', () => {
    it('the 6 CREATE statements appear in the documented stable order: both views, then get, then create, then update, then delete', () => {
      const creation = creationBlockOf(executable);
      const order = [
        mustFind(creation, 'CREATE VIEW public.v_menu_plan_shopping_list', 'view 1'),
        mustFind(creation, 'CREATE VIEW public.vw_menu_plan_grocery_items', 'view 2'),
        mustFind(creation, 'CREATE FUNCTION public.get_recipe_detail_json(', 'get_recipe_detail_json'),
        mustFind(creation, 'CREATE FUNCTION public.admin_create_recipe_atomic(', 'admin_create_recipe_atomic'),
        mustFind(creation, 'CREATE FUNCTION public.admin_update_recipe_atomic(', 'admin_update_recipe_atomic'),
        mustFind(creation, 'CREATE FUNCTION public.admin_delete_recipe_atomic(', 'admin_delete_recipe_atomic'),
      ];
      for (let i = 1; i < order.length; i++) {
        expect(order[i], `object ${i} must appear after object ${i - 1}`).toBeGreaterThan(order[i - 1]);
      }
    });

    it('the header describes the order as a CHOSEN STABLE order, not a false blanket dependency claim, while still documenting the one real dependency (views require Slice 2)', () => {
      // These live in the header COMMENT block, so check the raw source,
      // not the comment-stripped executable text.
      expect(sql.includes('CHOSEN STABLE ORDER')).toBe(true);
      expect(sql.includes('THE ONE REAL PROVEN')).toBe(true);
      expect(sql.includes('genuinely REQUIRE')).toBe(true);
    });
  });

  describe('complete view identity (both views)', () => {
    for (const viewName of VIEW_NAMES) {
      it(`${viewName}: creation DDL includes WITH (security_invoker=true) and correct OWNER/REVOKE/GRANT`, () => {
        const creation = creationBlockOf(executable);
        const tag = viewName === 'v_menu_plan_shopping_list' ? 'create_view_shopping_list' : 'create_view_grocery_items';
        const block = extractDoBlock(creation, tag);
        expect(block.includes(`CREATE VIEW public.${viewName}`)).toBe(true);
        expect(block.includes('WITH (security_invoker=true)')).toBe(true);
        expect(block.includes(`ALTER VIEW public.${viewName} OWNER TO postgres`)).toBe(true);
        expect(block.includes(`REVOKE ALL ON public.${viewName} FROM anon`)).toBe(true);
        expect(block.includes(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.${viewName} FROM authenticated, service_role`)).toBe(true);
        // must NOT grant anything to anon, and must not leave authenticated/service_role with more than SELECT
        expect(block.includes(`TO anon`)).toBe(false);
        expect(/GRANT\s+(?!SELECT\b)\w+.*TO\s+(authenticated|service_role)/i.test(block)).toBe(false);
      });

      it(`${viewName}: SELECT body is byte-for-byte (whitespace-normalized) identical to independent ground truth`, () => {
        const creation = creationBlockOf(executable);
        const tag = viewName === 'v_menu_plan_shopping_list' ? 'create_view_shopping_list' : 'create_view_grocery_items';
        const block = extractDoBlock(creation, tag);
        const headerMarker = `CREATE VIEW public.${viewName}\n      WITH (security_invoker=true) AS\n      `;
        const headerIdx = mustFind(block, headerMarker, `${viewName} CREATE VIEW header`);
        const bodyStart = headerIdx + headerMarker.length;
        const bodyEnd = mustFind(block, '\n    $sql$;', `${viewName} view body close tag`);
        expect(bodyEnd).toBeGreaterThan(bodyStart);
        const actualBody = block.slice(bodyStart, bodyEnd);
        expect(actualBody).toBe(GROUND_TRUTH_VIEW_BODY[viewName]);
      });

      it(`${viewName}: each view is individually guarded by its own existence check (defense-in-depth)`, () => {
        const creation = creationBlockOf(executable);
        const tag = viewName === 'v_menu_plan_shopping_list' ? 'create_view_shopping_list' : 'create_view_grocery_items';
        const block = extractDoBlock(creation, tag);
        expect(block.includes(`c.relname='${viewName}'`)).toBe(true);
        expect(block.indexOf('IF NOT EXISTS')).toBeLessThan(block.indexOf('CREATE VIEW'));
      });
    }

    it('exactly 2 CREATE VIEW statements exist, no view is created twice', () => {
      const creation = creationBlockOf(executable);
      expect((creation.match(/CREATE VIEW/g) ?? []).length).toBe(2);
    });
  });

  describe('complete function identity, keyed by full signature', () => {
    for (const fnName of FUNCTION_NAMES) {
      it(`${fnName}: exact security mode`, () => {
        const creation = creationBlockOf(executable);
        const tagMap: Record<string, string> = {
          get_recipe_detail_json: 'create_fn_get_recipe_detail_json',
          admin_create_recipe_atomic: 'create_fn_admin_create',
          admin_update_recipe_atomic: 'create_fn_admin_update',
          admin_delete_recipe_atomic: 'create_fn_admin_delete',
        };
        const block = extractDoBlock(creation, tagMap[fnName]);
        const stmt = extractCreateFunctionStatement(block, fnName);
        if (GROUND_TRUTH_SECURITY[fnName] === 'DEFINER') {
          expect(stmt.includes('SECURITY DEFINER'), `${fnName} must be SECURITY DEFINER`).toBe(true);
        } else {
          expect(stmt.includes('SECURITY DEFINER'), `${fnName} must NOT be SECURITY DEFINER (INVOKER is the default, no clause emitted)`).toBe(false);
          expect(stmt.includes('SECURITY INVOKER') || !stmt.includes('SECURITY'), `${fnName} must be INVOKER (no SECURITY DEFINER clause)`).toBe(true);
        }
      });

      it(`${fnName}: exact search_path/proconfig`, () => {
        const creation = creationBlockOf(executable);
        const tagMap: Record<string, string> = {
          get_recipe_detail_json: 'create_fn_get_recipe_detail_json',
          admin_create_recipe_atomic: 'create_fn_admin_create',
          admin_update_recipe_atomic: 'create_fn_admin_update',
          admin_delete_recipe_atomic: 'create_fn_admin_delete',
        };
        const block = extractDoBlock(creation, tagMap[fnName]);
        const stmt = extractCreateFunctionStatement(block, fnName);
        // Exact-line match, not a loose substring check: `.includes()` would
        // still pass if extra schemas were appended after the expected
        // value (e.g. "'public', 'pg_temp'" contains "'public'" as a
        // prefix), silently missing a widened search_path.
        const lineMatch = stmt.match(/^\s*SET search_path TO .+$/m);
        expect(lineMatch, `${fnName}: expected a "SET search_path TO ..." line`).not.toBeNull();
        expect(lineMatch![0].trim()).toBe(GROUND_TRUTH_SEARCH_PATH[fnName]);
      });

      it(`${fnName}: RETURNS jsonb, LANGUAGE plpgsql, identity arguments match independent ground truth character-for-character`, () => {
        const creation = creationBlockOf(executable);
        const tagMap: Record<string, string> = {
          get_recipe_detail_json: 'create_fn_get_recipe_detail_json',
          admin_create_recipe_atomic: 'create_fn_admin_create',
          admin_update_recipe_atomic: 'create_fn_admin_update',
          admin_delete_recipe_atomic: 'create_fn_admin_delete',
        };
        const block = extractDoBlock(creation, tagMap[fnName]);
        const stmt = extractCreateFunctionStatement(block, fnName);
        expect(stmt.includes('RETURNS jsonb')).toBe(true);
        expect(stmt.includes('LANGUAGE plpgsql')).toBe(true);
        const headerIdx = mustFind(stmt, `CREATE FUNCTION public.${fnName}(`, `${fnName} header`);
        const openParenIdx = headerIdx + `CREATE FUNCTION public.${fnName}(`.length - 1;
        const argsText = extractBalancedParen(stmt, openParenIdx, `${fnName} argument list`);
        const normalizedArgs = argsText.replace(/\s+/g, ' ').trim();
        const expectedNormalized = GROUND_TRUTH_IDENTITY_ARGS[fnName].replace(/\s+/g, ' ').trim();
        expect(normalizedArgs).toBe(expectedNormalized);
      });
    }

    it('exactly 4 CREATE FUNCTION statements exist, no function is created twice', () => {
      const creation = creationBlockOf(executable);
      expect((creation.match(/CREATE FUNCTION/g) ?? []).length).toBe(4);
    });

    it('each function is individually guarded by its own existence check (defense-in-depth)', () => {
      const creation = creationBlockOf(executable);
      const guards = (creation.match(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_catalog\.pg_proc p JOIN pg_catalog\.pg_namespace n ON n\.oid=p\.pronamespace/g) ?? []).length;
      expect(guards).toBe(4);
    });
  });

  describe('exact roles/ACL/grantors -- no unintended PUBLIC/anon/authenticated EXECUTE on admin RPCs', () => {
    it('admin_create/update/delete_recipe_atomic each REVOKE EXECUTE FROM PUBLIC and GRANT only to postgres, service_role', () => {
      const creation = creationBlockOf(executable);
      for (const [fn, tag] of [
        ['admin_create_recipe_atomic', 'create_fn_admin_create'],
        ['admin_update_recipe_atomic', 'create_fn_admin_update'],
        ['admin_delete_recipe_atomic', 'create_fn_admin_delete'],
      ] as const) {
        const block = extractDoBlock(creation, tag);
        expect(block.includes(`REVOKE EXECUTE ON FUNCTION public.${fn}`), `${fn} must REVOKE EXECUTE FROM PUBLIC`).toBe(true);
        expect(block.includes('FROM PUBLIC;')).toBe(true);
        expect(block.includes(`TO postgres, service_role;`), `${fn} must GRANT EXECUTE only to postgres, service_role`).toBe(true);
        expect(block.includes('TO anon')).toBe(false);
        expect(block.includes('TO authenticated')).toBe(false);
        expect(block.includes('TO PUBLIC, anon')).toBe(false);
      }
    });

    it('get_recipe_detail_json GRANTs broad EXECUTE (PUBLIC, anon, authenticated, service_role, postgres) and does not narrow it', () => {
      const creation = creationBlockOf(executable);
      const block = extractDoBlock(creation, 'create_fn_get_recipe_detail_json');
      expect(block.includes('GRANT EXECUTE ON FUNCTION public.get_recipe_detail_json(text) TO PUBLIC, anon, authenticated, service_role, postgres;')).toBe(true);
      expect(/REVOKE/.test(block)).toBe(false);
    });

    it('exactly the intended REVOKE/GRANT statement count in the creation block (2 views x 2 REVOKE each + 4 functions worth of REVOKE/GRANT)', () => {
      const creation = creationBlockOf(executable);
      const revokeCount = (creation.match(/^\s*(EXECUTE \$sql\$ )?REVOKE/gm) ?? []).length;
      const grantCount = (creation.match(/^\s*(EXECUTE \$sql\$ )?GRANT/gm) ?? []).length;
      // views: 2 REVOKE each (anon-all, narrow-from-authenticated/service_role) = 4
      // admin functions: 1 REVOKE each = 3
      expect(revokeCount).toBe(7);
      // views: 0 explicit GRANT beyond what's already correct by default... actually
      // views only REVOKE (authenticated/service_role SELECT already present by default); functions: 4 GRANT (1 per function)
      expect(grantCount).toBe(4);
    });
  });

  describe('symmetric-diff rigor: every arm fully parenthesized, direction-specific', () => {
    it('preflight and postcheck each raise a distinctly worded exception for object-identity and ACL mismatches', () => {
      for (const block of [preflightBlockOf(executable), postcheckBlockOf(executable)]) {
        expect(block.includes('object-identity mismatches found across the 6 target objects')).toBe(true);
        expect(block.includes('raw-ACL-row mismatches found across the 6 target objects')).toBe(true);
      }
    });

    it('every symmetric diff is written as two fully parenthesized EXCEPT ALL arms joined by UNION ALL', () => {
      const exceptAllCount = countOccurrences(executable, 'EXCEPT ALL');
      // 2 categories (identity, ACL) x 2 arms x 2 blocks (preflight, postcheck) = 8
      expect(exceptAllCount).toBe(8);
      const unionAllArmJoins = countOccurrences(executable, '\n      UNION ALL\n');
      // 1 per symmetric-diff block: 2 categories x 2 blocks = 4
      expect(unionAllArmJoins).toBe(4);
    });

    it('each symmetric-diff block is genuinely paren-balanced around its UNION ALL split (structural depth check, not a suffix-trim heuristic)', () => {
      const anchorMarker = 'INTO mismatch_count';
      const anchorIdxs: number[] = [];
      {
        let idx = executable.indexOf(anchorMarker);
        while (idx !== -1) {
          anchorIdxs.push(idx);
          idx = executable.indexOf(anchorMarker, idx + 1);
        }
      }
      expect(anchorIdxs.length, 'expected exactly 4 symmetric-diff blocks (2 categories x preflight+postcheck)').toBe(4);

      for (const anchorIdx of anchorIdxs) {
        const fromMarker = 'FROM (';
        const fromIdx = executable.indexOf(fromMarker, anchorIdx);
        expect(fromIdx, `expected a following "FROM (" for symmetric_diff block anchored at ${anchorIdx}`).toBeGreaterThan(-1);
        const blockOpenParenIdx = fromIdx + fromMarker.length - 1;

        let depth = 0;
        let blockCloseParenIdx = -1;
        const unionAllDepths: number[] = [];
        for (let i = blockOpenParenIdx; i < executable.length; i++) {
          const ch = executable[i];
          if (ch === '(') depth += 1;
          else if (ch === ')') {
            depth -= 1;
            expect(depth, `paren depth went negative inside symmetric-diff block at offset ${i}`).toBeGreaterThanOrEqual(0);
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
        const tail = executable.slice(blockCloseParenIdx + 1, blockCloseParenIdx + 1 + ' AS symmetric_diff;'.length);
        expect(tail, `structurally-found block close at ${blockCloseParenIdx} must be immediately followed by " AS symmetric_diff;"`).toBe(' AS symmetric_diff;');

        const topLevelUnionAlls = unionAllDepths.filter((d) => d === 1);
        const belowArmDepth = unionAllDepths.filter((d) => d < 1);
        expect(belowArmDepth.length, `no UNION ALL may sit outside both arms (depth < 1)`).toBe(0);
        expect(topLevelUnionAlls.length, `expected exactly one top-level (depth-1) UNION ALL, found depths ${JSON.stringify(unionAllDepths)}`).toBe(1);
      }
    });

    it('the expected VALUES payload for each category is textually identical between its own two arms (expected/expected2), in both preflight and postcheck (resistant to a single-arm-only compensating edit)', () => {
      for (const [label, block] of [
        ['preflight', preflightBlockOf(executable)],
        ['postcheck', postcheckBlockOf(executable)],
      ] as const) {
        for (const marker of ['AS expected(kind, ident, identity_hash)', 'AS expected(kind, ident, grantee, privilege, grantor, is_grantable)']) {
          const firstIdx = mustFind(block, marker, `${label}: ${marker}`);
          const closeParenIdx = block.lastIndexOf(')', firstIdx);
          const valuesIdx = block.lastIndexOf('VALUES', closeParenIdx);
          const armOne = block.slice(valuesIdx + 'VALUES'.length, closeParenIdx).trim();

          const marker2 = marker.replace('expected(', 'expected2(');
          const secondIdx = block.indexOf(marker2, firstIdx + marker.length);
          expect(secondIdx, `${label}: expected to find mirrored marker ${marker2}`).toBeGreaterThan(firstIdx);
          const closeParenIdx2 = block.lastIndexOf(')', secondIdx);
          const valuesIdx2 = block.lastIndexOf('VALUES', closeParenIdx2);
          const armTwo = block.slice(valuesIdx2 + 'VALUES'.length, closeParenIdx2).trim();

          expect(armTwo, `${label}: ${marker} arm2 must be textually identical to arm1`).toBe(armOne);
        }
      }
    });

    it('the actual-side identity/ACL query is textually identical between its own two EXCEPT ALL uses per block (both preflight and postcheck)', () => {
      // The "actual" subquery text (views UNION ALL functions, keyed by
      // object identity) is reused verbatim twice per category per block --
      // count its own unique anchor phrase to prove it appears exactly the
      // expected number of times, not narrowed on one side.
      const actualIdentityAnchor = "FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace,\n                 LATERAL pg_catalog.aclexplode";
      // (ACL actual-query anchor; identity actual-query has its own distinct anchor below)
      const identityActualAnchor = 'encode(sha256((pg_catalog.pg_get_viewdef(c.oid, true)';
      // identity actual query used 2x per block (both EXCEPT ALL directions) x 2 blocks = 4
      expect(countOccurrences(executable, identityActualAnchor)).toBe(4);
      // ACL actual query used 2x per block x 2 blocks = 4
      expect(countOccurrences(executable, actualIdentityAnchor)).toBe(4);
    });
  });

  describe('prerequisite checks (Slice 1 + Slice 2), without modifying them', () => {
    it('preflight requires the 6 Slice 1 prerequisite tables and Slice 2\'s menu_plan_items, on both fresh and compatible paths (outside the present_count=6 IF)', () => {
      const preflight = preflightBlockOf(executable);
      const prereqIdx = mustFind(preflight, 'required Slice 1 prerequisite tables is missing', 'Slice 1 prerequisite check');
      const compatibleIfIdx = mustFind(preflight, 'IF present_count = 6 THEN', 'compatible-path IF');
      expect(prereqIdx, 'the Slice 1/2 prerequisite checks must run unconditionally, before the present_count=6 branch').toBeLessThan(compatibleIfIdx);
      expect(preflight.includes("c.relname IN ('recipes','recipe_ingredients','ingredients','units','recipe_steps','recipe_equipment')")).toBe(true);
      expect(preflight.includes("c.relkind='r' AND c.relname = 'menu_plan_items'")).toBe(true);
    });
  });

  describe('downstream migration compatibility', () => {
    function laterMigrationSource(filename: string): string {
      const p = path.join(MIGRATIONS_DIR, filename);
      expect(fs.existsSync(p), `${filename} must exist`).toBe(true);
      return fs.readFileSync(p, 'utf8');
    }

    it('20260909061735 fail-closes on ALL THREE admin functions (not only delete) plus both views -- this migration creates all 5 of those objects', () => {
      const src = stripLineComments(laterMigrationSource(HARDEN_ADMIN_RPCS_FILE));
      for (const fn of ['admin_create_recipe_atomic', 'admin_update_recipe_atomic', 'admin_delete_recipe_atomic']) {
        expect(src.includes(`'${fn}'`), `${HARDEN_ADMIN_RPCS_FILE} must reference ${fn}`).toBe(true);
      }
      for (const v of VIEW_NAMES) {
        expect(src.includes(v), `${HARDEN_ADMIN_RPCS_FILE} must reference ${v}`).toBe(true);
      }
    });

    it('20260910060642 requires admin_create_recipe_atomic/admin_update_recipe_atomic in exactly the canonical shape this migration creates (character-for-character identity-argument match)', () => {
      const src = laterMigrationSource(RECONCILE_ADMIN_RPC_FILE);
      // The downstream file's own k_create_canon is built by concatenating
      // adjacent string literals; verify our creation DDL's identity args
      // are a literal substring match against a normalized form of that
      // concatenation by checking each comma-delimited fragment appears.
      const fragments = GROUND_TRUTH_IDENTITY_ARGS.admin_create_recipe_atomic.split(', ');
      for (const frag of fragments) {
        expect(src.includes(frag), `${RECONCILE_ADMIN_RPC_FILE} k_create_canon must contain fragment "${frag}"`).toBe(true);
      }
      expect(src.includes("k_update_canon")).toBe(true);
    });

    it('20260905034023 (which only comment-mentions get_recipe_detail_json) is unaffected -- no executable dependency check needed beyond existence, which this migration satisfies', () => {
      const src = laterMigrationSource(FIRST_LATER_MIGRATION);
      const executableLater = stripLineComments(src);
      // No bare CREATE of get_recipe_detail_json in the later file (would
      // indicate a duplicate-creation hazard).
      expect(executableLater.includes('CREATE FUNCTION public.get_recipe_detail_json')).toBe(false);
      expect(executableLater.includes('CREATE OR REPLACE FUNCTION public.get_recipe_detail_json')).toBe(false);
    });
  });

  describe('no application DML, no migration-history write, no Docker/dynamic identifier hazard', () => {
    it('all application-table DML (INSERT/UPDATE/DELETE) is confined inside the admin RPC function bodies, never in the preflight/postcheck/creation-guard scaffolding', () => {
      // admin_create/update/delete_recipe_atomic legitimately perform
      // INSERT/UPDATE/DELETE against recipes/recipe_ingredients/recipe_steps
      // as their entire purpose -- that DML is expected and lives inside
      // their own $function_body$...$function_body$ spans. What must NOT
      // happen is DML outside any function body (i.e. in the preflight
      // block, the postcheck block, or the bare creation-guard shell).
      const bodySpans: Array<[number, number]> = [];
      let searchFrom = 0;
      for (;;) {
        const openIdx = executable.indexOf('$function_body$', searchFrom);
        if (openIdx === -1) break;
        const closeIdx = executable.indexOf('$function_body$', openIdx + '$function_body$'.length);
        expect(closeIdx, 'unbalanced $function_body$ tag').toBeGreaterThan(-1);
        bodySpans.push([openIdx, closeIdx + '$function_body$'.length]);
        searchFrom = closeIdx + '$function_body$'.length;
      }
      expect(bodySpans.length, 'expected exactly 4 function bodies').toBe(4);

      const dmlPattern = /\b(INSERT INTO|UPDATE|DELETE FROM)\s+public\.\w+/g;
      let match: RegExpExecArray | null;
      const outsideMatches: string[] = [];
      while ((match = dmlPattern.exec(executable)) !== null) {
        const idx = match.index;
        const insideAnyBody = bodySpans.some(([start, end]) => idx >= start && idx < end);
        if (!insideAnyBody) outsideMatches.push(`${match[0]} @${idx}`);
      }
      expect(outsideMatches, `DML found outside all function bodies: ${JSON.stringify(outsideMatches)}`).toEqual([]);
    });

    it('never references supabase_migrations.schema_migrations', () => {
      expect(executable.includes('supabase_migrations')).toBe(false);
    });

    it('has no explicit BEGIN/COMMIT (relies on the implicit migration transaction, matching repo convention)', () => {
      expect(/^\s*BEGIN;/m.test(executable)).toBe(false);
      expect(/^\s*COMMIT;/m.test(executable)).toBe(false);
    });

    it('uses no dynamic identifier concatenation (format()/EXECUTE with %I) anywhere', () => {
      expect(/EXECUTE\s+format\s*\(/i.test(executable)).toBe(false);
      expect(/%I/.test(executable)).toBe(false);
    });
  });

  describe('known out-of-scope findings are documented, not silently fixed', () => {
    it('header documents the bare auth.uid() menu_plans/menu_plan_items policy style as out of scope, not touched', () => {
      // Header prose lives in comments; check the raw source.
      expect(sql.includes('bare `auth.uid()`')).toBe(true);
      expect(sql.includes('outside this migration')).toBe(true);
    });

    it('header documents the views\' currently-zero live application caller without claiming it as a defect', () => {
      expect(sql.includes('no live application caller')).toBe(true);
    });

    it('header states get_recipe_detail_json\'s broad EXECUTE grant is intentional and not narrowed', () => {
      expect(sql.includes('is intentional and is NOT narrowed')).toBe(true);
    });
  });

  // ==========================================================================
  // Test-coverage correction (static review SLICE3_STATIC_REVIEW_CHANGES_REQUIRED,
  // /home/venn/prepmeal-baseline-views-functions-static-review.md, findings 1-3).
  // The three describe blocks below close: (1) function-body-content drift
  // going undetected, (2) an embedded identity-hash literal being corrupted
  // going undetected, and (3) volatility/strictness/parallel-safety drift
  // going undetected. All three were empirically proven undetected by the
  // pre-correction 58-test suite via scratch mutation testing outside both
  // worktrees before this correction was written.
  // ==========================================================================

  const FUNCTION_TAG_MAP: Record<string, string> = {
    get_recipe_detail_json: 'create_fn_get_recipe_detail_json',
    admin_create_recipe_atomic: 'create_fn_admin_create',
    admin_update_recipe_atomic: 'create_fn_admin_update',
    admin_delete_recipe_atomic: 'create_fn_admin_delete',
  };
  const VIEW_TAG_MAP: Record<string, string> = {
    v_menu_plan_shopping_list: 'create_view_shopping_list',
    vw_menu_plan_grocery_items: 'create_view_grocery_items',
  };

  describe('canonicalization self-test: reconstruction logic matches a live-captured pg_get_functiondef sample byte-for-byte', () => {
    it('reconstructFunctiondef(), fed pieces extracted from that same live sample text, reproduces it exactly', () => {
      // This is a self-test of the canonicalizer, not of the migration: it
      // proves reconstructFunctiondef()'s transformation rules are correct
      // by round-tripping a known-good, independently-captured
      // pg_get_functiondef sample (get_recipe_detail_json) through the same
      // extraction+reconstruction pipeline used against the migration below.
      const sample = LIVE_CAPTURED_FUNCTIONDEF_SAMPLE.get_recipe_detail_json;
      const argsMatch = sample.match(/^CREATE OR REPLACE FUNCTION public\.get_recipe_detail_json\(([^)]*)\)/);
      expect(argsMatch, 'expected to parse the sample\'s argument list').not.toBeNull();
      const argsRaw = argsMatch![1];
      const afterArgsIdx = sample.indexOf('AS $function$');
      expect(afterArgsIdx).toBeGreaterThan(-1);
      const headerStart = sample.indexOf(')\n', sample.indexOf('(')) + 2;
      const headerRegion = sample.slice(headerStart, afterArgsIdx);
      const bodyStart = afterArgsIdx + 'AS $function$'.length;
      const bodyEnd = sample.lastIndexOf('$function$');
      const bodyText = sample.slice(bodyStart, bodyEnd);
      const reconstructed = reconstructFunctiondef('get_recipe_detail_json', argsRaw, headerRegion, bodyText);
      expect(reconstructed).toBe(sample);
      expect(sha256hex(reconstructed)).toBe(GROUND_TRUTH_FUNCTIONDEF_SHA256.get_recipe_detail_json);
    });
  });

  describe('ground-truth hash provenance: GROUND_TRUTH_VIEW_HASH is independently self-consistent', () => {
    for (const viewName of VIEW_NAMES) {
      it(`${viewName}: sha256(GROUND_TRUTH_VIEWDEF_TEXT + '|security_invoker=true|postgres') equals GROUND_TRUTH_VIEW_HASH`, () => {
        // Self-test using the independently-captured pg_get_viewdef-format
        // sample text (GROUND_TRUTH_VIEWDEF_TEXT), NOT GROUND_TRUTH_VIEW_BODY
        // (which intentionally preserves the migration's own hand-authored
        // indentation for its own separate byte-exact test) -- proves the
        // hash formula and GROUND_TRUTH_VIEW_HASH's provenance independent
        // of anything extracted from the migration under test.
        const reconstructed = GROUND_TRUTH_VIEWDEF_TEXT[viewName] + '|security_invoker=true|postgres';
        expect(sha256hex(reconstructed)).toBe(GROUND_TRUTH_VIEW_HASH[viewName]);
      });
    }
  });

  describe('function creation definition matches independent ground-truth hash exactly (closes: function-body-only drift undetected)', () => {
    for (const fnName of FUNCTION_NAMES) {
      it(`${fnName}: canonicalized creation DDL hashes to exactly GROUND_TRUTH_FUNCTIONDEF_SHA256`, () => {
        // Uses the RAW `sql` (not comment-stripped `executable`): the live
        // prosrc/functiondef this hash was computed from includes the
        // function body's own SQL comments verbatim (PostgreSQL does not
        // strip them), so extraction for hashing purposes must too, or the
        // reconstructed text would never match regardless of correctness.
        const creation = creationBlockOf(sql);
        const block = extractDoBlock(creation, FUNCTION_TAG_MAP[fnName]);
        const { argsRaw, headerRegion, bodyText } = extractFunctionPieces(block, fnName);
        const reconstructed = reconstructFunctiondef(fnName, argsRaw, headerRegion, bodyText);
        const actualHash = sha256hex(reconstructed);
        expect(actualHash, `${fnName}: reconstructed creation DDL must hash to the independent ground truth`).toBe(
          GROUND_TRUTH_FUNCTIONDEF_SHA256[fnName],
        );
      });
    }

    it('extracted body text is non-empty for every function (weak structural guard only -- the actual proof that body-content drift changes the hash is the empirical scratch mutation matrix, run separately, not this test)', () => {
      // This does NOT by itself prove body-content-sensitivity; it only
      // guards against extractFunctionPieces silently returning an empty
      // body (which reconstructFunctiondef would still happily hash). The
      // real, empirical proof that removing e.g. a DELETE statement changes
      // the resulting hash and fails the test above lives in the scratch
      // mutation matrix (mutation case A.1), run and recorded separately.
      const creation = creationBlockOf(sql);
      for (const fnName of FUNCTION_NAMES) {
        const block = extractDoBlock(creation, FUNCTION_TAG_MAP[fnName]);
        const { bodyText } = extractFunctionPieces(block, fnName);
        expect(bodyText.length, `${fnName}: extracted body text must be non-empty`).toBeGreaterThan(10);
      }
    });
  });

  describe('view creation definition is semantically identical to the independent ground truth that GROUND_TRUTH_VIEW_HASH was computed from (closes: view-body-only drift undetected via the hash path)', () => {
    // PostgreSQL's pg_get_viewdef() always re-prints a view's query using
    // its OWN canonical (compact) indentation, discarding whatever
    // whitespace the original CREATE VIEW text used -- confirmed by diffing
    // the migration's own hand-authored indentation (GROUND_TRUTH_VIEW_BODY)
    // against GROUND_TRUTH_VIEWDEF_TEXT's PostgreSQL-native indentation:
    // they differ only in incidental whitespace, never in tokens. A
    // byte-exact hash match is therefore only meaningful against
    // PostgreSQL's own indentation (already proven self-consistent with
    // GROUND_TRUTH_VIEW_HASH above); detecting drift in the MIGRATION's own
    // text must instead use a whitespace-insensitive, token-preserving
    // comparison, which is what this test does -- any change to a keyword,
    // identifier, join, predicate, or clause anywhere in the view body
    // still fails this test, since only RUNS OF WHITESPACE are collapsed,
    // never any other token.
    function normalizeSqlWhitespace(s: string): string {
      return s.replace(/\s+/g, ' ').trim();
    }

    for (const viewName of VIEW_NAMES) {
      it(`${viewName}: whitespace-normalized creation-DDL body exactly equals the whitespace-normalized independent ground-truth pg_get_viewdef text`, () => {
        // Uses the RAW `sql` (not comment-stripped `executable`) for
        // consistency with the function-hash extraction above, even though
        // the view bodies themselves contain no SQL comments.
        const creation = creationBlockOf(sql);
        const block = extractDoBlock(creation, VIEW_TAG_MAP[viewName]);
        const headerMarker = `CREATE VIEW public.${viewName}\n      WITH (security_invoker=true) AS\n      `;
        const headerIdx = mustFind(block, headerMarker, `${viewName} CREATE VIEW header`);
        const bodyStart = headerIdx + headerMarker.length;
        const bodyEnd = mustFind(block, '\n    $sql$;', `${viewName} view body close tag`);
        const extractedBody = block.slice(bodyStart, bodyEnd);
        // Independently re-verify OWNER TO postgres and security_invoker=true
        // are literally present in this block before relying on them (both
        // are already separately, exactly asserted elsewhere in this file;
        // this additionally requires their presence in THIS specific block).
        expect(block.includes(`ALTER VIEW public.${viewName} OWNER TO postgres`)).toBe(true);
        expect(block.includes('WITH (security_invoker=true)')).toBe(true);

        const normalizedActual = normalizeSqlWhitespace(extractedBody);
        // Strip GROUND_TRUTH_VIEWDEF_TEXT's leading space and trailing ";"
        // (PostgreSQL-format-only artifacts, not part of the SELECT body
        // itself) before normalizing, so both sides represent the same
        // semantic unit.
        const groundTruthBody = GROUND_TRUTH_VIEWDEF_TEXT[viewName].replace(/^ /, '').replace(/;$/, '');
        const normalizedExpected = normalizeSqlWhitespace(groundTruthBody);
        expect(normalizedActual, `${viewName}: creation DDL body must be semantically identical to the independent ground truth`).toBe(
          normalizedExpected,
        );
      });
    }
  });

  describe('embedded identity-hash literals in preflight/postcheck exactly equal independent ground truth, with exact occurrence counts (closes: corrupted hash literal undetected)', () => {
    const ALL_GROUND_TRUTH_HASHES: Record<string, string> = { ...GROUND_TRUTH_VIEW_HASH, ...GROUND_TRUTH_FUNCTIONDEF_SHA256 };

    for (const objectName of [...VIEW_NAMES, ...FUNCTION_NAMES]) {
      it(`${objectName}: its independent ground-truth hash literal appears in the migration exactly 4 times (preflight expected+expected2, postcheck expected+expected2), never a different value`, () => {
        const groundTruthHash = ALL_GROUND_TRUTH_HASHES[objectName];
        expect(groundTruthHash, `${objectName}: must have a ground-truth hash defined`).toBeTruthy();

        const totalOccurrences = countOccurrences(executable, groundTruthHash);
        expect(totalOccurrences, `${objectName}: expected the ground-truth hash to appear exactly 4 times`).toBe(4);

        const preflight = preflightBlockOf(executable);
        const postcheck = postcheckBlockOf(executable);
        const preflightOccurrences = countOccurrences(preflight, groundTruthHash);
        const postcheckOccurrences = countOccurrences(postcheck, groundTruthHash);
        expect(preflightOccurrences, `${objectName}: expected exactly 2 copies in preflight (expected + expected2)`).toBe(2);
        expect(postcheckOccurrences, `${objectName}: expected exactly 2 copies in postcheck (expected + expected2)`).toBe(2);
      });
    }

    it('no unexpected/foreign hash-like literal (64 hex chars) appears anywhere in the 6-object VALUES tuples beyond the 6 known ground-truth hashes', () => {
      // Defends against a "duplicate one valid hash while corrupting
      // another copy" mutation being masked by only checking presence of
      // the correct hashes without checking that NOTHING ELSE is also
      // present in their place.
      const preflight = preflightBlockOf(executable);
      const postcheck = postcheckBlockOf(executable);
      const hexHashPattern = /\b[0-9a-f]{64}\b/g;
      for (const [label, block] of [
        ['preflight', preflight],
        ['postcheck', postcheck],
      ] as const) {
        const found = [...block.matchAll(hexHashPattern)].map((m) => m[0]);
        const foundCounts = new Map<string, number>();
        for (const h of found) foundCounts.set(h, (foundCounts.get(h) ?? 0) + 1);
        const knownHashes = new Set(Object.values(ALL_GROUND_TRUTH_HASHES));
        for (const [hash, count] of foundCounts) {
          expect(knownHashes.has(hash), `${label}: found an unrecognized 64-hex-char literal not among the 6 ground-truth hashes: ${hash}`).toBe(true);
          expect(count, `${label}: hash ${hash} expected exactly 2 occurrences in this block`).toBe(2);
        }
        expect(foundCounts.size, `${label}: expected exactly 6 distinct hash literals (one per object)`).toBe(6);
      }
    });
  });

  describe('volatility/strictness/parallel-safety/leakproof independently pinned per function (closes: attribute drift undetected)', () => {
    for (const fnName of FUNCTION_NAMES) {
      it(`${fnName}: creation DDL's derived volatility/strictness/parallel/leakproof exactly match independent ground truth`, () => {
        // Raw `sql`, for consistency with the hash-reconstruction tests
        // above (headerRegion itself contains no comments either way, but
        // using the same source throughout avoids this class of bug).
        const creation = creationBlockOf(sql);
        const block = extractDoBlock(creation, FUNCTION_TAG_MAP[fnName]);
        const { headerRegion } = extractFunctionPieces(block, fnName);
        const derived = deriveFunctionAttributes(fnName, headerRegion);
        expect(derived.volatility, `${fnName}: volatility`).toBe(GROUND_TRUTH_VOLATILITY[fnName]);
        expect(derived.strict, `${fnName}: strictness`).toBe(GROUND_TRUTH_STRICT[fnName]);
        expect(derived.parallel, `${fnName}: parallel safety`).toBe(GROUND_TRUTH_PARALLEL[fnName]);
        expect(derived.leakproof, `${fnName}: leakproof`).toBe(GROUND_TRUTH_LEAKPROOF[fnName]);
      });
    }

    it('no function\'s header region contains any non-default VOLATILE/STRICT/PARALLEL/LEAKPROOF token at all (defense-in-depth beyond the derived-value comparison above)', () => {
      const creation = creationBlockOf(sql);
      for (const fnName of FUNCTION_NAMES) {
        const block = extractDoBlock(creation, FUNCTION_TAG_MAP[fnName]);
        const { headerRegion } = extractFunctionPieces(block, fnName);
        expect(/\bIMMUTABLE\b|\bSTABLE\b|\bVOLATILE\b/.test(headerRegion), `${fnName}: no explicit volatility keyword expected (default)`).toBe(false);
        expect(/\bSTRICT\b|\bRETURNS\s+NULL\s+ON\s+NULL\s+INPUT\b/.test(headerRegion), `${fnName}: no STRICT keyword expected (default)`).toBe(false);
        expect(/\bPARALLEL\s+(SAFE|RESTRICTED|UNSAFE)\b/.test(headerRegion), `${fnName}: no explicit PARALLEL keyword expected (default)`).toBe(false);
        expect(/\bLEAKPROOF\b/.test(headerRegion), `${fnName}: no LEAKPROOF keyword expected (default)`).toBe(false);
      }
    });
  });

  describe('all declared GROUND_TRUTH_* constants are consumed by real assertions (no decorative/unused ground truth)', () => {
    it('GROUND_TRUTH_FUNCTIONDEF_SHA256 and GROUND_TRUTH_VIEW_HASH each have exactly the expected keys and are referenced by the hash-reconstruction and literal-occurrence describe blocks above', () => {
      expect(Object.keys(GROUND_TRUTH_FUNCTIONDEF_SHA256).sort()).toEqual(FUNCTION_NAMES);
      expect(Object.keys(GROUND_TRUTH_VIEW_HASH).sort()).toEqual(VIEW_NAMES);
      // Consumption proof: both constants are dereferenced by name (not
      // merely spread) in the "function/view creation definition matches
      // independent ground-truth hash exactly" and "embedded identity-hash
      // literals ... exact occurrence counts" describe blocks above -- this
      // assertion documents that fact; the actual proof is those tests
      // failing if the constants were removed or renamed (TypeScript would
      // fail to compile, and vitest would fail to run at all).
    });

    it('GROUND_TRUTH_VOLATILITY/STRICT/PARALLEL/LEAKPROOF each have exactly the 4 function names as keys and are referenced by the volatility/strictness/parallel/leakproof describe block above', () => {
      expect(Object.keys(GROUND_TRUTH_VOLATILITY).sort()).toEqual(FUNCTION_NAMES);
      expect(Object.keys(GROUND_TRUTH_STRICT).sort()).toEqual(FUNCTION_NAMES);
      expect(Object.keys(GROUND_TRUTH_PARALLEL).sort()).toEqual(FUNCTION_NAMES);
      expect(Object.keys(GROUND_TRUTH_LEAKPROOF).sort()).toEqual(FUNCTION_NAMES);
    });
  });
});
