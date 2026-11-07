import { describe, expect, it } from 'vitest';
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
});

describe('related recipes', () => {
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
    expect(similar.map(x => x.slug)).not.toContain('m4');
  });

  it('is stable for the same page', () => {
    expect(selectRelatedRecipes(CATALOGUE[4], CATALOGUE)).toEqual(selectRelatedRecipes(CATALOGUE[4], CATALOGUE));
  });
});
