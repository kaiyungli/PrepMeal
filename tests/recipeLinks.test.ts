import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { groupRecipeIndex, selectRelatedRecipes, type LinkRecipe } from '@/features/recipes/recipeLinks';

const r = (slug: string, meal_role: string, extra: Partial<LinkRecipe> = {}): LinkRecipe =>
  ({ slug, name: `菜${slug}`, meal_role, is_complete_meal: meal_role === 'complete_meal', primary_protein: null, cuisine: 'chinese', ...extra });

const CATALOGUE: LinkRecipe[] = [
  r('m1', 'protein_main', { primary_protein: 'chicken' }),
  r('m2', 'protein_main', { primary_protein: 'chicken' }),
  r('m3', 'protein_main', { primary_protein: 'pork' }),
  r('m4', 'protein_main', { primary_protein: 'beef', cuisine: 'japanese' }),
  r('v1', 'veg_side'), r('v2', 'veg_side'), r('v3', 'veg_side'),
  r('s1', 'soup'), r('c1', 'complete_meal'), r('p1', 'protein_side'),
];

describe('recipe index', () => {
  it('lists every recipe exactly once, grouped by role', () => {
    const groups = groupRecipeIndex(CATALOGUE);
    const slugs = groups.flatMap(g => g.recipes.map(x => x.slug));
    expect(slugs.sort()).toEqual(CATALOGUE.map(x => x.slug).sort());
    expect(groups.map(g => g.key)).toEqual(['protein_main', 'protein_side', 'veg_side', 'soup', 'complete_meal']);
  });

  it('puts unknown roles under 其他 and skips rows without slug', () => {
    const groups = groupRecipeIndex([r('x', 'dessert'), { slug: '', name: '冇slug', meal_role: 'soup' }]);
    expect(groups).toEqual([{ key: 'other', title: '其他', recipes: [{ slug: 'x', name: '菜x' }] }]);
  });
  it('does not duplicate links if catalogue input repeats a slug', () => {
    const groups = groupRecipeIndex([...CATALOGUE, CATALOGUE[0]]);
    expect(groups.flatMap(group => group.recipes)).toHaveLength(CATALOGUE.length);
  });
});

