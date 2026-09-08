/**
 * Unit tests for the plan-id route-param guard.
 * Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizePlanId } from './planId.ts';

const UUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

test('accepts a well-formed UUID (any case) and trims surrounding space', () => {
  assert.equal(normalizePlanId(UUID), UUID);
  assert.equal(normalizePlanId(UUID.toUpperCase()), UUID.toUpperCase());
  assert.equal(normalizePlanId(`  ${UUID}  `), UUID);
});

test('accepts the param arriving as a string[] (first element)', () => {
  assert.equal(normalizePlanId([UUID, 'ignored']), UUID);
});

test('returns null for missing / empty / malformed ids', () => {
  for (const value of [
    undefined,
    null,
    '',
    '   ',
    'not-a-uuid',
    '123',
    `${UUID}-extra`,
    'my-plans',
    42,
    {},
  ]) {
    assert.equal(normalizePlanId(value), null, JSON.stringify(value));
  }
});

test('returns null for an empty array', () => {
  assert.equal(normalizePlanId([]), null);
});
