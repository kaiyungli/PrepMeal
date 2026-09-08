/**
 * Unit tests for the combined identity + route-id resolver.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePlanDetailScope } from './planDetailScope.ts';

test('idle when there is no current identity, whatever the plan id', () => {
  assert.equal(resolvePlanDetailScope(null, null, null, null), 'idle');
  assert.equal(
    resolvePlanDetailScope('user-a', 'plan-a', null, 'plan-a'),
    'idle',
  );
});

test('loading when the identity changed, even if the plan id still matches', () => {
  assert.equal(
    resolvePlanDetailScope('user-a', 'plan-a', 'user-b', 'plan-a'),
    'loading',
  );
});

test('loading when the identity matches but the route plan id changed A -> B', () => {
  assert.equal(
    resolvePlanDetailScope('user-a', 'plan-a', 'user-a', 'plan-b'),
    'loading',
  );
});

test('loading when the route id became malformed / missing (null) while state holds a plan', () => {
  assert.equal(
    resolvePlanDetailScope('user-a', 'plan-a', 'user-a', null),
    'loading',
  );
});

test('loading when signed in but nothing is committed yet (cold load)', () => {
  assert.equal(
    resolvePlanDetailScope(null, null, 'user-a', 'plan-a'),
    'loading',
  );
});

test('show only when BOTH the identity and the normalized plan id match', () => {
  assert.equal(
    resolvePlanDetailScope('user-a', 'plan-a', 'user-a', 'plan-a'),
    'show',
  );
});

test('a null data id matches a null current id so the neutral not-found state can render', () => {
  assert.equal(resolvePlanDetailScope('user-a', null, 'user-a', null), 'show');
});
