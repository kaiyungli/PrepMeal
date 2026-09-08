/**
 * Unit tests for the auth-identity scope helpers.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { authScopeKey, resolveScope } from './authScope.ts';

test('authScopeKey returns the user id only while signed in', () => {
  assert.equal(authScopeKey('signedIn', 'user-a'), 'user-a');
  assert.equal(authScopeKey('restoring', 'user-a'), null);
  assert.equal(authScopeKey('signedOut', 'user-a'), null);
  assert.equal(authScopeKey('error', 'user-a'), null);
});

test('authScopeKey is null when signed in without a usable id', () => {
  assert.equal(authScopeKey('signedIn', null), null);
  assert.equal(authScopeKey('signedIn', undefined), null);
  assert.equal(authScopeKey('signedIn', ''), null);
});

test('authScopeKey is stable across calls with the same id (token refresh)', () => {
  // A `TOKEN_REFRESHED` event yields a new Session object but the same id;
  // the derived scope must be byte-identical so effect deps do not change.
  assert.equal(
    authScopeKey('signedIn', 'user-a'),
    authScopeKey('signedIn', 'user-a'),
  );
});

test('resolveScope: no current scope surfaces nothing', () => {
  assert.equal(resolveScope(null, null), 'idle');
  assert.equal(resolveScope('user-a', null), 'idle');
});

test('resolveScope: matching scope shows the committed state', () => {
  assert.equal(resolveScope('user-a', 'user-a'), 'show');
});

test('resolveScope: mismatched scope while signed in forces loading, never stale data', () => {
  // user A data, session now belongs to user B → render loading, not A's data.
  assert.equal(resolveScope('user-a', 'user-b'), 'loading');
  // nothing committed yet, signed in → loading (cold load).
  assert.equal(resolveScope(null, 'user-b'), 'loading');
});
