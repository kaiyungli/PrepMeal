import { describe, expect, it } from 'vitest';
import { filterHomeCatalog } from '@/features/home/filterHomeCatalog';

const recipes = [
  { id: 1, name: '魚飯', description: '清蒸', cuisine: 'chinese', primary_protein: 'fish', diet: ['gluten_free'], flavor: ['salty', 'spicy'], created_at: '2026-01-02', total_time_minutes: 30 },
  { id: 2, name: '牛肉飯', description: '香辣', cuisine: 'chinese', primary_protein: 'beef', diet: [], flavor: ['spicy'], created_at: '2026-01-03', total_time_minutes: 20 },
  { id: 3, name: '蝦意粉', description: '', cuisine: 'italian', primary_protein: 'shrimp', diet: ['gluten_free'], flavor: ['salty'], created_at: '2026-01-01', total_time_minutes: null },
  { id: 4, name: '雜錦海鮮煲', description: '', cuisine: 'chinese', primary_protein: 'seafood', diet: [], flavor: [], created_at: '2026-01-04', total_time_minutes: 25 },
];

describe('homepage catalogue filtering', () => {
  it('matches primary_protein sibling semantics - no seafood/fish/shrimp expansion', () => {
    expect(filterHomeCatalog(recipes, { protein: ['seafood'] }, '', 'newest').map(r => r.id)).toEqual([4]);
    expect(filterHomeCatalog(recipes, { protein: ['fish'] }, '', 'newest').map(r => r.id)).toEqual([1]);
    expect(filterHomeCatalog(recipes, { protein: ['shrimp'] }, '', 'newest').map(r => r.id)).toEqual([3]);
    // Same-group OR unions the sibling values selected - it never pulls in
    // an unselected sibling the way the old seafood->fish/shrimp expansion did.
    expect(filterHomeCatalog(recipes, { protein: ['fish', 'shrimp'] }, '', 'newest').map(r => r.id)).toEqual([1, 3]);
    // Cross-group AND: the only seafood-tagged recipe has no gluten_free tag.
    expect(filterHomeCatalog(recipes, { protein: ['seafood'], diet: ['gluten_free'] }, '', 'newest').map(r => r.id)).toEqual([]);
  });

  it('matches diet with same-group OR and supports free-text search', () => {
    expect(filterHomeCatalog(recipes, { diet: ['gluten_free'] }, '', 'newest').map(r => r.id)).toEqual([1, 3]);
    expect(filterHomeCatalog(recipes, {}, '香辣', 'newest').map(r => r.id)).toEqual([2]);
  });

  it('matches flavor with same-group OR (any selected flavor), not containment of all selected flavors', () => {
    // Recipe 1 has both, 2 has only spicy, 3 has only salty, 4 has none -
    // OR means all three tagged recipes match, not just the one with both.
    expect(filterHomeCatalog(recipes, { flavor: ['salty', 'spicy'] }, '', 'newest').map(r => r.id)).toEqual([2, 1, 3]);
  });

  it('sorts matching recipes before pagination and puts missing times last', () => {
    expect(filterHomeCatalog(recipes, {}, '', 'time_short').map(r => r.id)).toEqual([2, 4, 1, 3]);
  });
});
