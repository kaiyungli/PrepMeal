export const EMAIL_COOLDOWN_MS = 60_000;
export const EMAIL_REQUEST_MESSAGE = '申請已提交。如該地址有可處理的帳戶，我們會寄出相關郵件；請查看收件匣及垃圾郵件。';
export function accountHelpError(error: unknown) {
  const code = error && typeof error === 'object' ? (error as { code?: string; status?: number }) : {};
  if (code.status === 429 || code.code === 'over_email_send_rate_limit' || code.code === 'over_request_rate_limit')
    return '寄信次數太密，請稍後再試。';
  return '暫時未能完成申請，請稍後重試。如持續收不到郵件，請聯絡我們。';
}
export function emailCallbackUrl(origin: string, flow: 'recovery' | 'signup', redirect = '/my-plans') {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('flow', flow);
  if (flow === 'signup') url.searchParams.set('redirect', redirect);
  return url.toString();
}
