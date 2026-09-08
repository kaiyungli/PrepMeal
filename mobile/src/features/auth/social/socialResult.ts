/**
 * Result contract + pure error/cancellation mapping for native social sign-in.
 *
 * ZERO imports — no React, no Expo, no Supabase, not even sibling modules — so
 * it is unit-tested directly by `node --test`. The impure helpers
 * (`appleAuth.ts` / `googleAuth.ts`) funnel every outcome through here so:
 *   - user cancellation is its OWN status (`'cancelled'`) — never surfaced as an
 *     error, never counted as a failure;
 *   - every real failure carries a user-safe zh-HK `message`. The generic
 *     network / rate-limit / config wording is produced by the caller's
 *     `authErrorMessage`, passed in as `fallbackMessage` to keep this module
 *     import-free.
 */

export type SocialAuthResult =
  | { status: 'ok' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/** Maps an arbitrary thrown value to a user-safe zh-HK string. */
export type FallbackMessage = (err: unknown) => string;

/** Apple rejects the sign-in promise with this code when the user backs out. */
export const APPLE_CANCELED_CODE = 'ERR_REQUEST_CANCELED';

/** Play Services problem is actionable, so it gets its own copy. */
export const GOOGLE_PLAY_SERVICES_MESSAGE =
  'Google Play 服務未安裝或需要更新，暫時無法使用 Google 登入。';

function errorCode(err: unknown): string {
  if (err !== null && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
    if (typeof code === 'number') return String(code);
  }
  return '';
}

/** True when an `expo-apple-authentication` rejection is a user cancellation. */
export function isAppleCancellation(err: unknown): boolean {
  return errorCode(err) === APPLE_CANCELED_CODE;
}

/**
 * Map an `AppleAuthentication.signInAsync()` rejection to a result. Cancellation
 * is split out first; everything else becomes a user-safe error via
 * `fallbackMessage`.
 */
export function interpretAppleError(
  err: unknown,
  fallbackMessage: FallbackMessage,
): SocialAuthResult {
  if (isAppleCancellation(err)) return { status: 'cancelled' };
  return { status: 'error', message: fallbackMessage(err) };
}

/** The subset of `@react-native-google-signin` `statusCodes` we branch on. */
export interface GoogleStatusCodes {
  SIGN_IN_CANCELLED: string;
  IN_PROGRESS: string;
  PLAY_SERVICES_NOT_AVAILABLE: string;
}

/**
 * Map a thrown `@react-native-google-signin` error to a result:
 *  - `SIGN_IN_CANCELLED` — user backed out → `'cancelled'` (silent).
 *  - `IN_PROGRESS` — a sign-in modal is already open (e.g. a double tap past the
 *    busy gate) → `'cancelled'`: a harmless no-op, never a red error.
 *  - `PLAY_SERVICES_NOT_AVAILABLE` — actionable device problem → dedicated copy.
 *  - anything else → `fallbackMessage`.
 *
 * Since library v13 an ordinary user cancellation comes back as a
 * `{ type: 'cancelled' }` RESPONSE (handled in `googleAuth.ts`), not a throw;
 * the `SIGN_IN_CANCELLED` branch here covers older / native edge cases.
 */
export function interpretGoogleError(
  err: unknown,
  codes: GoogleStatusCodes,
  fallbackMessage: FallbackMessage,
): SocialAuthResult {
  const code = errorCode(err);
  if (code === codes.SIGN_IN_CANCELLED || code === codes.IN_PROGRESS) {
    return { status: 'cancelled' };
  }
  if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
    return { status: 'error', message: GOOGLE_PLAY_SERVICES_MESSAGE };
  }
  return { status: 'error', message: fallbackMessage(err) };
}
