/**
 * Native "Sign in with Google" (Original, non-Firebase API) → Supabase, as a
 * single call the provider wraps.
 *
 * Flow:
 *   1. `GoogleSignin.configure({ webClientId, iosClientId })` (once);
 *   2. `hasPlayServices()` — surfaces the actionable Play Services error early;
 *   3. `GoogleSignin.signIn()` → `{ type:'success', data:{ idToken } }`
 *      or `{ type:'cancelled' }`;
 *   4. `supabase.auth.signInWithIdToken({ provider:'google', token: idToken })`.
 *
 * Deliberately does NOT pass a nonce: the free Original API's ID token carries
 * no `nonce` claim, and Supabase only enforces one when the claim is present.
 * No self-derived / placeholder nonce is invented to "look complete".
 *
 * Availability + native-module safety:
 *   - `describeGoogleAvailability()` / `isGoogleSignInAvailable()` decide (purely,
 *     via `googleAvailability.ts`) whether a working sign-in is possible on this
 *     runtime — Expo Go is always `false` (the native module is not linked), and
 *     iOS needs the native iOS client id + reversed-client-id URL scheme, not
 *     just `webClientId`.
 *   - The native module is `import()`-ed lazily AND only after an availability
 *     check passes, so an Expo Go bundle never touches the missing binary.
 *   - `ensureGoogleConfigured()` NEVER rejects — fire-and-forget from a
 *     `useEffect` cannot create an unhandled rejection. On failure it returns
 *     `false` and leaves `configured` unset so an explicit user tap can retry
 *     and surface the error then.
 *
 * Never writes provider state: the Supabase `SIGNED_IN` event owns the
 * transition. Cancellation resolves as `{ status: 'cancelled' }`.
 */
import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';

import { getSupabaseClient } from '@/lib/supabase';

import { authErrorMessage } from '../errorMessages';
import { readGoogleEnv } from './googleConfig';
import {
  evaluateGoogleAvailability,
  googleConfigureParams,
  type GoogleAvailability,
  type GoogleUnavailableReason,
} from './googleAvailability';
import { interpretGoogleError, type SocialAuthResult } from './socialResult';

const NOT_CONFIGURED_MESSAGE = '尚未設定 Google 登入，請稍後再試。';
const MODULE_MISSING_MESSAGE = '此版本未包含 Google 登入，請更新應用程式。';
const EXPO_GO_MESSAGE = 'Expo Go 不支援 Google 登入，請使用開發版或正式版應用程式。';
const UNSUPPORTED_PLATFORM_MESSAGE = '此平台暫不支援 Google 登入。';

function unavailableMessage(reason: GoogleUnavailableReason): string {
  switch (reason) {
    case 'expo-go':
      return EXPO_GO_MESSAGE;
    case 'unsupported-platform':
      return UNSUPPORTED_PLATFORM_MESSAGE;
    case 'missing-web-client-id':
    case 'missing-ios-native-config':
      return NOT_CONFIGURED_MESSAGE;
  }
}

/** Expo Go — the one runtime where the native module is guaranteed absent. */
function runningInExpoGo(): boolean {
  return Constants.appOwnership === AppOwnership.Expo;
}

/** Purely evaluate whether a working Google sign-in is possible right now. */
export function describeGoogleAvailability(): GoogleAvailability {
  return evaluateGoogleAvailability({
    platform: Platform.OS,
    isExpoGo: runningInExpoGo(),
    env: readGoogleEnv(),
  });
}

/** `true` only when the button should be shown (see `googleAvailability.ts`). */
export function isGoogleSignInAvailable(): boolean {
  return describeGoogleAvailability().available;
}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');

let modulePromise: Promise<GoogleModule> | null = null;
let configured = false;

function loadGoogleModule(): Promise<GoogleModule> {
  if (!modulePromise) {
    modulePromise = import('@react-native-google-signin/google-signin');
  }
  return modulePromise;
}

/**
 * Idempotently `configure()` the native client. Safe to fire-and-forget from a
 * `useEffect`: it NEVER throws / rejects and never imports the native module
 * unless `isGoogleSignInAvailable()` (so: not in Expo Go). Returns whether the
 * client is configured.
 */
export async function ensureGoogleConfigured(): Promise<boolean> {
  if (!isGoogleSignInAvailable()) return false;
  if (configured) return true;
  try {
    const params = googleConfigureParams(readGoogleEnv());
    if (!params) return false;
    const { GoogleSignin } = await loadGoogleModule();
    GoogleSignin.configure(params);
    configured = true;
    return true;
  } catch {
    // Leave `configured` false — a later explicit sign-in tap retries + surfaces.
    return false;
  }
}

export async function signInWithGoogleNative(): Promise<SocialAuthResult> {
  const availability = describeGoogleAvailability();
  if (!availability.available) {
    return { status: 'error', message: unavailableMessage(availability.reason) };
  }

  let mod: GoogleModule;
  try {
    mod = await loadGoogleModule();
  } catch {
    return { status: 'error', message: MODULE_MISSING_MESSAGE };
  }
  const { GoogleSignin, statusCodes } = mod;

  let idToken: string | null;
  try {
    if (!(await ensureGoogleConfigured())) {
      return { status: 'error', message: NOT_CONFIGURED_MESSAGE };
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    const response = await GoogleSignin.signIn();
    if (response.type === 'cancelled') return { status: 'cancelled' };
    idToken = response.data.idToken;
  } catch (err) {
    // Cancellation / IN_PROGRESS / Play Services split out in interpretGoogleError.
    return interpretGoogleError(err, statusCodes, authErrorMessage);
  }

  if (!idToken) {
    return {
      status: 'error',
      message: authErrorMessage(new Error('google sign-in returned no id token')),
    };
  }

  try {
    const { error } = await getSupabaseClient().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) return { status: 'error', message: authErrorMessage(error) };
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: authErrorMessage(err) };
  }
}
