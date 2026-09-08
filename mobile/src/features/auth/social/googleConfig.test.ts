/**
 * Unit tests for the pure Google Sign-In env reader. Run with: `npm test`.
 * Pure module — no React, no Expo, no Supabase, no `@/` imports.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readGoogleEnv } from './googleConfig.ts';

const KEYS = [
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
] as const;

function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const k of KEYS) saved[k] = process.env[k];
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v !== undefined) process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

test('all absent -> every field undefined', () => {
  withEnv({}, () => {
    assert.deepEqual(readGoogleEnv(), {
      webClientId: undefined,
      iosClientId: undefined,
      iosUrlScheme: undefined,
    });
  });
});

test('empty string is normalised to undefined', () => {
  withEnv({ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: '' }, () => {
    assert.equal(readGoogleEnv().webClientId, undefined);
  });
});

test('reads each var through by its static name', () => {
  withEnv(
    {
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios.apps.googleusercontent.com',
      EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: 'com.googleusercontent.apps.ios',
    },
    () => {
      assert.deepEqual(readGoogleEnv(), {
        webClientId: 'web.apps.googleusercontent.com',
        iosClientId: 'ios.apps.googleusercontent.com',
        iosUrlScheme: 'com.googleusercontent.apps.ios',
      });
    },
  );
});
