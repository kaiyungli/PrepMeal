/**
 * Unit tests for the pure sign-in credential validation. Run with: `npm test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateCredentials,
  validateOtpToken,
  validateSignUp,
} from './credentials.ts';

test('rejects empty / whitespace email', () => {
  assert.equal(validateCredentials('', 'secret1').ok, false);
  assert.equal(validateCredentials('   ', 'secret1').ok, false);
});

test('rejects obviously malformed emails', () => {
  for (const bad of ['foo', 'foo@', '@bar.com', 'foo bar@baz.com', 'foo@bar', 'a@b.']) {
    assert.equal(validateCredentials(bad, 'secret1').ok, false, bad);
  }
});

test('rejects empty and too-short passwords', () => {
  assert.equal(validateCredentials('a@b.com', '').ok, false);
  assert.equal(validateCredentials('a@b.com', '12345').ok, false);
});

test('accepts a well-formed pair', () => {
  assert.deepEqual(validateCredentials('user@example.com', 'secret1'), { ok: true });
});

test('trims the email before validating', () => {
  assert.deepEqual(
    validateCredentials('  user@example.com  ', 'secret1'),
    { ok: true },
  );
});

test('error messages are user-safe strings', () => {
  const r = validateCredentials('nope', '');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(typeof r.error, 'string');
});

// ── validateSignUp: email + password rules, then confirm-password match ──

test('validateSignUp: inherits every email/password rejection from validateCredentials', () => {
  assert.equal(validateSignUp('', 'secret1', 'secret1').ok, false);
  assert.equal(validateSignUp('nope', 'secret1', 'secret1').ok, false);
  assert.equal(validateSignUp('a@b.com', '', '').ok, false);
  assert.equal(validateSignUp('a@b.com', '12345', '12345').ok, false);
});

test('validateSignUp: rejects an empty confirm field', () => {
  const r = validateSignUp('user@example.com', 'secret1', '');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, '請再次輸入密碼。');
});

test('validateSignUp: rejects a confirm mismatch (even by one char / trailing space)', () => {
  for (const confirm of ['secret2', 'secret1 ', 'Secret1', 'secret']) {
    const r = validateSignUp('user@example.com', 'secret1', confirm);
    assert.equal(r.ok, false, confirm);
    if (!r.ok) assert.equal(r.error, '兩次輸入的密碼不一致。');
  }
});

test('validateSignUp: accepts a matching, valid triple', () => {
  assert.deepEqual(
    validateSignUp('  user@example.com  ', 'secret1', 'secret1'),
    { ok: true },
  );
});

// ── validateOtpToken: exactly 6 digits ──

test('validateOtpToken: rejects empty / whitespace', () => {
  assert.equal(validateOtpToken('').ok, false);
  assert.equal(validateOtpToken('   ').ok, false);
});

test('validateOtpToken: rejects wrong length or non-digits', () => {
  for (const bad of ['12345', '1234567', '12 456', 'abcdef', '12345a', '-12345', '1.2345']) {
    assert.equal(validateOtpToken(bad).ok, false, bad);
  }
});

test('validateOtpToken: accepts 6 digits, trimming surrounding whitespace', () => {
  assert.deepEqual(validateOtpToken('123456'), { ok: true });
  assert.deepEqual(validateOtpToken('  000000  '), { ok: true });
});
