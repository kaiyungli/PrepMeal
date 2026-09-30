import { describe, expect, it } from 'vitest';
import { FILTER_GROUPS } from '@/constants/filters';
import { buildFilterSections } from '@/constants/filterGroups';

// Regression protection required before GenerateSettings.tsx is allowed to
// replace its own hand-rolled section-building map with the shared
// buildFilterSections helper (so tier metadata propagates consistently
// instead of needing to be forwarded a second time). This mirrors
// GenerateSettings.tsx's PRE-swap construction exactly (same defensive
// dedupe-by-value, same id/title/options/selected shape, same toggle
// arithmetic) so the two can be compared directly for equivalence.
function buildSectionsLikeOldGenerateSettings(
  filters: Record<string, string[]>,
  setFilters: (next: Record<string, string[]>) => void
) {
  return FILTER_GROUPS.map(group => {
    const groupKey = group.key as string;
    const seen = new Set<string>();
    const dedupedOptions = (group.options || []).filter(opt => {
      if (!opt || !opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
    return {
      id: group.key,
      title: group.label,
      options: dedupedOptions,
      selected: filters[groupKey] || [],
      onToggle: (value: string) => {
        const current = filters[groupKey] || [];
        const newValues = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        setFilters({ ...filters, [groupKey]: newValues });
      },
    };
  });
}

describe('Generate filter section construction: buildFilterSections is a behavioral drop-in for the old hand-rolled map', () => {
  const filters: Record<string, string[]> = { cuisine: ['chinese'], protein: [], speed: ['quick'] };

  it('produces the same ids, titles, options (post-dedupe) and selected arrays', () => {
    const oldWay = buildSectionsLikeOldGenerateSettings(filters, () => {});
    const newWay = buildFilterSections(FILTER_GROUPS, filters, () => {});

    expect(newWay.map(s => s.id)).toEqual(oldWay.map(s => s.id));
    expect(newWay.map(s => s.title)).toEqual(oldWay.map(s => s.title));
    expect(newWay.map(s => s.options)).toEqual(oldWay.map(s => s.options));
    expect(newWay.map(s => s.selected)).toEqual(oldWay.map(s => s.selected));
  });

  it('dedupes options by value identically for every group, with no duplicate values surviving', () => {
    const newWay = buildFilterSections(FILTER_GROUPS, filters, () => {});
    newWay.forEach(section => {
      const values = section.options.map(o => o.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  it('computes an equivalent next-filters state when the same option is toggled', () => {
    let oldNext: Record<string, string[]> | null = null;
    const oldSections = buildSectionsLikeOldGenerateSettings(filters, (next) => { oldNext = next; });

    let newNext: Record<string, string[]> | null = null;
    const newSections = buildFilterSections(FILTER_GROUPS, filters, (groupKey, value) => {
      const current = filters[groupKey as keyof typeof filters] || [];
      const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      newNext = { ...filters, [groupKey]: newValues };
    });

    oldSections.find(s => s.id === 'cuisine')!.onToggle('japanese');
    newSections.find(s => s.id === 'cuisine')!.onToggle('japanese');

    expect(newNext).toEqual(oldNext);
  });

  it('computes an equivalent next-filters state when removing an already-selected value', () => {
    let oldNext: Record<string, string[]> | null = null;
    const oldSections = buildSectionsLikeOldGenerateSettings(filters, (next) => { oldNext = next; });

    let newNext: Record<string, string[]> | null = null;
    const newSections = buildFilterSections(FILTER_GROUPS, filters, (groupKey, value) => {
      const current = filters[groupKey as keyof typeof filters] || [];
      const newValues = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      newNext = { ...filters, [groupKey]: newValues };
    });

    oldSections.find(s => s.id === 'speed')!.onToggle('quick');
    newSections.find(s => s.id === 'speed')!.onToggle('quick');

    expect(newNext).toEqual(oldNext);
    expect(newNext).toEqual({ ...filters, speed: [] });
  });
});
