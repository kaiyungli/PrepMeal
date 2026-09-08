/**
 * Unit tests for the pure social sign-in result mapping. Run with: `npm test`.
 * Pure module — no React, no Expo, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { authErrorMessage } from '../errorMessages.ts';
import {
  APPLE_CANCELED_CODE,
  GOOGLE_PLAY_SERVICES_MESSAGE,
  interpretAppleError,
  interpretGoogleError,
  isAppleCancellation,
  type GoogleStatusCodes,
} from './socialResult.ts';

// Mirrors the identifiers exported by `@react-native-google-signin/google-signin`.
const CODES: GoogleStatusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

const withCode = (code: string | number): Error & { code: string | number } =>
  Object.assign(new Error(String(code)), { code });

// Sentinel fallback: proves the "not cancelled / not play-services" path
// delegates, without coupling the assertion to the shared copy.
const STUB = () => 'STUB_FALLBACK';

test('Apple: cancellation is its own status, never an error', () => {
  const err = withCode(APPLE_CANCELED_CODE);
  assert.equal(isAppleCancellation(err), true);
  assert.deepEqual(interpretAppleError(err, STUB), { status: 'cancelled' });
});

test('Apple: a non-cancel rejection delegates to the fallback mapper', () => {
  assert.deepEqual(interpretAppleError(withCode('ERR_OTHER'), STUB), {
    status: 'error',
    message: 'STUB_FALLBACK',
  });
});

test('Apple: wired to the real mapper, a network rejection reuses shared copy', () => {
  assert.deepEqual(
    interpretAppleError(new Error('Network request failed'), authErrorMessage),
    { status: 'error', message: '網絡連線問題，請重試。' },
  );
});

test('Apple: a value with no `code` is a generic error, not cancelled', () => {
  assert.equal(isAppleCancellation({}), false);
  assert.equal(isAppleCancellation(null), false);
  assert.equal(isAppleCancellation('boom'), false);
  assert.equal(interpretAppleError('boom', STUB).status, 'error');
});

test('Google: user cancellation code -> cancelled', () => {
  assert.deepEqual(interpretGoogleError(withCode('SIGN_IN_CANCELLED'), CODES, STUB), {
    status: 'cancelled',
  });
});

test('Google: in-progress (double tap) is a silent no-op, not an error', () => {
  assert.deepEqual(interpretGoogleError(withCode('IN_PROGRESS'), CODES, STUB), {
    status: 'cancelled',
  });
});

test('Google: Play Services unavailable -> dedicated actionable message', () => {
  assert.deepEqual(
    interpretGoogleError(withCode('PLAY_SERVICES_NOT_AVAILABLE'), CODES, STUB),
    { status: 'error', message: GOOGLE_PLAY_SERVICES_MESSAGE },
  );
});

test('Google: unknown code -> fallback mapper', () => {
  assert.deepEqual(interpretGoogleError(withCode('DEVELOPER_ERROR'), CODES, STUB), {
    status: 'error',
    message: 'STUB_FALLBACK',
  });
});

test('Google: numeric native code is stringified before matching', () => {
  const codes: GoogleStatusCodes = {
    SIGN_IN_CANCELLED: '12501',
    IN_PROGRESS: '12502',
    PLAY_SERVICES_NOT_AVAILABLE: '12500',
  };
  assert.deepEqual(interpretGoogleError(withCode(12501), codes, STUB), {
    status: 'cancelled',
  });
});

test('Google: wired to the real mapper, rate-limit rejection reuses shared copy', () => {
  assert.deepEqual(
    interpretGoogleError(new Error('Too Many Requests'), CODES, authErrorMessage),
    { status: 'error', message: '嘗試次數過多，請稍後再試。' },
  );
});
