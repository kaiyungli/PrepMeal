/**
 * Pure decision: is native "Sign in with Google" actually usable *right now*?
 *
 * ZERO imports — no React, no Expo, no `process.env`, no native module — the
 * runtime facts (platform, Expo Go?, env config) are passed in, so this is
 * unit-tested directly. `googleAuth.ts` gathers the inputs and calls this.
 *
 * A button is shown ONLY when this returns `{ available: true }`. We never show
 * a button that is known to be non-functional:
 *   - Expo Go: the `@react-native-google-signin` native module is not linked.
 *   - non-iOS/Android: unsupported here.
 *   - no `webClientId`: `signIn()` cannot return an id-token Supabase accepts.
 *   - iOS without the native iOS client id + reversed-client-id URL scheme:
 *     `GIDSignIn` cannot present. (`webClientId` alone is NOT enough on iOS.)
 *   - Android: `webClientId` alone is accepted (the Android OAuth client is
 *     matched by package name + SHA-1 at the console, not via JS config).
 */

export type GooglePlatform = 'ios' | 'android' | 'web' | 'windows' | 'macos';

export type GoogleUnavailableReason =
  | 'expo-go'
  | 'unsupported-platform'
  | 'missing-web-client-id'
  | 'missing-ios-native-config';

export type GoogleAvailability =
  | { available: true }
  | { available: false; reason: GoogleUnavailableReason };

export interface GoogleEnv {
  /** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — required on every platform. */
  webClientId?: string;
  /** `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — required on iOS. */
  iosClientId?: string;
  /** `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (reversed iOS client id) — required on iOS. */
  iosUrlScheme?: string;
}

export function evaluateGoogleAvailability(input: {
  platform: GooglePlatform;
  isExpoGo: boolean;
  env: GoogleEnv;
}): GoogleAvailability {
  const { platform, isExpoGo, env } = input;

  if (isExpoGo) return { available: false, reason: 'expo-go' };

  if (platform !== 'ios' && platform !== 'android') {
    return { available: false, reason: 'unsupported-platform' };
  }

  if (!env.webClientId) {
    return { available: false, reason: 'missing-web-client-id' };
  }

  if (platform === 'ios' && (!env.iosClientId || !env.iosUrlScheme)) {
    return { available: false, reason: 'missing-ios-native-config' };
  }

  return { available: true };
}

/**
 * `GoogleSignin.configure()` params derived from env, or `null` when the
 * mandatory web client id is missing. (`iosUrlScheme` is native-only — not a
 * `configure()` argument.)
 */
export function googleConfigureParams(
  env: GoogleEnv,
): { webClientId: string; iosClientId?: string } | null {
  if (!env.webClientId) return null;
  return env.iosClientId
    ? { webClientId: env.webClientId, iosClientId: env.iosClientId }
    : { webClientId: env.webClientId };
}
