import { validProgress, type ShoppingProgress } from './model';
export const OFFLINE_TTL = 7 * 24 * 60 * 60 * 1000;
export const shoppingOfflineKey = (userId: string, planId: string, kind = 'progress') =>
  `prepmeal:shopping-offline:v1:${kind}:${JSON.stringify([userId, planId])}`;
export type OfflineProgress = {
  version: 1; scope: string; savedAt: number; revision: number; progress: ShoppingProgress; pending: boolean;
  attempt?: { revision: number; progress: ShoppingProgress };
};
export function progressFingerprint(progress: ShoppingProgress) {
  return JSON.stringify(progress, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
}
export function parseOfflineProgress(raw: string | null, scope: string, now = Date.now()): OfflineProgress | null {
  if (!raw || raw.length > 600000) return null;
  try {
    const v = JSON.parse(raw);
    const revision = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) < 2147483647;
    if (v.version !== 1 || v.scope !== scope || !Number.isFinite(v.savedAt) || v.savedAt > now || now - v.savedAt >= OFFLINE_TTL ||
      !revision(v.revision) || !validProgress(v.progress) || typeof v.pending !== 'boolean' ||
      (v.attempt !== undefined && (!revision(v.attempt?.revision) || !validProgress(v.attempt?.progress)))) return null;
    return v;
  } catch { return null; }
}
