// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeRecipeGrid from '@/components/home/HomeRecipeGrid';

vi.mock('next/router', () => ({ useRouter: () => ({ prefetch: vi.fn() }) }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail: vi.fn() }));
vi.mock('@/utils/speculativeFetch', () => ({ canStartSpeculativeFetch: () => false }));
vi.mock('@/components/RecipeCard', () => ({
  default: ({ recipe, onClick, onFavoriteClick }: {
    recipe: { name: string }; onClick: () => void; onFavoriteClick: () => void;
  }) => React.createElement('div', null,
    React.createElement('button', { onClick }, recipe.name),
    React.createElement('button', { onClick: onFavoriteClick }, '收藏')),
}));
afterEach(cleanup);

describe('HomeRecipeGrid updates for the same recipe ID', () => {
  it('renders changed recipe data and invokes the current recipe callback', () => {
    const oldClick = vi.fn();
    const newClick = vi.fn();
    const original = { id: 'same', name: '原名稱' };
    const updated = { ...original, name: '更新名稱' };
    const view = render(React.createElement(HomeRecipeGrid, { recipes: [original], onRecipeClick: oldClick }));
    view.rerender(React.createElement(HomeRecipeGrid, { recipes: [updated], onRecipeClick: newClick }));
    expect(screen.queryByText('原名稱')).toBeNull();
    fireEvent.click(screen.getByText('更新名稱'));
    expect(newClick).toHaveBeenCalledWith(updated);
    expect(oldClick).not.toHaveBeenCalled();
  });

  it('replaces a favorite handler even when recipe and favorite state stay unchanged', () => {
    const oldFavorite = vi.fn();
    const newFavorite = vi.fn();
    const recipes = [{ id: 'same', name: '食譜' }];
    const view = render(React.createElement(HomeRecipeGrid, { recipes, onFavoriteClick: oldFavorite }));
    view.rerender(React.createElement(HomeRecipeGrid, { recipes, onFavoriteClick: newFavorite }));
    fireEvent.click(screen.getByText('收藏'));
    expect(newFavorite).toHaveBeenCalledWith('same');
    expect(oldFavorite).not.toHaveBeenCalled();
  });
});
