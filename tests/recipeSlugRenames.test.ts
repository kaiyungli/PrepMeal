import { describe, expect, it } from 'vitest';
import { RECIPE_SLUG_RENAMES, slugAliases } from '@/constants/recipeSlugRenames';
import { selectPracticalExamples } from '@/features/guides/practicalExamples';

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
  });

  it('links guide examples to the current slug after the rename', () => {
    const renamed = RECIPE_SLUG_RENAMES['prepmeal-batch2-04'];
    const [row] = selectPracticalExamples([{ id: 'x', slug: renamed, name: '例子', base_servings: 1,
      prep_time_minutes: 5, cook_time_minutes: 10, total_time_minutes: 15 }]);
    expect(row).toMatchObject({ slug: 'prepmeal-batch2-04', url_slug: renamed });
  });
});
