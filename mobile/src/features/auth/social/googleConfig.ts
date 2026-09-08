/**
 * Reads the PUBLIC Google Sign-In env into a plain `GoogleEnv`.
 *
 * NO React / Expo / Supabase / native import. Each value is a static
 * `process.env.EXPO_PUBLIC_*` member expression (so Expo's build-time inlining
 * still applies), read at CALL time so tests can exercise every combination.
 * The decision about what these values *mean* lives in the pure
 * `googleAvailability.ts`.
 */
import type { GoogleEnv } from './googleAvailability';

export function readGoogleEnv(): GoogleEnv {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME || undefined,
  };
}
