/**
 * Unit tests for the synchronous auth-attempt lock. Run with: `npm test`.
 * Pure module — no React, no Expo, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAuthLock } from './authLock.ts';

test('first tryAcquire wins; further attempts are rejected until release', () => {
  const lock = createAuthLock();
  assert.equal(lock.isHeld(), false);

  assert.equal(lock.tryAcquire(), true);
  assert.equal(lock.isHeld(), true);

  // Rapid double / triple tap in the same tick — no second request may start.
  assert.equal(lock.tryAcquire(), false);
  assert.equal(lock.tryAcquire(), false);

  lock.release();
  assert.equal(lock.isHeld(), false);
  assert.equal(lock.tryAcquire(), true); // the next genuine attempt is allowed
});

test('release is idempotent', () => {
  const lock = createAuthLock();
  lock.tryAcquire();
  lock.release();
  lock.release();
  assert.equal(lock.isHeld(), false);
  assert.equal(lock.tryAcquire(), true);
});

test('success path: stays held across the await, released by the lifecycle', () => {
  const lock = createAuthLock();
  assert.equal(lock.tryAcquire(), true);

  // signInWithApple()/Password() resolved ok -> screen now awaits SIGNED_IN.
  assert.equal(lock.tryAcquire(), false); // still locked; no new attempt

  // SIGNED_IN dismiss effect OR watchdog fires:
  lock.release();
  assert.equal(lock.tryAcquire(), true);
});

test('instances are independent', () => {
  const a = createAuthLock();
  const b = createAuthLock();
  assert.equal(a.tryAcquire(), true);
  assert.equal(b.tryAcquire(), true);
  assert.equal(a.tryAcquire(), false);
  assert.equal(b.tryAcquire(), false);
});
