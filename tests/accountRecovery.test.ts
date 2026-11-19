import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountHelpError, emailCallbackUrl, EMAIL_REQUEST_MESSAGE } from '@/features/auth/accountHelp';
import { safeInternalRedirect } from '@/lib/authRedirect';
import { recordRecoveryEvent, hasRecoverySession, clearRecoverySession } from '@/features/auth/recoverySession';
afterEach(() => { clearRecoverySession(); vi.useRealTimers(); });
describe('recovery handoff and redirect boundaries', () => {
  it('requires a recovery event and exact account, then expires after fifteen minutes', () => {
    vi.useFakeTimers();
    expect(hasRecoverySession('A')).toBe(false);
    recordRecoveryEvent('PASSWORD_RECOVERY', 'A');
    expect(hasRecoverySession('A')).toBe(true);
    expect(hasRecoverySession('B')).toBe(false);
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(hasRecoverySession('A')).toBe(false);
  });
  it.each(['SIGNED_OUT', 'SIGNED_IN', 'USER_UPDATED'])('clears the handoff on %s', event => {
    recordRecoveryEvent('PASSWORD_RECOVERY', 'A'); recordRecoveryEvent(event, 'A');
    expect(hasRecoverySession('A')).toBe(false);
  });
  it.each(['//evil.example', '/%2fevil.example', '/\\evil.example', '/%5cevil.example', '/%0aevil', '/%zz'])('rejects unsafe redirects: %s', path => {
    expect(safeInternalRedirect(path)).toBe('/my-plans');
  });
  it('keeps normal internal redirects and fixed same-origin email callback destinations', () => {
    expect(safeInternalRedirect('/generate?draft=1')).toBe('/generate?draft=1');
    const url = new URL(emailCallbackUrl('https://eatwhathk.com', 'recovery'));
    expect(url.pathname).toBe('/auth/callback'); expect(url.searchParams.get('flow')).toBe('recovery');
  });
  it('never reflects an account-existence error or email address', () => {
    expect(accountHelpError({ message: 'user joe@example.com does not exist' })).not.toContain('joe');
    expect(accountHelpError({ status: 429 })).toContain('太密');
    expect(EMAIL_REQUEST_MESSAGE).toContain('如該地址有可處理的帳戶');
  });
});
