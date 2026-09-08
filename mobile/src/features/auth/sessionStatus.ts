/**
 * Pure projection of the restore-race fence state onto the public auth status
 * the app renders. No React, no Supabase — unit-tested directly.
 */
import type { FenceState } from './restoreEpoch';

export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut' | 'error';

/**
 * `restoring`  — the fence has not settled yet (no restore result, no event).
 * `error`      — the single `getSession()` restore settled as an error.
 * `signedIn`   — settled with a session (from the restore or a real event).
 * `signedOut`  — settled with no session.
 */
export function deriveAuthStatus(s: FenceState): AuthStatus {
  if (s.phase === 'restoring' || s.applied === null) return 'restoring';
  if (s.isError) return 'error';
  return s.session ? 'signedIn' : 'signedOut';
}

export function isSignedIn(s: FenceState): boolean {
  return deriveAuthStatus(s) === 'signedIn';
}
