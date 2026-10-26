// A short-lived UI handoff, not an authorization credential. Supabase must still
// validate the session/user for every password update. No token/password stored here.
const KEY = 'prepmeal:password-recovery:v1';
const TTL = 15 * 60 * 1000;
let memory: { userId: string; expiresAt: number } | null = null;
export function recordRecoveryEvent(event: string, userId?: string) {
  if (event === 'PASSWORD_RECOVERY' && userId) {
    memory = { userId, expiresAt: Date.now() + TTL };
    try { sessionStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* memory still works */ }
  } else if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
    clearRecoverySession();
  }
}
export function clearRecoverySession() {
  memory = null;
  try { sessionStorage.removeItem(KEY); } catch { /* storage may be blocked */ }
}
export function hasRecoverySession(userId: string): boolean {
  let value = memory;
  if (!value) {
    try { value = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return false; }
  }
  return Boolean(value && value.userId === userId && Number.isFinite(value.expiresAt)
    && value.expiresAt > Date.now() && value.expiresAt <= Date.now() + TTL);
}
