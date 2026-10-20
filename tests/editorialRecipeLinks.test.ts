import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { editorialRecipeAliases, editorialRecipeHref, unavailableEditorialRecipes } from '@/constants/editorialRecipeLinks';
import EditorialRecipeLink from '@/components/recipes/EditorialRecipeLink';
import nextConfig from '../next.config';
import publicSlugs from './fixtures/publicRecipeSlugs.20261020.json';

const publicRecipes = new Set(publicSlugs);
it('resolves every linked recipe in the four actual guides to a verified public recipe or explicit unavailable state', () => {
  let checked = 0;
  for (const page of ['50-classic-hk-recipes', 'hong-kong-market-shopping-guide', '7-day-dinner-plan', '30-minute-dinner-recipes']) {
    const source = readFileSync(`src/pages/${page}.tsx`, 'utf8');
    expect(source).not.toMatch(/href=["']\/recipes\//);
    expect(source).not.toContain('href={`/recipes/');
    for (const match of source.matchAll(/(?:slug:\s*['"]|slug=")([a-z0-9-]+)/g)) {
      const target = editorialRecipeHref(match[1]);
      if (target) expect(publicRecipes.has(target.slice('/recipes/'.length)), match[1]).toBe(true);
      else expect(unavailableEditorialRecipes.has(match[1])).toBe(true);
      checked++;
    }
  }
  expect(checked).toBe(104);
});

it('redirects only verified equivalent aliases and leaves absent dishes without a misleading redirect', async () => {
  const redirects = await nextConfig.redirects!();
  for (const [oldSlug, canonical] of Object.entries(editorialRecipeAliases)) {
    expect(publicRecipes.has(canonical)).toBe(true);
    expect(editorialRecipeAliases[canonical]).toBeUndefined();
    expect(redirects).toContainEqual({source:`/recipes/${oldSlug}`,destination:`/recipes/${canonical}`,permanent:true});
  }
  expect(editorialRecipeHref('wood-ear-salad')).toBe('/recipes/cold-black-fungus-xhs');
  expect(redirects.some(r=>r.source==='/recipes/cantonese-clay-pot-rice')).toBe(false);
});

it('renders a correct anchor for an existing recipe and clear nonlinks for unavailable dishes', () => {
  const link = renderToStaticMarkup(createElement(EditorialRecipeLink, {slug:'wood-ear-salad',children:'涼拌木耳'}));
  expect(link).toContain('href="/recipes/cold-black-fungus-xhs"');
  const unavailable = renderToStaticMarkup(createElement(EditorialRecipeLink, {slug:'cantonese-clay-pot-rice',children:'煲仔飯'}));
  expect(unavailable).toContain('煲仔飯');expect(unavailable).toContain('食譜暫未提供');expect(unavailable).not.toContain('<a');
  const inline = renderToStaticMarkup(createElement(EditorialRecipeLink, {slug:'cantonese-clay-pot-rice',children:'[睇食譜]',unavailableLabel:'食譜暫未提供'}));
  expect(inline).not.toContain('睇食譜');expect(inline).toContain('食譜暫未提供');
});
