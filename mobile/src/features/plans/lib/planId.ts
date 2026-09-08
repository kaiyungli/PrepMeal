/**
 * Plan-id route-param guard.
 *
 * `menu_plans.id` is always a `gen_random_uuid()` UUID. Anything that is not a
 * well-formed UUID (missing param, a stray path segment, a hand-typed value)
 * can never match a row, so we normalise it to `null` up front and the
 * controller renders the SAME neutral "not found" state it uses for a plan
 * that exists but is filtered out by RLS (owned by another user). This keeps
 * "malformed id" and "not your plan" indistinguishable to the client — the
 * app never reveals whether a given id belongs to someone else, and a bad id
 * never reaches Postgres as an invalid-uuid query error.
 *
 * Pure, zero imports — unit-tested directly by `node --test`.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the trimmed UUID string when `raw` is (or, for a `string[]`, starts
 * with) a well-formed UUID; otherwise `null`.
 */
export function normalizePlanId(
  raw: string | string[] | undefined | null,
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}
