import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RecipeList from '@/components/RecipeList';
import RecipeCard from '@/components/RecipeCard';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);
import { RecipeIndex, RelatedRecipeLinks } from '@/components/recipes/RecipeLinkSections';

// Cards that open the in-page modal must still be real links in the server
// HTML, so visitors and crawlers can reach every recipe page.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const recipes = [
  { id: 'a', slug: 'mapo-tofu', name: '麻婆豆腐' },
  { id: 'b', slug: 'garlic-napa', name: '蒜蓉娃娃菜' },
];

describe('recipe cards', () => {
  it('render an href even when a click opens the modal', () => {
    const html = renderToString(<RecipeList recipes={recipes} onRecipeClick={() => {}} />);
    expect(html).toContain('href="/recipes/mapo-tofu"');
    expect(html).toContain('href="/recipes/garlic-napa"');
    expect(html).not.toContain('role="link"');
  });

  it('plain click opens the modal; ctrl-click keeps the browser default', () => {
    const onRecipeClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<RecipeList recipes={recipes} onRecipeClick={onRecipeClick} />));
    const link = container.querySelector('a[href="/recipes/mapo-tofu"]') as HTMLAnchorElement;

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    act(() => { link.dispatchEvent(plain); });
    expect(plain.defaultPrevented).toBe(true);
    expect(onRecipeClick).toHaveBeenCalledTimes(1);
    expect(onRecipeClick.mock.calls[0][0].slug).toBe('mapo-tofu');

    const ctrl = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    link.addEventListener('click', e => e.preventDefault()); // keep jsdom from navigating
    act(() => { link.dispatchEvent(ctrl); });
    expect(onRecipeClick).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});

describe('card interaction boundaries', () => {
  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])('preserves native link handling for %o', modifiers => {
    const open = vi.fn();
    const { container } = render(<RecipeCard recipe={recipes[0]} onClick={open} />);
    const link = container.querySelector('a')!;
    let prevented = true;
    document.addEventListener('click', e => { prevented = e.defaultPrevented; e.preventDefault(); }, { once: true });
    fireEvent.click(link, { button: 0, ...modifiers });
    expect(open).not.toHaveBeenCalled();
    expect(prevented).toBe(false);
  });

  it.each(['default', 'home-featured'] as const)('%s keeps favorite activation separate from navigation', variant => {
    const open = vi.fn(), favorite = vi.fn();
    const { container } = render(<RecipeCard variant={variant} recipe={recipes[0]} onClick={open} onFavoriteClick={favorite} />);
    expect(container.querySelector('a button, button a')).toBeNull();
    const button = screen.getByRole('button', { name: '收藏：麻婆豆腐' });
    button.focus(); fireEvent.click(button, { detail: 0 });
    expect(favorite).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('a')!, { detail: 0 });
    expect(open).toHaveBeenCalledTimes(1);
    expect(favorite).toHaveBeenCalledTimes(1);
  });
});

describe('recipe link sections' , () => {
  it('index and related sections render plain links', () => {
    const index = renderToString(<RecipeIndex groups={[{ key: 'soup', title: '湯', recipes: [{ slug: 'corn-soup', name: '粟米湯' }] }]} />);
    expect(index).toContain('全部食譜目錄');
    expect(index).toContain('href="/recipes/corn-soup"');
    const related = renderToString(<RelatedRecipeLinks related={{ pairWith: [{ slug: 'v1', name: '蒜蓉菜心' }], similar: [] }} />);
    expect(related).toContain('href="/recipes/v1"');
    expect(related).toContain('href="/generate"');
    expect(renderToString(<RelatedRecipeLinks related={null} />)).toBe('');
  });
});
