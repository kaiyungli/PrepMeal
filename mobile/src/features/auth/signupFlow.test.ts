/**
 * Unit tests for the pure sign-up flow / anti-enumeration mapping.
 * Run with: `npm test`. Pure module — no React, no Expo, no Supabase.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SIGNUP_NEUTRAL_NOTICE,
  SIGNUP_OTP_RESENT_NOTICE,
  classifyResendError,
  classifySignUpError,
  resendResultFromResponse,
  signUpResultFromResponse,
} from './signupFlow.ts';

// Sentinel mapper — proves the "genuine failure" path delegates, without
// coupling assertions to the shared zh-HK copy.
const STUB = () => 'STUB_MSG';

const withCode = (message: string, code: string): Error & { code: string } =>
  Object.assign(new Error(message), { code });

const NEUTRAL_OTP = {
  ok: true,
  next: 'otp',
  notice: SIGNUP_NEUTRAL_NOTICE,
} as const;

// ── The core anti-enumeration guarantee ──────────────────────────────────────

test('new / obfuscated / existing-account responses ALL produce the identical UI result', () => {
  // 1) brand-new address: session:null, no error
  const brandNew = signUpResultFromResponse({
    hasSession: false,
    error: null,
    mapMessage: STUB,
  });

  // 2) GoTrue "fake success" (existing address obfuscated, identities:[]):
  //    still just session:null + no error as far as the boundary is concerned
  const obfuscated = signUpResultFromResponse({
    hasSession: false,
    error: null,
    mapMessage: STUB,
  });

  // 3) explicit account-existence ERROR (confirmations disabled / some GoTrue vers.)
  const existingByMessage = signUpResultFromResponse({
    hasSession: false,
    error: new Error('User already registered'),
    mapMessage: STUB,
  });
  const existingByCode = signUpResultFromResponse({
    hasSession: false,
    error: withCode('signup disabled', 'user_already_exists'),
    mapMessage: STUB,
  });
  const existingPhrasing = signUpResultFromResponse({
    hasSession: false,
    error: new Error('A user with this email address has already been registered'),
    mapMessage: STUB,
  });

  for (const r of [brandNew, obfuscated, existingByMessage, existingByCode, existingPhrasing]) {
    assert.deepEqual(r, NEUTRAL_OTP);
  }
});

// ── Genuine failures stay errors ─────────────────────────────────────────────

test('weak password -> { ok:false } with dedicated copy (not the neutral notice)', () => {
  for (const err of [
    withCode('x', 'weak_password'),
    new Error('Password should be at least 6 characters'),
    new Error('Password is too weak'),
  ]) {
    const r = signUpResultFromResponse({ hasSession: false, error: err, mapMessage: STUB });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /密碼/);
  }
});

test('rate limit -> { ok:false } via the injected mapper', () => {
  for (const err of [
    withCode('slow down', 'over_email_send_rate_limit'),
    new Error('email rate limit exceeded'),
    new Error('For security purposes, you can only request this after 33 seconds'),
  ]) {
    assert.deepEqual(
      signUpResultFromResponse({ hasSession: false, error: err, mapMessage: STUB }),
      { ok: false, error: 'STUB_MSG' },
    );
  }
});

test('network + unknown service errors -> { ok:false } via the injected mapper', () => {
  for (const err of [
    new Error('Network request failed'),
    new Error('AuthApiError: Internal Server Error'),
    'totally weird',
  ]) {
    assert.deepEqual(
      signUpResultFromResponse({ hasSession: false, error: err, mapMessage: STUB }),
      { ok: false, error: 'STUB_MSG' },
    );
  }
});

// ── session present ─────────────────────────────────────────────────────────

test('session present (confirmation disabled) -> await SIGNED_IN, no notice', () => {
  assert.deepEqual(
    signUpResultFromResponse({ hasSession: true, error: null, mapMessage: STUB }),
    { ok: true, next: 'session' },
  );
});

test('an account-exists error still wins even if a session were somehow present', () => {
  assert.deepEqual(
    signUpResultFromResponse({
      hasSession: true,
      error: new Error('User already registered'),
      mapMessage: STUB,
    }),
    NEUTRAL_OTP,
  );
});

// ── classifySignUpError buckets ─────────────────────────────────────────────

test('classifySignUpError: buckets each family', () => {
  assert.equal(classifySignUpError(new Error('User already registered')), 'account-exists');
  assert.equal(classifySignUpError(withCode('x', 'email_exists')), 'account-exists');
  assert.equal(classifySignUpError(new Error('already in use')), 'account-exists');
  assert.equal(classifySignUpError(withCode('x', 'weak_password')), 'weak-password');
  assert.equal(classifySignUpError(new Error('Password must contain a number')), 'weak-password');
  assert.equal(classifySignUpError(withCode('x', 'over_request_rate_limit')), 'rate-limit');
  assert.equal(classifySignUpError(new Error('Too Many Requests')), 'rate-limit');
  assert.equal(classifySignUpError(new Error('Network request failed')), 'network');
  assert.equal(classifySignUpError(new Error('boom 500')), 'service');
  assert.equal(classifySignUpError(null), 'service');
});

// ── the notice copy itself must not leak ────────────────────────────────────

test('the neutral notice is conditional and reveals nothing', () => {
  assert.match(SIGNUP_NEUTRAL_NOTICE, /如果/);
  assert.doesNotMatch(SIGNUP_NEUTRAL_NOTICE, /已註冊|已存在|not found|已經有|does not exist/);
});

// ── resend anti-enumeration ─────────────────────────────────────────────────

const RESEND_NEUTRAL = { ok: true } as const;

test('resend: success AND every account-state error produce the IDENTICAL neutral result', () => {
  const success = resendResultFromResponse({ error: null, mapMessage: STUB });

  const accountStateErrors: unknown[] = [
    new Error('User not found'),
    withCode('signup disabled', 'user_not_found'),
    new Error('Email not found'),
    new Error('Email address is already confirmed'),
    new Error('This user has already been confirmed'),
    new Error('User already registered'),
    withCode('x', 'user_already_exists'),
    new Error('No pending signup for this email'),
    new Error('signup not found'),
    new Error('Nothing to resend'),
    new Error('Email not found or already confirmed'),
  ];

  for (const err of accountStateErrors) {
    assert.deepEqual(
      resendResultFromResponse({ error: err, mapMessage: STUB }),
      success,
    );
  }
  assert.deepEqual(success, RESEND_NEUTRAL);
});

test('resend: network / rate limit / service stay OPERATIONAL errors (via injected mapper)', () => {
  for (const err of [
    new Error('Network request failed'),
    new Error('AuthRetryableFetchError: request timed out'),
    withCode('slow down', 'over_email_send_rate_limit'),
    new Error('email rate limit exceeded'),
    new Error('For security purposes, you can only request this after 51 seconds'),
    new Error('AuthApiError: Internal Server Error'),
    'totally weird',
  ]) {
    assert.deepEqual(
      resendResultFromResponse({ error: err, mapMessage: STUB }),
      { ok: false, error: 'STUB_MSG' },
    );
  }
});

test('classifyResendError: buckets each family', () => {
  assert.equal(classifyResendError(new Error('User not found')), 'account-state');
  assert.equal(classifyResendError(withCode('x', 'user_not_found')), 'account-state');
  assert.equal(classifyResendError(new Error('already confirmed')), 'account-state');
  assert.equal(classifyResendError(new Error('no pending signup')), 'account-state');
  assert.equal(classifyResendError(new Error('User already registered')), 'account-state');
  assert.equal(classifyResendError(withCode('x', 'over_request_rate_limit')), 'rate-limit');
  assert.equal(classifyResendError(new Error('Too Many Requests')), 'rate-limit');
  assert.equal(classifyResendError(new Error('Network request failed')), 'network');
  assert.equal(classifyResendError(new Error('boom 500')), 'service');
  assert.equal(classifyResendError(null), 'service');
});

test('the OTP-resent notice is conditional and reveals nothing', () => {
  assert.match(SIGNUP_OTP_RESENT_NOTICE, /如果/);
  assert.doesNotMatch(
    SIGNUP_OTP_RESENT_NOTICE,
    /已註冊|已存在|已確認|已驗證|not found|does not exist/,
  );
});
