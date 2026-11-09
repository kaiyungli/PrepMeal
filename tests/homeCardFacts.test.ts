import { describe, expect, it, vi } from 'vitest';
const query = vi.hoisted(() => {
  const q = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  q.select.mockReturnValue(q); q.eq.mockReturnValue(q); q.order.mockReturnValue(q);
  return q;
});
vi.mock('@/features/guides/samplePlan.server', () => ({ loadSamplePlan: vi.fn() }));
vi.mock('@/lib/supabaseServer', () => ({ supabaseServer: { from: () => query } }));
import { loadHomeCatalogue } from '@/features/home/homeContent.server';
import { featuredCandidates } from '@/features/home/homeRotation';
import { nutritionValue } from '@/lib/utils';

describe('home card facts use the recipe detail columns without scaling', () => {
  it('queries and preserves difficulty and per-serving nutrition through the candidate mapper', async () => {
    const row = { id: 'a', slug: 'food-a', name: '食譜', image_url: 'https://images.unsplash.com/a.jpg', total_time_minutes: 30,
      difficulty: 'easy', calories_per_serving: 361, protein_g: 37, base_servings: 1, is_public: true };
    query.limit.mockResolvedValue({ data: [row], error: null });
    const rows = await loadHomeCatalogue();
    expect(query.select.mock.calls[0][0].split(',')).toEqual(expect.arrayContaining(['total_time_minutes', 'difficulty', 'calories_per_serving', 'protein_g']));
    expect(query.eq).toHaveBeenCalledWith('is_public', true);
    expect(featuredCandidates(rows!)[0]).toMatchObject({ total_time_minutes: 30, difficulty: 'easy', calories_per_serving: 361, protein_g: 37 });
    expect(featuredCandidates([{ ...row, calories_per_serving: 0, protein_g: 0 }])[0]).toMatchObject({ calories_per_serving: 0, protein_g: 0 });
  });
  it.each([null, undefined, '', ' ', '37', NaN, Infinity, -Infinity, -1, true, {}, []])('does not turn invalid %s into zero', value => {
    expect(nutritionValue(value)).toBeNull();
  });
  it.each([0, 0.5, 37, 361.25])('preserves valid %s without rounding', value => {
    expect(nutritionValue(value)).toBe(value);
  });
});
