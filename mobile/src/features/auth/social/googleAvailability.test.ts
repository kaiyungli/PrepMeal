/**
 * Unit tests for the pure Google availability decision. Run with: `npm test`.
 * Pure module — no React, no Expo, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateGoogleAvailability,
  googleConfigureParams,
  type GoogleEnv,
} from './googleAvailability.ts';

const FULL: GoogleEnv = {
  webClientId: 'web.apps.googleusercontent.com',
  iosClientId: 'ios.apps.googleusercontent.com',
  iosUrlScheme: 'com.googleusercontent.apps.ios',
};

test('Expo Go: never available, whatever the platform / env', () => {
  for (const platform of ['ios', 'android'] as const) {
    assert.deepEqual(
      evaluateGoogleAvailability({ platform, isExpoGo: true, env: FULL }),
      { available: false, reason: 'expo-go' },
    );
  }
});

test('unsupported platforms (web / windows / macos) are unavailable', () => {
  for (const platform of ['web', 'windows', 'macos'] as const) {
    assert.deepEqual(
      evaluateGoogleAvailability({ platform, isExpoGo: false, env: FULL }),
      { available: false, reason: 'unsupported-platform' },
    );
  }
});

test('missing webClientId is unavailable on both platforms', () => {
  for (const platform of ['ios', 'android'] as const) {
    assert.deepEqual(
      evaluateGoogleAvailability({ platform, isExpoGo: false, env: {} }),
      { available: false, reason: 'missing-web-client-id' },
    );
  }
});

test('iOS: webClientId alone is NOT sufficient', () => {
  assert.deepEqual(
    evaluateGoogleAvailability({
      platform: 'ios',
      isExpoGo: false,
      env: { webClientId: FULL.webClientId },
    }),
    { available: false, reason: 'missing-ios-native-config' },
  );
});

test('iOS: needs BOTH the iOS client id and the iOS URL scheme', () => {
  assert.equal(
    evaluateGoogleAvailability({
      platform: 'ios',
      isExpoGo: false,
      env: { webClientId: FULL.webClientId, iosClientId: FULL.iosClientId },
    }).available,
    false,
  );
  assert.equal(
    evaluateGoogleAvailability({
      platform: 'ios',
      isExpoGo: false,
      env: { webClientId: FULL.webClientId, iosUrlScheme: FULL.iosUrlScheme },
    }).available,
    false,
  );
  assert.deepEqual(
    evaluateGoogleAvailability({ platform: 'ios', isExpoGo: false, env: FULL }),
    { available: true },
  );
});

test('Android: webClientId alone is enough (no iOS-only fields required)', () => {
  assert.deepEqual(
    evaluateGoogleAvailability({
      platform: 'android',
      isExpoGo: false,
      env: { webClientId: FULL.webClientId },
    }),
    { available: true },
  );
});

test('googleConfigureParams: null without webClientId; omits iosClientId when absent', () => {
  assert.equal(googleConfigureParams({}), null);
  assert.deepEqual(googleConfigureParams({ webClientId: 'w' }), { webClientId: 'w' });
  assert.deepEqual(googleConfigureParams({ webClientId: 'w', iosClientId: 'i' }), {
    webClientId: 'w',
    iosClientId: 'i',
  });
});
