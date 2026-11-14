import { describe, expect, it } from 'vitest';
import { RECIPE_SLUG_RENAMES, canonicalRecipeSlug, findRecipeBySlug, slugAliases } from '@/constants/recipeSlugRenames';
import { exampleSlugs, selectPracticalExamples } from '@/features/guides/practicalExamples';
import { readFileSync } from 'node:fs';

describe('recipe slug renames', () => {
  it('maps only internal batch slugs to readable, unique, URL-safe slugs', () => {
    const entries = Object.entries(RECIPE_SLUG_RENAMES);
    expect(entries.length).toBe(100);
    for (const [from, to] of entries) {
      expect(from).toMatch(/^prepmeal-(25|batch[234])-/);
      expect(to).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(to).not.toMatch(/prepmeal|batch|xhs/);
      expect(RECIPE_SLUG_RENAMES[to]).toBeUndefined();
    }
    expect(new Set(entries.map(([, to]) => to)).size).toBe(entries.length);
  });

  it('gives both spellings for renamed slugs and only the slug otherwise', () => {
    expect(slugAliases('prepmeal-25-01-nikujaga')).toEqual(['prepmeal-25-01-nikujaga', 'nikujaga']);
    expect(slugAliases('mapo-tofu')).toEqual(['mapo-tofu']);
    expect(slugAliases('nikujaga')).toEqual(['nikujaga', 'prepmeal-25-01-nikujaga']);
    for (const value of ['constructor', '__proto__', 'toString']) {
      expect(slugAliases(value)).toEqual([value]);
      expect(canonicalRecipeSlug(value)).toBe(value);
    }
  });

  it('has no existing target collision in the reviewed 303-public-recipe snapshot', () => {
    const rows: { id: string; slug: string }[] = JSON.parse(readFileSync('docs/qa/editorial-guidance-20261113/recipe-snapshot.json', 'utf8'));
    const slugs = new Set(rows.map(r => r.slug));
    expect(rows).toHaveLength(303);
    for (const [from, to] of Object.entries(RECIPE_SLUG_RENAMES)) {
      expect(slugs.has(from)).toBe(true);
      expect(slugs.has(to)).toBe(false);
      expect(canonicalRecipeSlug(to)).toBe(to);
    }
    expect(new Set(rows.map(r => canonicalRecipeSlug(r.slug))).size).toBe(rows.length);
  });

  it('resolves current catalogue rows in both directions without mutating IDs or slugs', () => {
    for (const [from, to] of Object.entries(RECIPE_SLUG_RENAMES)) {
      const before = { id: 'same-id', slug: from }, after = { id: 'same-id', slug: to };
      expect(findRecipeBySlug(from, [after])).toBe(after);
      expect(findRecipeBySlug(to, [before])).toBe(before);
      expect(before.slug).toBe(from); expect(after.slug).toBe(to);
    }
  });

  it('links guide examples to the current slug after the rename', () => {
    const renamed = RECIPE_SLUG_RENAMES['prepmeal-batch2-04'];
    const [row] = selectPracticalExamples([{ id: 'x', slug: renamed, name: '例子', base_servings: 1,
      prep_time_minutes: 5, cook_time_minutes: 10, total_time_minutes: 15 }]);
    expect(row).toMatchObject({ slug: 'prepmeal-batch2-04', url_slug: renamed });
  });
  it.each([false, true])('retains every practical example and current link before/after rename: %s', renamed => {
    const catalogue = exampleSlugs.map((slug, i) => ({ id: String(i), slug: renamed ? canonicalRecipeSlug(slug) : slug,
      name: `食譜${i}`, base_servings: 1, prep_time_minutes: 5, cook_time_minutes: 10, total_time_minutes: 15 }));
    const rows = selectPracticalExamples(catalogue);
    expect(rows.map(r => r.slug)).toEqual([...exampleSlugs]);
    expect(rows.map(r => r.url_slug)).toEqual(catalogue.map(r => r.slug));
    expect(rows.map(r => r.id)).toEqual(catalogue.map(r => r.id));
  });
});
