/**
 * Pure client-side credential validation for the sign-in / sign-up forms. Gates
 * the submit so an obviously-bad email / empty / too-short / mismatched password
 * or a malformed OTP never reaches the network. Not a security boundary —
 * Supabase is authoritative.
 */

export type CredentialsCheck = { ok: true } | { ok: false; error: string };

// Deliberately loose: one `@`, a dot-separated host. Real deliverability is
// Supabase's problem; this only catches typos and empty input.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Supabase's default minimum password length.
const MIN_PASSWORD_LENGTH = 6;

// Supabase emails a 6-digit numeric OTP for the `signup` / `email` type.
const OTP_RE = /^\d{6}$/;

export function validateCredentials(
  emailRaw: string,
  password: string,
): CredentialsCheck {
  const email = emailRaw.trim();
  if (email === '') return { ok: false, error: '請輸入電郵地址。' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: '電郵地址格式不正確。' };
  if (password === '') return { ok: false, error: '請輸入密碼。' };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `密碼至少 ${MIN_PASSWORD_LENGTH} 個字元。` };
  }
  return { ok: true };
}

/**
 * Sign-up form: email + password rules (via `validateCredentials`) plus the
 * confirm-password match. Confirm is checked last so the user first learns the
 * password itself is acceptable.
 */
export function validateSignUp(
  emailRaw: string,
  password: string,
  confirmPassword: string,
): CredentialsCheck {
  const base = validateCredentials(emailRaw, password);
  if (!base.ok) return base;
  if (confirmPassword === '') return { ok: false, error: '請再次輸入密碼。' };
  if (password !== confirmPassword) {
    return { ok: false, error: '兩次輸入的密碼不一致。' };
  }
  return { ok: true };
}

/** OTP step: exactly 6 digits (whitespace trimmed). */
export function validateOtpToken(tokenRaw: string): CredentialsCheck {
  const token = tokenRaw.trim();
  if (token === '') return { ok: false, error: '請輸入驗證碼。' };
  if (!OTP_RE.test(token)) return { ok: false, error: '驗證碼為 6 位數字。' };
  return { ok: true };
}
