/**
 * Unit tests for the fence-state -> AuthStatus projection. Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { initFence, onEvent, onRestore, onRestoreError } from './restoreEpoch.ts';
import { deriveAuthStatus, isSignedIn } from './sessionStatus.ts';

const sess = () => ({ access_token: 't', user: { id: 'u' } });

test('restoring while the fence has not settled', () => {
  assert.equal(deriveAuthStatus(initFence()), 'restoring');
  assert.equal(isSignedIn(initFence()), false);
});

test('signedIn when a session was applied — restore or event', () => {
  const viaRestore = onRestore(initFence(), sess(), 0);
  assert.equal(deriveAuthStatus(viaRestore), 'signedIn');
  assert.equal(isSignedIn(viaRestore), true);

  const viaEvent = onEvent(initFence(), sess(), 'SIGNED_IN');
  assert.equal(deriveAuthStatus(viaEvent), 'signedIn');
});

test('signedOut when settled with no session', () => {
  assert.equal(deriveAuthStatus(onRestore(initFence(), null, 0)), 'signedOut');
  assert.equal(deriveAuthStatus(onEvent(initFence(), null, 'SIGNED_OUT')), 'signedOut');
});

test('error when the restore settled as an error', () => {
  assert.equal(deriveAuthStatus(onRestoreError(initFence(), 0)), 'error');
});

test('a superseding event after an error clears it', () => {
  const errored = onRestoreError(initFence(), 0);
  assert.equal(deriveAuthStatus(errored), 'error');
  const recovered = onEvent(errored, { access_token: 't', user: { id: 'u' } }, 'SIGNED_IN');
  assert.equal(deriveAuthStatus(recovered), 'signedIn');
});