describe('related recipes', () => {
  it('follows public catalogue changes without per-recipe configuration', () => {
    const current = r('current', 'protein_main', { id: 'current-id', pairing_suggestions: ['可配舊菜名。'] });
    const target = r('renamed-slug', 'veg_side', { name: '新菜名' });
    expect(selectRelatedRecipes(current, [target]).pairWith).toEqual([{ slug: target.slug, name: target.name }]);
    expect(selectRelatedRecipes(current, []).pairWith).toEqual([]);
    expect(selectRelatedRecipes(current, [r('other-slug', 'veg_side', { id: current.id })]).pairWith).toEqual([]);
  });
  it.each([
    ['protein_main', ['veg_side', 'soup']], ['protein_side', ['veg_side', 'soup']],
    ['veg_side', ['protein_main', 'protein_side']], ['soup', ['protein_main', 'veg_side']],
    ['complete_meal', ['veg_side', 'soup']],
  ])('offers complementary roles for %s and represents both categories', (role, roles) => {
    const current = r('current', role as string);
    const result = selectRelatedRecipes(current, CATALOGUE);
    const selectedRoles = result.pairWith.map(link => CATALOGUE.find(x => x.slug === link.slug)!.meal_role);
    expect(selectedRoles.every(x => roles.includes(x!))).toBe(true);
    expect(new Set(selectedRoles)).toEqual(new Set(roles));
  });
  it('prefers contrasting protein, mild flavour and different cooking methods', () => {
    const current = r('current', 'soup', { primary_protein: 'chicken', flavor: ['spicy'], method: 'fried' });
    const repeated = r('repeat', 'protein_main', { primary_protein: 'chicken', flavor: ['spicy'], method: 'fried' });
    const contrast = r('contrast', 'protein_main', { primary_protein: 'tofu', flavor: ['salty'], method: 'steamed' });
    expect(selectRelatedRecipes(current, [repeated, contrast], 1).pairWith[0].slug).toBe('contrast');
  });
  it('handles missing metadata and invalid limits without inventing pairings', () => {
    expect(selectRelatedRecipes({ slug: 'unknown', name: '未分類' }, CATALOGUE).pairWith).toEqual([]);
    for (const limit of [0, -1, NaN, Infinity]) expect(selectRelatedRecipes(CATALOGUE[0], CATALOGUE, limit)).toEqual({ pairWith: [], similar: [] });
    expect(selectRelatedRecipes(CATALOGUE[0], CATALOGUE, 1.9).pairWith).toHaveLength(1);
    expect(selectRelatedRecipes(CATALOGUE[0], CATALOGUE)).toEqual(selectRelatedRecipes(CATALOGUE[0], [...CATALOGUE].reverse()));
  });
  it('pairs a main dish with vegetables or soup and never links to itself', () => {
    const { pairWith, similar } = selectRelatedRecipes(CATALOGUE[0], CATALOGUE);
    expect(pairWith.length).toBe(4);
    for (const x of pairWith) expect(['v1', 'v2', 'v3', 's1']).toContain(x.slug);
    expect([...pairWith, ...similar].map(x => x.slug)).not.toContain('m1');
  });

  it('prefers the same protein, then the same cuisine, within the same role', () => {
    const { similar } = selectRelatedRecipes(CATALOGUE[0], CATALOGUE);
    expect(similar[0].slug).toBe('m2');
    expect(similar.map(x => x.slug)).toContain('m3');
    expect(similar.map(x => x.slug)).toEqual(['m2', 'm3', 'm4']);
  });

  it('still offers same-role recipes when protein and cuisine do not match', () => {
    const current = r('current', 'protein_main', { primary_protein: 'fish', cuisine: 'thai' });
    const related = selectRelatedRecipes(current, CATALOGUE);
    expect(related.similar).toHaveLength(4);
    expect(new Set(related.similar.map(x => x.slug)).size).toBe(4);
  });

  it('is stable for the same page', () => {
    expect(selectRelatedRecipes(CATALOGUE[4], CATALOGUE)).toEqual(selectRelatedRecipes(CATALOGUE[4], CATALOGUE));
  });
  it('deduplicates repeated candidates within and across the recommendation groups', () => {
    const related = selectRelatedRecipes(CATALOGUE[0], [...CATALOGUE, ...CATALOGUE]);
    const slugs = [...related.pairWith, ...related.similar].map(recipe => recipe.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain(CATALOGUE[0].slug);
  });
  it('covers every existing public recipe without self-links or duplicate recommendations', () => {
    const catalogue: LinkRecipe[] = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8'));
    expect(catalogue).toHaveLength(303);
    const indexed = groupRecipeIndex(catalogue).flatMap(group => group.recipes.map(recipe => recipe.slug));
    expect(indexed.sort()).toEqual(catalogue.map(recipe => recipe.slug).sort());
    for (const current of catalogue) {
      const related = selectRelatedRecipes(current, catalogue);
      const slugs = [...related.pairWith, ...related.similar].map(recipe => recipe.slug);
      expect(slugs, current.name).not.toContain(current.slug);
      expect(new Set(slugs).size, current.name).toBe(slugs.length);
      expect(related.pairWith.length).toBeLessThanOrEqual(4);
      expect(related.similar.length).toBeLessThanOrEqual(4);
      expect(slugs.every(slug => catalogue.some(recipe => recipe.slug === slug))).toBe(true);
    }
  });
});

// Classification is catalogue data, not a recipe-specific recommendation exception.
it('keeps a corrected rice congee out of soup pairings and offers it vegetable/soup complements', () => {
  const congee = r('chicken-congee', 'complete_meal', { is_complete_meal: true, primary_protein: 'chicken' });
  const catalogue = [...CATALOGUE, congee];
  expect(selectRelatedRecipes(CATALOGUE[0], catalogue).pairWith.map(x => x.slug)).not.toContain(congee.slug);
  const links = selectRelatedRecipes(congee, catalogue).pairWith;
  expect(links.length).toBeGreaterThan(0);
  expect(links.every(x => ['veg_side', 'soup'].includes(catalogue.find(r => r.slug === x.slug)!.meal_role!))).toBe(true);
});
