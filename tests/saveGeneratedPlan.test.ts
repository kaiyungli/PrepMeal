import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveGeneratedPlan, type SavePlanPayload } from '@/features/generate/services/saveGeneratedPlan';

const payload: SavePlanPayload = {
  name: '測試餐單',
  week_start_date: '2026-09-09',
  days_count: 1,
  items: [
    {
      day_index: 0,
      meal_type: 'dinner',
      recipe_id: '11111111-1111-4111-8111-111111111111',
      servings: 2,
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveGeneratedPlan', () => {
  it('returns success only for an ok response with a plan id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { plan_id: 'plan-1' } }),
    }));

    await expect(saveGeneratedPlan(payload, 'token')).resolves.toEqual({ success: true });
  });

  it('does not treat a non-ok response as success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: true, error: 'Rejected' }),
    }));

    await expect(saveGeneratedPlan(payload, 'token')).resolves.toEqual({
      success: false,
      error: 'Rejected',
    });
  });

  it('rejects a malformed success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    }));

    await expect(saveGeneratedPlan(payload, 'token')).resolves.toEqual({
      success: false,
      error: 'Invalid save response',
    });
  });
});
