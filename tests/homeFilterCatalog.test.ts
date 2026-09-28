import { describe, expect, it } from 'vitest';
import { filterHomeCatalog } from '@/features/home/filterHomeCatalog';

const recipes = [
  { id: 1, name: '魚飯', description: '清蒸', cuisine: 'chinese', primary_protein: 'fish', diet: ['gluten_free'], flavor: ['salty', 'spicy'], created_at: '2026-01-02', total_time_minutes: 30 },
  { id: 2, name: '牛肉飯', description: '香辣', cuisine: 'chinese', primary_protein: 'beef', diet: [], flavor: ['spicy'], created_at: '2026-01-03', total_time_minutes: 20 },
  { id: 3, name: '蝦意粉', description: '', cuisine: 'italian', primary_protein: 'shrimp', diet: ['gluten_free'], flavor: ['salty'], created_at: '2026-01-01', total_time_minutes: null },
];

describe('homepage catalogue filtering', () => {
  it('matches API protein expansion, diet overlap, flavor containment and text search', () => {
    expect(filterHomeCatalog(recipes, { protein: ['seafood'], diet: ['gluten_free'] }, '', 'newest').map(r => r.id)).toEqual([1, 3]);
    expect(filterHomeCatalog(recipes, { flavor: ['salty', 'spicy'] }, '', 'newest').map(r => r.id)).toEqual([1]);
    expect(filterHomeCatalog(recipes, {}, '香辣', 'newest').map(r => r.id)).toEqual([2]);
  });

  it('sorts matching recipes before pagination and puts missing times last', () => {
    expect(filterHomeCatalog(recipes, {}, '', 'time_short').map(r => r.id)).toEqual([2, 1, 3]);
  });
});
