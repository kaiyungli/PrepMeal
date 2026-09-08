/**
 * Map a Supabase `AuthError` (or any thrown value) to a user-safe zh-HK string.
 * Pure and import-free: recognises `MissingEnvError` by `name` rather than an
 * `instanceof` import so this module stays free of the env side-effect module.
 * Never surfaces raw error text or any token material.
 */

const GENERIC = '登入時發生錯誤，請稍後再試。';

export function authErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();

  if (name === 'MissingEnvError') {
    return '應用程式尚未完成設定，暫時無法登入。';
  }
  if (
    msg.includes('invalid login credentials') ||
    // ANTI-ENUMERATION: an unconfirmed-but-existing account must NOT be
    // distinguishable from a wrong email / password. Recovery stays available
    // via the always-visible「未完成電郵驗證？」entry, which reveals nothing.
    msg.includes('email not confirmed')
  ) {
    return '電郵或密碼不正確。';
  }
  if (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  ) {
    return '網絡連線問題，請重試。';
  }
  if (
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit')
  ) {
    return '嘗試次數過多，請稍後再試。';
  }
  return GENERIC;
}
