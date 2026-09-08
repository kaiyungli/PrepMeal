/**
 * Unit tests for the restore-race fence. Run with: `npm test`.
 * Pure module — no React, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initFence,
  isRestoreStale,
  isSupersedingEvent,
  onEvent,
  onRestore,
  onRestoreError,
} from './restoreEpoch.ts';

const sess = (token = 'a') => ({ access_token: token, user: { id: 'u1' } });

test('restore accepted when no newer event', () => {
  const s = onRestore(initFence(), sess(), 0);
  assert.equal(s.applied, 'restore');
  assert.equal(s.phase, 'settled');
  assert.equal(s.epoch, 0);
  assert.equal(s.isError, false);
  assert.deepEqual(s.session, sess());
});

test('SIGNED_IN event beats a stale restore', () => {
  const inSess = sess('signed-in');
  const s1 = onEvent(initFence(), inSess, 'SIGNED_IN');
  assert.equal(s1.epoch, 1);
  assert.equal(s1.applied, 'event');
  assert.equal(s1.session, inSess);

  // getSession() was issued at epoch 0 -> now stale.
  const s2 = onRestore(s1, sess('stale'), 0);
  assert.equal(s2, s1, 'stale restore returns the same reference (dropped)');
});

test('SIGNED_OUT event beats a stale restore', () => {
  const s1 = onEvent(initFence(), null, 'SIGNED_OUT');
  assert.equal(s1.epoch, 1);
  assert.equal(s1.applied, 'event');
  assert.equal(s1.session, null);

  const s2 = onRestore(s1, sess('stale'), 0);
  assert.equal(s2, s1);
});

test('INITIAL_SESSION does not advance the epoch and does not suppress the pending restore', () => {
  assert.equal(isSupersedingEvent('INITIAL_SESSION'), false);
  assert.equal(isSupersedingEvent('SIGNED_IN'), true);
  assert.equal(isSupersedingEvent('TOKEN_REFRESHED'), true);
  assert.equal(isSupersedingEvent('SIGNED_OUT'), true);

  const s0 = initFence();
  const s1 = onEvent(s0, sess('echo'), 'INITIAL_SESSION');
  assert.equal(s1, s0, 'INITIAL_SESSION returns the same reference');
  assert.deepEqual(s1, {
    phase: 'restoring',
    epoch: 0,
    applied: null,
    session: null,
    isError: false,
  });

  // The authoritative restore still applies afterwards.
  const restored = sess('authoritative');
  const s2 = onRestore(s1, restored, 0);
  assert.equal(s2.applied, 'restore');
  assert.equal(s2.phase, 'settled');
  assert.equal(s2.session, restored);
});

test('unmounted provider cannot write (external `active` guard drops every commit)', () => {
  // The reducer is mount-agnostic; the provider gates every commit behind
  // `active`. Simulate the provider rule and assert zero commits after unmount.
  let active = true;
  let committed = 0;
  const commit = (prev, next) => {
    if (!active) return prev;
    committed += 1;
    return next;
  };

  let s = initFence();
  active = false; // unmounted

  s = commit(s, onRestore(s, sess(), 0));
  s = commit(s, onEvent(s, sess('x'), 'SIGNED_IN'));
  s = commit(s, onRestoreError(s, 0));

  assert.equal(committed, 0);
  assert.deepEqual(s, initFence(), 'state unchanged after unmount');
});

test('event after an accepted restore still supersedes', () => {
  const restored = onRestore(initFence(), sess('r'), 0);
  assert.equal(restored.applied, 'restore');

  const refreshed = sess('refreshed');
  const s = onEvent(restored, refreshed, 'TOKEN_REFRESHED');
  assert.equal(s.epoch, 1);
  assert.equal(s.applied, 'event');
  assert.equal(s.session, refreshed);
});

test('stale getSession() error is fenced after a superseding event', () => {
  const s1 = onEvent(initFence(), sess('live'), 'SIGNED_IN'); // epoch 1
  assert.equal(isRestoreStale(s1, 0), true);
  const s2 = onRestoreError(s1, 0); // error from the call issued at epoch 0
  assert.equal(s2, s1, 'stale error dropped — live session preserved');
  assert.equal(s2.isError, false);
});

test('getSession() error accepted when it wins the race', () => {
  const s = onRestoreError(initFence(), 0);
  assert.equal(s.isError, true);
  assert.equal(s.phase, 'settled');
  assert.equal(s.applied, 'restore');
  assert.equal(s.session, null);
});

test('isRestoreStale: fresh at matching epoch, stale on mismatch or prior event', () => {
  const fresh = initFence();
  assert.equal(isRestoreStale(fresh, 0), false);
  assert.equal(isRestoreStale(fresh, 1), true);
  assert.equal(isRestoreStale(onEvent(fresh, null, 'SIGNED_OUT'), 1), true);
});
