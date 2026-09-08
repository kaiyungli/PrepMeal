/**
 * Auth-identity scope key for the plans feature's in-memory client state.
 *
 * NOT a security boundary. Row ownership is enforced entirely by Supabase RLS
 * (`user_id = auth.uid()`) on `menu_plans` / `menu_plan_items`; nothing here
 * adds a `.eq('user_id', …)` filter. Its only job is to give the list / detail
 * controllers a STABLE key that changes the instant the authenticated identity
 * changes, so React state already loaded for user A is dropped — never
 * rendered — once the session belongs to user B. RLS protects the next
 * database read; it cannot scrub stale state already held in memory.
 *
 * Scope is the stable `user.id`, NEVER the `Session` object: a token refresh
 * for the same user produces a new `Session` but the same id, so it must not
 * invalidate or refetch anything.
 *
 * Zero value imports (the `AuthStatus` import is types-only, erased at
 * runtime) — unit-tested directly by `node --test`.
 */
import type { AuthStatus } from '@/features/auth';

/** `null` means "no owned scope": signed out, still restoring, or errored. */
export type AuthScope = string | null;

/**
 * The current auth scope: the signed-in user's id, or `null` for every
 * non-`signedIn` status — and, defensively, when a signed-in session somehow
 * carries no usable id.
 */
export function authScopeKey(
  status: AuthStatus,
  userId: string | null | undefined,
): AuthScope {
  return status === 'signedIn' && typeof userId === 'string' && userId !== ''
    ? userId
    : null;
}

/**
 * How an auth-scoped controller must treat its committed state THIS render,
 * given the scope that produced that state (`dataScope`) and the scope now in
 * effect (`currentScope`):
 *
 *   - `'idle'`    — no current scope (signed out / restoring): surface nothing.
 *   - `'show'`    — scopes match: the committed state belongs to this identity.
 *   - `'loading'` — scopes differ while signed in: the committed state still
 *                   holds the PREVIOUS identity's data and the re-scoped fetch
 *                   has not landed yet. The caller MUST render loading and must
 *                   NOT surface that stale data while waiting for the effect
 *                   cleanup / refetch.
 */
export type ScopeResolution = 'idle' | 'show' | 'loading';

export function resolveScope(
  dataScope: AuthScope,
  currentScope: AuthScope,
): ScopeResolution {
  if (currentScope === null) return 'idle';
  if (dataScope === currentScope) return 'show';
  return 'loading';
}
