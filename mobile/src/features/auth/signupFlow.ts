/**
 * Pure sign-up flow logic — ANTI-ENUMERATION lives here.
 *
 * NO React, NO Expo, NO Supabase import — unit-tested directly (`node --test`).
 * `SessionProvider.signUpWithEmail` is a thin adapter: it calls
 * `supabase.auth.signUp({ email, password })` and hands the raw outcome here.
 *
 * Enumeration is neutralised on BOTH channels:
 *   1. a "fake success" response — `session: null`, no error (email confirmation
 *      required, OR the address already exists and is obfuscated by GoTrue);
 *   2. an account-existence ERROR — e.g. "User already registered" /
 *      `user_already_exists` (returned when email confirmation is disabled, or by
 *      some GoTrue versions).
 * Both produce the exact same result as a brand-new signup:
 *   `{ ok:true, next:'otp', notice: SIGNUP_NEUTRAL_NOTICE }`.
 *
 * Genuine failures (weak password, rate limit, network, service/config) stay
 * errors. `data.user` / `user.identities` never reach the UI.
 */

export const SIGNUP_NEUTRAL_NOTICE =
  '如果呢個電郵可以註冊，我哋已經寄出驗證碼。請檢查電郵。';

export const SIGNUP_OTP_RESENT_NOTICE =
  '如果呢個電郵需要驗證，我哋已重新寄出驗證碼。請檢查電郵。';

const SIGNUP_WEAK_PASSWORD_MESSAGE = '密碼強度不足，請使用更長或更複雜的密碼。';

/** Render-only result of `signUpWithEmail` — no session/user objects. */
export type SignUpResult =
  /** No session (or a neutralised account-exists error): OTP step + neutral copy. */
  | { ok: true; next: 'otp'; notice: string }
  /** Session already present (confirmation disabled): just await SIGNED_IN. */
  | { ok: true; next: 'session' }
  | { ok: false; error: string };

/**
 * Genuine `signUp` failure buckets. `account-exists` is NOT a failure the user
 * ever sees — it is folded into the neutral OTP result.
 */
export type SignUpErrorKind =
  | 'account-exists'
  | 'weak-password'
  | 'rate-limit'
  | 'network'
  | 'service';

function errText(err: unknown): { msg: string; code: string } {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const code =
    err !== null && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  return { msg: raw.toLowerCase(), code: code.toLowerCase() };
}

/**
 * Classify a `supabase.auth.signUp` error. Pure. `account-exists` covers every
 * known "this email is already registered" phrasing / code — those must never
 * be shown.
 */
export function classifySignUpError(err: unknown): SignUpErrorKind {
  const { msg, code } = errText(err);

  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('already exists') ||
    msg.includes('already in use') ||
    msg.includes('user already')
  ) {
    return 'account-exists';
  }

  if (
    code === 'weak_password' ||
    msg.includes('weak password') ||
    msg.includes('password should be') ||
    msg.includes('password is too') ||
    msg.includes('password must')
  ) {
    return 'weak-password';
  }

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many requests') ||
    msg.includes('for security purposes')
  ) {
    return 'rate-limit';
  }

  if (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  ) {
    return 'network';
  }

  return 'service';
}

/**
 * Map a `signUp` outcome to a render-only result.
 *
 * @param input.hasSession  `data.session != null`
 * @param input.error       the raw supabase error, or `null`
 * @param input.mapMessage  injected zh-HK mapper (`authErrorMessage`) — keeps
 *                          this module import-free / hermetically testable
 */
export function signUpResultFromResponse(input: {
  hasSession: boolean;
  error: unknown;
  mapMessage: (err: unknown) => string;
}): SignUpResult {
  if (input.error != null) {
    const kind = classifySignUpError(input.error);
    if (kind === 'account-exists') {
      // ANTI-ENUMERATION: identical to a normal session:null signup.
      return { ok: true, next: 'otp', notice: SIGNUP_NEUTRAL_NOTICE };
    }
    if (kind === 'weak-password') {
      return { ok: false, error: SIGNUP_WEAK_PASSWORD_MESSAGE };
    }
    return { ok: false, error: input.mapMessage(input.error) };
  }

  if (input.hasSession) return { ok: true, next: 'session' };
  return { ok: true, next: 'otp', notice: SIGNUP_NEUTRAL_NOTICE };
}

/**
 * Genuine `resend({ type:'signup' })` failure buckets. `account-state` is NOT a
 * failure the user ever sees — it is folded into the SAME `{ ok:true }` as a
 * successful resend (the screen then shows `SIGNUP_OTP_RESENT_NOTICE`). It
 * covers every "no such user / already confirmed / no pending signup" phrasing
 * or code that would otherwise reveal whether the address exists or is verified.
 */
export type ResendErrorKind =
  | 'account-state'
  | 'rate-limit'
  | 'network'
  | 'service';

/**
 * Classify a `supabase.auth.resend({ type:'signup' })` error. Pure. Mirrors the
 * shape of `classifySignUpError`. Anything account-/lifecycle-specific →
 * `account-state`; only genuine operational failures fall through to
 * `rate-limit` / `network` / `service`.
 */
export function classifyResendError(err: unknown): ResendErrorKind {
  const { msg, code } = errText(err);

  if (
    code === 'user_not_found' ||
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code === 'user_already_confirmed' ||
    code === 'email_already_confirmed' ||
    msg.includes('user not found') ||
    msg.includes('email not found') ||
    msg.includes('user does not exist') ||
    msg.includes('already confirmed') ||
    msg.includes('already been confirmed') ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('already exists') ||
    msg.includes('no pending') ||
    msg.includes('no signup') ||
    msg.includes('signup not found') ||
    msg.includes('nothing to resend') ||
    msg.includes('not found or already confirmed')
  ) {
    return 'account-state';
  }

  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    code === 'over_sms_send_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many requests') ||
    msg.includes('for security purposes')
  ) {
    return 'rate-limit';
  }

  if (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  ) {
    return 'network';
  }

  return 'service';
}

/**
 * Map a `resend({ type:'signup' })` outcome to a render-only result.
 *
 * ANTI-ENUMERATION: a successful resend AND every `account-state` error resolve
 * to the exact same `{ ok:true }` — callers then show `SIGNUP_OTP_RESENT_NOTICE`
 * ("如果呢個電郵需要驗證…"). Only genuine operational failures (rate limit,
 * network, service/config) stay `{ ok:false }`, and the injected mapper's copy
 * for those never mentions the address.
 *
 * @param input.error       the raw supabase error, or `null`
 * @param input.mapMessage  injected zh-HK mapper (`authErrorMessage`)
 */
export function resendResultFromResponse(input: {
  error: unknown;
  mapMessage: (err: unknown) => string;
}): { ok: true } | { ok: false; error: string } {
  if (input.error == null) return { ok: true };

  if (classifyResendError(input.error) === 'account-state') {
    // Indistinguishable from a successful resend.
    return { ok: true };
  }
  return { ok: false, error: input.mapMessage(input.error) };
}

/** The two steps of the sign-up screen. */
export type SignUpStep = 'form' | 'otp';
