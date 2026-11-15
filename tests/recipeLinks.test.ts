import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { groupRecipeIndex, selectRelatedRecipes, type LinkRecipe } from '@/features/recipes/recipeLinks';
import { REVIEWED_RECIPE_PAIRINGS } from '@/constants/recipePairings';

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
  it('resolves all reviewed named dishes by public recipe ID and prioritizes them', () => {
    const catalogue = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8'));
    const payload = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/payload.json', 'utf8'));
    for (const [id, review] of Object.entries(REVIEWED_RECIPE_PAIRINGS)) {
      expect(payload.find((entry: { id: string }) => entry.id === id).guidance.pairing_suggestions).toContain(review.suggestion);
      for (const target of review.recipeIds) {
        expect(review.suggestion).toContain(catalogue.find((recipe: LinkRecipe) => recipe.id === target).name);
      }
      const current = { ...catalogue.find((recipe: LinkRecipe) => recipe.id === id), pairing_suggestions: [review.suggestion] };
      const related = selectRelatedRecipes(current, [...catalogue, ...catalogue]);
      expect(related.reviewedPairings?.map(recipe => recipe.slug)).toEqual(review.recipeIds.map(
        target => catalogue.find((recipe: LinkRecipe) => recipe.id === target).slug));
      expect(related.pairWith.slice(0, review.recipeIds.length)).toEqual(related.reviewedPairings);
      const slugs = [...related.pairWith, ...related.similar].map(recipe => recipe.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs).not.toContain(current.slug);
    }
  });
  it('uses live slugs, skips absent public targets and rejects stale editorial copy', () => {
    const [id, review] = Object.entries(REVIEWED_RECIPE_PAIRINGS)[0];
    const current = r('current', 'protein_side', { id, pairing_suggestions: [review.suggestion] });
    const renamed = r('new-public-slug', 'veg_side', { id: review.recipeIds[0], name: '蒜蓉西蘭花' });
    expect(selectRelatedRecipes(current, [renamed]).reviewedPairings).toEqual([{ slug: renamed.slug, name: renamed.name }]);
    expect(selectRelatedRecipes(current, CATALOGUE).reviewedPairings).toBeUndefined();
    expect(selectRelatedRecipes({ ...current, pairing_suggestions: ['新的配搭建議'] }, [renamed]).reviewedPairings).toBeUndefined();
    expect(selectRelatedRecipes(current, [renamed], 0).pairWith).toEqual([]);
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
