/**
 * A minimal SYNCHRONOUS mutual-exclusion lock for "one auth attempt at a time".
 *
 * React `busy` state only reflects a change on the next render, so two taps in
 * the same tick both read the old value and both start a request. This lock
 * flips on `tryAcquire()` synchronously, so the second tap is rejected before it
 * can begin a second sign-in.
 *
 * Pure + framework-free (NO React, NO Expo) — unit-tested directly. `<SignInScreen>`
 * holds one instance in a `useRef` and shares it across the password, Apple and
 * Google handlers:
 *   - `tryAcquire()` at the very top of each handler; bail out on `false`;
 *   - `release()` immediately on validation failure / cancel / error;
 *   - on SUCCESS keep it held while awaiting `SIGNED_IN`, and release only
 *     through the existing signed-in/dismiss or watchdog/failure lifecycle.
 */

export interface AuthAttemptLock {
  /** Take the lock. Returns `false` when already held — caller must return. */
  tryAcquire(): boolean;
  /** Release the lock. Idempotent. */
  release(): void;
  /** Current state — for assertions / debugging. */
  isHeld(): boolean;
}

export function createAuthLock(): AuthAttemptLock {
  let held = false;
  return {
    tryAcquire() {
      if (held) return false;
      held = true;
      return true;
    },
    release() {
      held = false;
    },
    isHeld() {
      return held;
    },
  };
}
