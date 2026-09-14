// ===========================================================================
// adminRecipeExportFetch
// ---------------------------------------------------------------------------
// Pure, paginated row fetch for the admin recipe export route (export.js).
// PURE JAVASCRIPT -- no Supabase / client / server / env / Next imports. The
// route supplies small I/O callbacks (`fetchCount`, `fetchPage`) that hit
// PostgREST; this module owns the pagination algorithm and is safe to unit
// test with fake callbacks, no DB or client mocking.
//
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// A single unpaginated `.in('recipe_id', recipeIds)` select against
// `recipe_ingredients` / `recipe_steps` is silently capped by PostgREST's
// default max-rows setting (commonly 1000). Production already has 1,178
// `recipe_ingredients` rows and 1,138 `recipe_steps` rows -- both over that
// common cap -- so a plain `select()` with no `LIMIT` in the query text does
// NOT prove the response is complete; it proves nothing at all about
// completeness. This module:
//
//   1. Chunks the recipe-id `.in(...)` filter into bounded groups
//      (RECIPE_ID_CHUNK_SIZE) so the request URL never grows unbounded with
//      the recipe count.
//   2. Requires every exact-count result to be a concrete, non-negative safe
//      integer (`isValidExactCount`) BEFORE trusting it as a page-loop
//      target -- a `null`/`undefined`/fractional/negative count (a
//      misconfigured client, a broken count query) is never coerced to `0`
//      (`count || 0` would silently treat "count query is broken" as "zero
//      rows exist") and instead fails the fetch immediately, before any page
//      is requested.
//   3. Pages through every row with an explicit `.range(from, to)` in
//      CHILD_PAGE_SIZE-sized (<=500) steps, ordered by a unique, stable
//      column (`id`) so pagination never skips or duplicates rows. `from` is
//      anchored to rows actually collected so far, not `pageCallIndex *
//      pageSize`, so a server that returns fewer rows than requested for a
//      non-final page never causes a gap.
//   4. Never treats "fewer than `pageSize` rows came back" as its own
//      completion signal -- the loop only stops once the running total
//      matches the exact count fetched up front.
//   5. Fails the whole export (returns `{ error }`, no partial `{ rows }`)
//      the moment any count or page query errors, or if the final collected
//      total does not equal the expected exact count.
// ===========================================================================

export const CHILD_PAGE_SIZE = 500;
export const RECIPE_ID_CHUNK_SIZE = 50;

// Splits `ids` into consecutive groups of at most `size` -- used to bound
// both the `.in(...)` filter URL length and (indirectly, via the caller) the
// exact-count query issued per group.
export function chunkIds(ids, size = RECIPE_ID_CHUNK_SIZE) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

// A PostgREST exact count is only trustworthy as a page-loop target when it
// is a concrete, non-negative safe integer. `null`/`undefined` (a
// misconfigured or failed count query that didn't itself return an `error`),
// a fractional value, `NaN`, or a negative value must never be treated as
// "zero rows" -- they mean the count itself cannot be trusted.
export function isValidExactCount(count) {
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0;
}

// Pages through exactly `expectedCount` rows via `fetchPage(from, to)`,
// anchoring each request's `from` to rows actually collected so far. Returns
// `{ error }` (never a partial `{ rows }`) if `expectedCount` itself isn't a
// valid exact count, if any page errors, or if the final collected total
// does not exactly equal `expectedCount`.
async function fetchExactly(expectedCount, fetchPage, pageSize) {
  if (!isValidExactCount(expectedCount)) {
    return {
      error: `Invalid exact row count (got ${JSON.stringify(expectedCount)}). Refusing to export a result that cannot be verified complete.`,
    };
  }

  const rows = [];
  let collected = 0;

  while (collected < expectedCount) {
    // `from` is always the exact number of rows collected so far, NOT
    // `pageCallIndex * pageSize` -- if the server ever returns fewer rows
    // than requested for a non-final page (e.g. a `db-max-rows` cap below
    // our own pageSize), advancing by a fixed `pageSize` would silently skip
    // the un-returned rows in between. Anchoring `from` to `collected` makes
    // every next request start exactly where the last one left off,
    // regardless of how many rows the server actually chose to return.
    const from = collected;
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      return { error: error.message || String(error) };
    }

    const page = data || [];
    if (page.length === 0) break; // no more rows -- let the count check below catch a shortfall

    rows.push(...page);
    collected += page.length;
  }

  if (collected !== expectedCount) {
    return {
      error: `Row count mismatch: expected ${expectedCount} rows, collected ${collected}. Refusing to export a partial result.`,
    };
  }

  return { rows };
}

// Fetches every row of one root (non-id-filtered) table, given its own exact
// row count and a `fetchPage(from, to)` callback. Used for the top-level
// `recipes` select, which has no `.in(recipe_id, ...)` filter to chunk.
export async function fetchAllRows(count, fetchPage, { pageSize = CHILD_PAGE_SIZE } = {}) {
  return fetchExactly(count, fetchPage, pageSize);
}

// Fetches every row across every recipe-id chunk for one child table.
//
// `fetchCount(idChunk)` -> Promise<{ count, error }>  (exact, head-only)
// `fetchPage(idChunk, from, to)` -> Promise<{ data, error }>  (ordered, ranged)
//
// Returns `{ rows }` only if every chunk's collected row count exactly
// matched its own up-front, validated exact count; otherwise returns
// `{ error }` and `rows` is never populated -- callers must not use a
// partial result.
export async function fetchAllChildRows(
  recipeIds,
  { fetchCount, fetchPage, pageSize = CHILD_PAGE_SIZE, idChunkSize = RECIPE_ID_CHUNK_SIZE },
) {
  const rows = [];

  for (const idChunk of chunkIds(recipeIds || [], idChunkSize)) {
    if (idChunk.length === 0) continue;

    const { count, error: countError } = await fetchCount(idChunk);
    if (countError) {
      return { error: countError.message || String(countError) };
    }

    const chunkResult = await fetchExactly(count, (from, to) => fetchPage(idChunk, from, to), pageSize);
    if (chunkResult.error) {
      return { error: chunkResult.error };
    }

    rows.push(...chunkResult.rows);
  }

  return { rows };
}
