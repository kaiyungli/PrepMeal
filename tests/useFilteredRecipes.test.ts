import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useFilteredRecipes } from '@/features/generate/hooks/useFilteredRecipes';

type RecipeFixture = { id: string; flavor?: unknown; cuisine?: string; primary_protein?: string };

function filterRecipes(allRecipes: RecipeFixture[], filters: Record<string, string[]>, exclusions: string[] = []) {
  function Probe() {
    const result = useFilteredRecipes({ allRecipes, filters, exclusions });
    return createElement('output', null, result.map((recipe: RecipeFixture) => recipe.id).join(','));
  }
  return renderToStaticMarkup(createElement(Probe));
}

describe('generation filter error handling', () => {
  it('does not admit a malformed recipe when positive matching throws', () => {
    const malformed = { id: 'malformed', flavor: [42] };
    const matching = { id: 'matching', flavor: ['鹹'] };

    expect(filterRecipes([malformed, matching], { flavor: ['salty'] })).toBe('<output>matching</output>');
  });

  it('keeps valid matches and rejects normal nonmatches across groups', () => {
    const matching = { id: 'matching', cuisine: 'chinese', flavor: ['鹹'] };
    const other = { id: 'other', cuisine: 'japanese', flavor: ['鹹'] };

    expect(filterRecipes([matching, other], { cuisine: ['chinese'], flavor: ['salty'] })).toBe('<output>matching</output>');
  });

  it('preserves explicit protein exclusions', () => {
    const excluded = { id: 'excluded', primary_protein: 'egg' };
    const allowed = { id: 'allowed', primary_protein: 'tofu' };

    expect(filterRecipes([excluded, allowed], {}, ['egg'])).toBe('<output>allowed</output>');
  });
});
