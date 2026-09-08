/**
 * Engine provenance check.
 *
 * The planner engine under `engine/` is a VENDORED copy of the web planner
 * (`~/projects/PrepMeal/src/lib/mealPlanner.ts` and its pure deps). Web `src/`
 * and `mobile/` cannot share code at runtime (separate Expo package, default
 * Metro is project-root scoped, the web module pulls `next` / DOM globals), so
 * the copy is kept honest by this test instead:
 *
 *   1. Re-hash each LIVE web source file and assert it still matches the
 *      SHA-256 recorded in `provenance.json`. If the web planner changed, this
 *      goes red — the fix is to re-vendor, re-review, and regenerate the
 *      parity vectors (`__fixtures__/expected/*.json`).
 *   2. For files vendored verbatim, also assert the local copy is byte-identical
 *      to the web source.
 *   3. For transformed files (`verbatim: false` — `mealPlanner.ts`,
 *      `generateWeeklyPlan.ts`), take the LIVE web source, apply ONLY the
 *      explicitly approved import-specifier `replacements` from
 *      `provenance.json`, and assert the result is byte-for-byte identical to
 *      the vendored copy. Each `from` must occur exactly once (the swap set is
 *      closed and unambiguous), and its `to` must not already be present. This
 *      means any edit to the mobile planner's own logic — anything beyond those
 *      fixed specifier swaps — fails this test.
 *
 * Deliberately simple: whole-file SHA-256 + a closed literal-swap set, no
 * source normalisation / regex / AST. Run from `mobile/` via `npm test`; the
 * web repo sits at `../../../../..`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ENGINE_DIR = import.meta.dirname;
const REPO_ROOT = path.resolve(ENGINE_DIR, '../../../../..');

interface ImportReplacement {
  from: string;
  to: string;
}
interface ProvenanceEntry {
  vendored: string;
  webSource: string;
  webSha256: string;
  webGitBlob: string;
  verbatim: boolean;
  transform: string;
  /** Closed set of literal swaps for `verbatim: false` files (import specifiers only). */
  replacements?: ImportReplacement[];
}
interface Provenance {
  webRepoCommit: string;
  files: ProvenanceEntry[];
}

const provenance = JSON.parse(
  readFileSync(path.join(ENGINE_DIR, 'provenance.json'), 'utf8'),
) as Provenance;

function sha256(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Apply the approved import-specifier swaps to the web source text. Each `from`
 * must appear exactly once and its `to` must not already be present — so the
 * swap set is closed, unambiguous, and cannot silently absorb a logic edit.
 */
function applyApprovedReplacements(
  webSource: string,
  replacements: ImportReplacement[],
): string {
  let out = webSource;
  for (const { from, to } of replacements) {
    const occurrences = out.split(from).length - 1;
    assert.equal(
      occurrences,
      1,
      `approved replacement ${JSON.stringify(from)} must occur exactly once in the web source, found ${occurrences}`,
    );
    assert.equal(
      out.includes(to),
      false,
      `approved replacement target ${JSON.stringify(to)} is already present in the web source`,
    );
    out = out.replace(from, to);
  }
  return out;
}

test('provenance.json records a web repo commit', () => {
  assert.match(provenance.webRepoCommit, /^[0-9a-f]{40}$/);
  assert.ok(provenance.files.length >= 5);
});

for (const entry of provenance.files) {
  test(`web source unchanged: ${entry.webSource}`, () => {
    const webPath = path.join(REPO_ROOT, entry.webSource);
    let actual: string;
    try {
      actual = sha256(webPath);
    } catch (err) {
      assert.fail(
        `Cannot read web source ${entry.webSource} at ${webPath}: ${
          (err as Error).message
        }. The mobile engine is a vendored copy that must be verified against the web repo.`,
      );
    }
    assert.equal(
      actual,
      entry.webSha256,
      `Web planner source ${entry.webSource} changed since it was vendored ` +
        `(recorded commit ${provenance.webRepoCommit.slice(0, 7)}). Re-vendor, ` +
        `re-review, and regenerate __fixtures__/expected/*.json.`,
    );
  });

  if (entry.verbatim) {
    test(`vendored copy is byte-identical: engine/${entry.vendored}`, () => {
      const localSha = sha256(path.join(ENGINE_DIR, entry.vendored));
      assert.equal(
        localSha,
        entry.webSha256,
        `engine/${entry.vendored} is marked verbatim but differs from ` +
          `${entry.webSource}.`,
      );
    });
  } else {
    test(`vendored copy = web source + approved replacements only: engine/${entry.vendored}`, () => {
      assert.ok(
        entry.replacements && entry.replacements.length > 0,
        `transformed file ${entry.vendored} must declare a non-empty "replacements" set in provenance.json.`,
      );

      const webText = readFileSync(path.join(REPO_ROOT, entry.webSource), 'utf8');
      const transformed = applyApprovedReplacements(webText, entry.replacements);
      const local = readFileSync(path.join(ENGINE_DIR, entry.vendored), 'utf8');

      // Byte-for-byte: the vendored file must equal the web source with ONLY
      // the approved import-specifier swaps applied. Any other change — i.e.
      // any edit to the mobile planner logic — makes this fail.
      assert.equal(
        Buffer.from(local).equals(Buffer.from(transformed)),
        true,
        `engine/${entry.vendored} differs from ${entry.webSource} by more than ` +
          `the approved import-specifier replacements. The vendored planner must ` +
          `carry NO logic changes; re-vendor from the web source instead.`,
      );
    });
  }
}
