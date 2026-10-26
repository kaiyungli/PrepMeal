import { describe, it, expect } from 'vitest';
import { OFFLINE_TTL, parseOfflineProgress, progressFingerprint } from '@/features/shopping-list/progress/offlineStore';
import { emptyProgress } from '@/features/shopping-list/progress/model';
import { readShoppingCache } from '@/features/plans/savedShoppingCache';
describe('offline shopping data validation', () => {
  const scope = JSON.stringify(['A','plan']);
  const record = { version: 1, scope, savedAt: Date.now(), revision: 2, progress: emptyProgress(), pending: true };
  it('bounds age/owner/shape, retaining attempted payload for ambiguous acknowledgements', () => {
    expect(parseOfflineProgress(JSON.stringify(record), scope)?.pending).toBe(true);
    expect(parseOfflineProgress(JSON.stringify(record), 'other')).toBeNull();
    expect(parseOfflineProgress(JSON.stringify(record), scope, record.savedAt + OFFLINE_TTL)).toBeNull();
    expect(parseOfflineProgress(JSON.stringify({ ...record, attempt: { revision: 2, progress: {} } }), scope)).toBeNull();
    expect(parseOfflineProgress(JSON.stringify({ ...record, attempt: { revision: 2, progress: emptyProgress() } }), scope)?.attempt?.revision).toBe(2);
  });
  it('compares semantic state despite JSONB object key ordering', () => {
    expect(progressFingerprint(emptyProgress())).toBe(progressFingerprint({ extras: [], items: {}, version: 1 }));
  });
  it('rejects malformed offline ingredient snapshots instead of rendering untrusted objects', () => {
    const list = { byCategory: { pantry: [], toBuy: { meat: [{ name: '雞肉', unit: 'g', quantity: 2 }] } }, byRecipe: [], noUsableRecipes: false, notice: null };
    expect(readShoppingCache(JSON.stringify({ version: 1, scope, savedAt: record.savedAt, list }), scope)).toEqual(list);
    expect(readShoppingCache(JSON.stringify({ version: 1, scope, savedAt: record.savedAt, list }), 'other')).toBeNull();
    expect(readShoppingCache(JSON.stringify({ version: 1, scope, savedAt: record.savedAt, list: { ...list, byCategory: { pantry: [], toBuy: { meat: [{ name: {} }] } } } }), scope)).toBeNull();
  });
});
