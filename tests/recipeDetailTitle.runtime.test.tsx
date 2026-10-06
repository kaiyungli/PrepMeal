import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { ReactNode } from 'react';

// The recipe detail page builds its <title> from the recipe name. React 19
// renders a <title> whose children are an array (e.g. {name} followed by
// literal text) as an empty title, so the name and the site suffix must reach
// <title> as one string.
//
// next/head is replaced by a pass-through so React's own <title> handling is
// what renders here; the recipe content, structured data and data loading are
// stubbed because only the page shell's title is under test.

const { loadRecipeDetail } = vi.hoisted(() => ({ loadRecipeDetail: vi.fn() }));
vi.mock('next/head', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/RecipeDetailContent', () => ({ default: ({ recipe }: { recipe: { name: string } }) => <h1>{recipe.name}</h1> }));
vi.mock('@/lib/recipeStructuredData.tsx', () => ({ RecipeStructuredData: () => null }));
vi.mock('@/components/seo/SEO', () => ({ default: () => null }));
vi.mock('@/utils/perf', () => ({ measurePageLoadMetrics: () => undefined }));
vi.mock('@/features/recipes', () => ({ loadRecipeDetail }));

import RecipeDetail, { getStaticProps } from '@/pages/recipes/[id]';

const RECIPE = { id: 'recipe-a', name: '番茄炒蛋', description: '家常小菜', ingredients: [], steps: [] };

function titleText() {
  const titles = document.querySelectorAll('title');
  expect(titles).toHaveLength(1);
  return titles[0].textContent;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = '';
  vi.restoreAllMocks();
  loadRecipeDetail.mockReset();
});

describe('Recipe detail page title', () => {
  it('A/B. a loaded recipe renders a non-empty title with its name and the site name', () => {
    render(<RecipeDetail recipe={RECIPE} error={null} />);

    expect(titleText()).toBe('番茄炒蛋 - 今晚食乜');
    expect(screen.getByRole('heading', { name: '番茄炒蛋' })).toBeTruthy();
  });

  it('A/B. server rendering emits the same single-string title', () => {
    const html = renderToString(<RecipeDetail recipe={RECIPE} error={null} />);

    expect(html).toContain('<title>番茄炒蛋 - 今晚食乜</title>');
  });

  it('C. the loading state renders without a title and without crashing', () => {
    render(<RecipeDetail recipe={null} error={null} />);

    expect(screen.getByText('載入中...')).toBeTruthy();
    expect(document.querySelector('title')).toBeNull();
  });

  it('C. the error state renders the not-found message without any recipe title', () => {
    render(<RecipeDetail recipe={null} error="Recipe not found" />);

    expect(screen.getByText('找不到食譜')).toBeTruthy();
    expect(document.querySelector('title')).toBeNull();
  });

  it('D. a recipe the loader does not return (private or missing) is still a 404', async () => {
    loadRecipeDetail.mockResolvedValue({ recipe: null, error: 'Recipe not found' });

    await expect(getStaticProps({ params: { id: 'private-recipe' } })).resolves.toEqual({ notFound: true, revalidate: 300 });
    expect(loadRecipeDetail).toHaveBeenCalledWith('private-recipe');
  });
});
