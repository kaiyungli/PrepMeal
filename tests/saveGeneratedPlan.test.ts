import { afterEach, describe, expect, it, vi } from 'vitest';

import { saveGeneratedPlan, type SavePlanPayload } from '@/features/generate/services/saveGeneratedPlan';
import { getDefaultPlanName, normalizePlanForSave } from '@/features/generate/mappers/normalizePlanForSave';

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


describe('generated plan naming', () => {
  it('uses generated fallback name for a blank name', () => {
    const generated = normalizePlanForSave({ mon: [{ id: 'recipe-1' }] }, 2, 5);
    expect(generated.name).toBe(getDefaultPlanName(2, 5));
  });
  it('preserves the existing default name when the user does not edit it', () => {
    const name = getDefaultPlanName(2, 5);
    const generated = normalizePlanForSave({ mon: [{ id: 'recipe-1' }] }, 2, 5);
    expect(generated.name).toBe(name);
    expect(generated.name).toContain('2人 5日餐單');
    expect(generated.items).toHaveLength(1);
  });

  it('sends a custom plan name in the existing save API payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { plan_id: 'plan-custom' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const edited = { ...normalizePlanForSave({ mon: [{ id: 'recipe-1' }] }, 2, 5), name: '週末家庭餐單' };
    expect(await saveGeneratedPlan(edited, 'token')).toEqual({ success: true });
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body).name).toBe('週末家庭餐單');
    expect(JSON.parse(request.body).items).toEqual(edited.items);
  });
});
