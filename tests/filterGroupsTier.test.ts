import { describe, expect, it, vi } from 'vitest';
import { RECIPE_FILTER_GROUPS, buildFilterSections } from '@/constants/filterGroups';

// Presentation-only "tier" metadata (Filter UI redesign): proves the
// canonical RECIPE_FILTER_GROUPS source order is untouched, tier is data
// only (never read by filtering logic), and buildFilterSections forwards it
// unchanged so a generic renderer can partition by tier without knowing
// which keys "should" be primary.
describe('RECIPE_FILTER_GROUPS: canonical order is untouched by presentation tier metadata', () => {
  it('keeps the exact original key order', () => {
    expect(RECIPE_FILTER_GROUPS.map(g => g.key)).toEqual([
      'cuisine', 'dish_type', 'protein', 'method', 'speed', 'difficulty', 'diet', 'flavor',
    ]);
  });

  it('tags cuisine/protein/speed as primary and the rest as secondary', () => {
    const tiersByKey = Object.fromEntries(RECIPE_FILTER_GROUPS.map(g => [g.key, g.tier]));
    expect(tiersByKey).toEqual({
      cuisine: 'primary',
      dish_type: 'secondary',
      protein: 'primary',
      method: 'secondary',
      speed: 'primary',
      difficulty: 'secondary',
      diet: 'secondary',
      flavor: 'secondary',
    });
  });

  it('a consumer partitioning by tier while preserving source order yields the approved presentation order', () => {
    const primary = RECIPE_FILTER_GROUPS.filter(g => g.tier === 'primary').map(g => g.key);
    const secondary = RECIPE_FILTER_GROUPS.filter(g => g.tier === 'secondary').map(g => g.key);
    expect(primary).toEqual(['cuisine', 'protein', 'speed']);
    expect(secondary).toEqual(['dish_type', 'method', 'difficulty', 'diet', 'flavor']);
  });
});

describe('buildFilterSections: forwards tier metadata unchanged', () => {
  it('carries each group\'s tier onto its built section, alongside the existing fields', () => {
    const sections = buildFilterSections(RECIPE_FILTER_GROUPS, {}, vi.fn());
    const tiersByKey = Object.fromEntries(sections.map(s => [s.id, s.tier]));
    expect(tiersByKey.cuisine).toBe('primary');
    expect(tiersByKey.protein).toBe('primary');
    expect(tiersByKey.speed).toBe('primary');
    expect(tiersByKey.dish_type).toBe('secondary');
    expect(tiersByKey.flavor).toBe('secondary');
  });

  it('leaves tier undefined for a group that does not declare one (back-compat)', () => {
    const sections = buildFilterSections(
      [{ key: 'custom', label: 'Custom', options: [] }],
      {},
      vi.fn()
    );
    expect(sections[0].tier).toBeUndefined();
  });
});
