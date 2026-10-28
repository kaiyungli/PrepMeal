import { describe, expect, it } from 'vitest';
import { DRAFT_TTL, draftKey, encodeDraft, hydrateDraft, parseDraft, type DraftSnapshot } from '@/features/generate/draftStore';

const snapshot: DraftSnapshot = {
  weeklyPlan: { mon: ['a', null, 'retired'] }, lockedSlots: { 'mon-0': true, 'mon-2': true }, notices: [],
  preferences: { daysPerWeek: 7, dailyComposition: 'two_meat_one_veg', servings: 4, allowCompleteMeal: true,
    budget: 'budget', ingredientReuse: 'normal', exclusions: ['chicken'], filters: { cuisine: ['chinese'], dish_type: [], protein: [], method: [], speed: [], difficulty: [], diet: [], flavor: [] } },
};
describe('seven-day draft contract', () => {
  it('accepts legacy unnamed drafts and bounded names but rejects malformed names', () => {
    expect(parseDraft(encodeDraft('guest', snapshot), 'guest').status).toBe('ok');
    for (const planName of ['', '下週五日晚餐', '名'.repeat(100)]) {
      const parsed = parseDraft(encodeDraft('guest', { ...snapshot, planName }), 'guest');
      expect(parsed.status).toBe('ok');
      if (parsed.status === 'ok') expect(parsed.draft.snapshot.planName).toBe(planName);
    }
    for (const planName of [null, {}, 12, '名'.repeat(101)]) {
      const raw = JSON.stringify({ version: 1, owner: 'guest', savedAt: Date.now(), snapshot: { ...snapshot, planName } });
      expect(parseDraft(raw, 'guest').status).toBe('invalid');
    }
  });
  it('preserves identity, slot gaps, settings and locks without storing recipe display objects', () => {
    const raw = encodeDraft('user:a', snapshot, 1000);
    const parsed = parseDraft(raw, 'user:a', 1001);
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') expect(parsed.draft.snapshot).toEqual(snapshot);
    expect(raw).not.toContain('calories');
  });
  it('rejects wrong account, corrupted structure, unsupported version and unsafe slot payloads', () => {
    expect(parseDraft(encodeDraft('user:a', snapshot), 'user:b').status).toBe('invalid');
    expect(parseDraft('{', 'guest').status).toBe('invalid');
    const stored = JSON.parse(encodeDraft('guest', snapshot));
    expect(parseDraft(JSON.stringify({ ...stored, version: 2 }), 'guest').status).toBe('invalid');
    stored.snapshot.weeklyPlan.mon = [{ id: 'a', name: 'untrusted' }];
    expect(parseDraft(JSON.stringify(stored), 'guest').status).toBe('invalid');
    expect(draftKey('guest')).not.toBe(draftKey('user:a'));
  });
  it('expires exactly at seven days and rejects future timestamps', () => {
    const raw = encodeDraft('guest', snapshot, 1000);
    expect(parseDraft(raw, 'guest', 1000 + DRAFT_TTL - 1).status).toBe('ok');
    expect(parseDraft(raw, 'guest', 1000 + DRAFT_TTL).status).toBe('expired');
    expect(parseDraft(raw, 'guest', 999).status).toBe('invalid');
  });
  it('rehydrates fresh recipe data and leaves retired slots empty with a visible explanation', () => {
    const result = hydrateDraft(snapshot, [{ id: 'a', name: 'current name' }]);
    expect(result.weeklyPlan.mon).toEqual([{ id: 'a', name: 'current name' }, null, null]);
    expect(result.lockedSlots).toEqual({ 'mon-0': true });
    expect(result.notices[0]).toContain('星期一第3道');
  });
});
