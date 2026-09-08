/**
 * Unit tests for the auth error -> user-safe zh-HK message mapper. Pure,
 * import-free. Run with: `npm test`.
 *
 * Covers both the sign-in and the sign-out failure paths (the provider passes
 * the `{ error }` from `signInWithPassword` and from `signOut` through here).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { authErrorMessage } from './errorMessages.ts';

test('missing Supabase config is recognised by error name', () => {
  const err = new Error('Missing required Expo env var(s): EXPO_PUBLIC_SUPABASE_URL');
  err.name = 'MissingEnvError';
  assert.equal(authErrorMessage(err), '應用程式尚未完成設定，暫時無法登入。');
});

test('invalid credentials', () => {
  assert.equal(
    authErrorMessage(new Error('Invalid login credentials')),
    '電郵或密碼不正確。',
  );
});

test('unconfirmed email maps to the SAME copy as invalid credentials (no distinct oracle)', () => {
  const shared = '電郵或密碼不正確。';
  assert.equal(authErrorMessage(new Error('Email not confirmed')), shared);
  assert.equal(authErrorMessage(new Error('Invalid login credentials')), shared);
  // Identical — the sign-in error channel reveals nothing about whether the
  // address exists or is confirmed.
  assert.equal(
    authErrorMessage(new Error('Email not confirmed')),
    authErrorMessage(new Error('Invalid login credentials')),
  );
});

test('network failures (incl. a failed sign-out request)', () => {
  for (const m of [
    'Network request failed',
    'TypeError: Failed to fetch',
    'AuthRetryableFetchError: request timed out',
  ]) {
    assert.equal(authErrorMessage(new Error(m)), '網絡連線問題，請重試。', m);
  }
});

test('rate limiting (incl. the underscored resend-OTP variant)', () => {
  for (const m of [
    'Too many requests',
    'email rate limit exceeded',
    'over_email_send_rate_limit',
  ]) {
    assert.equal(authErrorMessage(new Error(m)), '嘗試次數過多，請稍後再試。', m);
  }
});

test('unknown / non-Error values fall back to the generic message', () => {
  const generic = '登入時發生錯誤，請稍後再試。';
  assert.equal(authErrorMessage(new Error('boom 500')), generic);
  assert.equal(authErrorMessage('weird string'), generic);
  assert.equal(authErrorMessage(null), generic);
  assert.equal(authErrorMessage(undefined), generic);
  assert.equal(authErrorMessage({ message: 'not an Error' }), generic);
});
