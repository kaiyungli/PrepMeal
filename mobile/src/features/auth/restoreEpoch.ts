/**
 * Restore-race fence — a pure epoch reducer.
 *
 * NO React, NO Supabase import: this module is unit-tested directly by the
 * repo's `node --test` runner (see `restoreEpoch.test.ts`). `SessionProvider`
 * wires it to the real Supabase auth stream.
 *
 * CONTRACT (mobile-slice-4a-auth-design.md §3.1 / §3.1a):
 *  - The provider subscribes `onAuthStateChange` FIRST, then calls `getSession()`
 *    exactly once, tagging it with the epoch captured *before* the call.
 *  - `INITIAL_SESSION` is completely inert: `isSupersedingEvent` returns `false`
 *    and `onEvent` returns the same state reference — no epoch bump, no settle.
 *  - Every real later event (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, …)
 *    advances the epoch and takes public state immediately, thereby fencing out
 *    any still-pending (now stale) `getSession()` result or error.
 *  - A `getSession()` result / error is applied only when its captured epoch
 *    still matches AND no event has been applied since — otherwise it is dropped.
 *  - The unmount guard (`active`) lives in the provider, not here.
 */

/**
 * The session value is held opaquely — this module never inspects it, only
 * stores and hands it back. `SessionProvider` owns the cast to the real
 * `@supabase/supabase-js` `Session` type.
 */
export type FenceSession = unknown;

export type FencePhase = 'restoring' | 'settled';
export type FenceSource = 'restore' | 'event';

export interface FenceState {
  phase: FencePhase;
  /** Monotonic; bumped only by a *superseding* auth event. */
  epoch: number;
  /** Which input last settled the fence, or `null` while still restoring. */
  applied: FenceSource | null;
  session: FenceSession | null;
  /** `true` when the single `getSession()` restore settled as an error. */
  isError: boolean;
}

export function initFence(): FenceState {
  return { phase: 'restoring', epoch: 0, applied: null, session: null, isError: false };
}

/**
 * Is this `onAuthStateChange` event allowed to supersede the pending restore?
 * `INITIAL_SESSION` is the post-subscribe echo (it typically carries the same
 * session `getSession()` is about to return); letting it advance the epoch would
 * fence out the very restore it duplicates, so it must be completely inert.
 */
export function isSupersedingEvent(event: string): boolean {
  return event !== 'INITIAL_SESSION';
}

/**
 * Apply a real auth event. Returns the SAME state reference (a no-op) for a
 * non-superseding event (`INITIAL_SESSION`) — no epoch bump, no settle, no
 * `applied`/`session` change. A superseding event always wins: it settles the
 * fence, bumps the epoch, clears any prior error, and takes the new session.
 */
export function onEvent(
  s: FenceState,
  session: FenceSession | null,
  event: string,
): FenceState {
  if (!isSupersedingEvent(event)) return s;
  return {
    phase: 'settled',
    epoch: s.epoch + 1,
    applied: 'event',
    session: session ?? null,
    isError: false,
  };
}

/**
 * True when a `getSession()` result/error issued at `issuedAtEpoch` has been
 * superseded and must be dropped: the epoch moved, or an event already settled
 * the fence.
 */
export function isRestoreStale(s: FenceState, issuedAtEpoch: number): boolean {
  return issuedAtEpoch !== s.epoch || s.applied === 'event';
}

/**
 * Apply the single `getSession()` success result. Accepted only when it is not
 * stale (`isRestoreStale` === false); otherwise returns the SAME state
 * reference so the caller can detect the drop.
 */
export function onRestore(
  s: FenceState,
  session: FenceSession | null,
  issuedAtEpoch: number,
): FenceState {
  if (isRestoreStale(s, issuedAtEpoch)) return s;
  return {
    phase: 'settled',
    epoch: s.epoch,
    applied: 'restore',
    session: session ?? null,
    isError: false,
  };
}

/**
 * Apply a `getSession()` rejection. Same staleness fence as `onRestore` — an
 * error that lost the race to a superseding event is dropped (same reference
 * returned). When accepted it settles the fence as signed-out + error.
 */
export function onRestoreError(s: FenceState, issuedAtEpoch: number): FenceState {
  if (isRestoreStale(s, issuedAtEpoch)) return s;
  return {
    phase: 'settled',
    epoch: s.epoch,
    applied: 'restore',
    session: null,
    isError: true,
  };
}
