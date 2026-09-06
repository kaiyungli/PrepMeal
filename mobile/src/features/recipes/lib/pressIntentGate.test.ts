/**
 * Unit tests for `PressIntentGate` — the arm/cancel delay state machine
 * `RecipeCard` uses to filter scroll-graze touches out of prefetch triggers.
 * Run with: `npm test` (node's built-in test runner, TS types stripped).
 *
 * Uses a fully fake, manually-driven timer (never a real `setTimeout` or a
 * jest-style fake-timers install) so every test is synchronous and
 * deterministic — the same style as `recipeDetailPrefetch.test.ts`'s
 * `deferred()` / `fakeFetcher()` helpers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { PressIntentGate, PRESS_INTENT_DELAY_MS, type PressIntentTimer } from './pressIntentGate.ts';

function fakeTimer() {
  let nextHandle = 1;
  const pending = new Map<number, () => void>();
  const timer: PressIntentTimer = {
    set(callback) {
      const handle = nextHandle++;
      pending.set(handle, callback);
      return handle;
    },
    clear(handle) {
      pending.delete(handle as number);
    },
  };
  return {
    timer,
    pendingCount: () => pending.size,
    fireAll() {
      const callbacks = [...pending.values()];
      pending.clear();
      for (const callback of callbacks) callback();
    },
  };
}

test('A: arming schedules exactly one pending timer', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);

  gate.arm(() => {});

  assert.equal(fake.pendingCount(), 1);
  assert.equal(gate.isArmed, true);
});

test('B: the timer firing calls the intent callback exactly once and disarms', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);
  let calls = 0;

  gate.arm(() => {
    calls += 1;
  });
  fake.fireAll();

  assert.equal(calls, 1);
  assert.equal(gate.isArmed, false, 'the gate disarms itself once fired');
});

test('C: cancel before the timer fires suppresses the intent callback', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);
  let calls = 0;

  gate.arm(() => {
    calls += 1;
  });
  gate.cancel();

  assert.equal(fake.pendingCount(), 0, 'the underlying timer handle was actually cleared');
  assert.equal(gate.isArmed, false);
  assert.equal(calls, 0, 'a cancelled arm never calls its intent — this is the scroll-graze case');
});

test('D: cancel after the callback already fired is a safe no-op', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);
  let calls = 0;

  gate.arm(() => {
    calls += 1;
  });
  fake.fireAll();
  gate.cancel();

  assert.equal(calls, 1, 'no second call from the redundant cancel');
});

test('E: cancel with nothing ever armed is a safe no-op', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);

  gate.cancel();

  assert.equal(gate.isArmed, false);
});

test('F: re-arming cancels any previously pending timer — only the latest can ever fire', () => {
  const fake = fakeTimer();
  const gate = new PressIntentGate(PRESS_INTENT_DELAY_MS, fake.timer);
  const calls: string[] = [];

  gate.arm(() => calls.push('first'));
  gate.arm(() => calls.push('second'));

  assert.equal(fake.pendingCount(), 1, 'the first timer was cancelled, only the second remains armed');
  fake.fireAll();
  assert.deepEqual(calls, ['second']);
});

test('G: defaults to the real setTimeout/clearTimeout when constructed with no timer arg', async () => {
  const gate = new PressIntentGate(5);
  let called = false;

  gate.arm(() => {
    called = true;
  });
  assert.equal(called, false, 'has not fired synchronously');

  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(called, true, 'fired after the real delay elapsed');
});

test('H: with the real timer, cancel before the delay elapses suppresses the callback', async () => {
  const gate = new PressIntentGate(10);
  let called = false;

  gate.arm(() => {
    called = true;
  });
  gate.cancel();

  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(called, false, 'the real underlying timer was genuinely cleared, not just ignored');
});
