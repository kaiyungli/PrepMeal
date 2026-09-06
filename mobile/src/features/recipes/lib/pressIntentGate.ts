/**
 * Press-intent gate — delays a callback (e.g. starting a prefetch) behind a
 * short (~60-80ms), cancellable window armed on touch-down.
 *
 * PURPOSE: `RecipeCard`'s raw `onPressIn` fires on EVERY touch-down,
 * including a scroll-graze — a finger that brushes a row while the list is
 * mid-scroll, immediately followed by the `FlatList`'s pan responder taking
 * over the touch, never an actual navigation. A concurrency bound on the
 * prefetch registry alone doesn't stop this: during a long scroll, completed
 * grazed requests keep freeing up slots for the next graze, so unbounded time
 * can still add up to many unwanted prefetches in one session.
 *
 * A genuine deliberate tap holds contact for noticeably longer than a
 * scroll-graze's touch-down-to-responder-handoff gap. Arming the intent
 * callback on press-in and cancelling it on press-out (release, OR the
 * responder being taken over by a scroll — React Native calls `onPressOut`
 * for both) filters out almost every graze while a real tap still fires well
 * within the ~250-300ms native screen-push transition.
 *
 * Deliberately framework-free (no React) so the arm/cancel state machine is
 * independently unit-testable with a fake, manually-driven timer — see
 * `pressIntentGate.test.ts`. `RecipeCard` wires this to `Pressable`'s
 * `onPressIn`/`onPressOut`; navigation itself (`onPress`) is NEVER gated by
 * this, so accessibility activation (which drives `onPress` directly, without
 * necessarily holding a simulated press-in long enough to arm) still
 * navigates normally even on the run where no prefetch head start happens.
 */

/** Default arm delay: short enough to still meaningfully overlap the native
 *  screen-push transition, long enough that a genuine tap's hold duration
 *  reliably exceeds it while a scroll-graze's does not. */
export const PRESS_INTENT_DELAY_MS = 70;

export interface PressIntentTimer {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

const REAL_TIMER: PressIntentTimer = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * One gate per press target (e.g. one instance per `RecipeCard`). `arm()` is
 * safe to call repeatedly — it always cancels any previously armed timer
 * first, so at most one callback can ever be pending at a time.
 */
export class PressIntentGate {
  private handle: unknown = null;
  private readonly delayMs: number;
  private readonly timer: PressIntentTimer;

  constructor(delayMs: number = PRESS_INTENT_DELAY_MS, timer: PressIntentTimer = REAL_TIMER) {
    this.delayMs = delayMs;
    this.timer = timer;
  }

  /** Arm `onIntent` to fire after `delayMs` unless `cancel()` is called first. */
  arm(onIntent: () => void): void {
    this.cancel();
    this.handle = this.timer.set(() => {
      this.handle = null;
      onIntent();
    }, this.delayMs);
  }

  /** Cancel a pending arm, if any. Safe to call with nothing armed. */
  cancel(): void {
    if (this.handle === null) return;
    this.timer.clear(this.handle);
    this.handle = null;
  }

  /** `true` while a callback is pending — for tests. */
  get isArmed(): boolean {
    return this.handle !== null;
  }
}
