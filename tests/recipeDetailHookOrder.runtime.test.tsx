import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import RecipeDetailContent from '@/components/RecipeDetailContent';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
vi.mock('@/components/ads/AdSlot', () => ({ RecipeDetailInArticleAd: () => null }));
const a = { id: 'qa-hook-a', name: 'Recipe A', ingredients: [{ name: 'Ingredient A', quantity: 1 }], steps: [{ step_no: 1, text: 'Cook A' }] };
const b = { id: 'qa-hook-b', name: 'Recipe B', ingredients: [{ name: 'Ingredient B', quantity: 2 }], steps: [{ step_no: 1, text: 'Cook B' }] };
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const schedule = vi.fn((callback: FrameRequestCallback) => { const id = ++frameId; frames.set(id, callback); return id; });
const cancel = vi.fn((id: number) => { frames.delete(id); });
function flushFrame() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  });
}
beforeEach(() => {
  frames.clear(); frameId = 0; vi.clearAllMocks();
  vi.stubGlobal('requestAnimationFrame', schedule);
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('recipe detail content hook order and deferred rendering', () => {
  it('empty → recipe renders without React hook-order errors', () => {
    const view = render(<RecipeDetailContent recipe={null} />);
    expect(view.container.textContent).toBe('');
    expect(frames.size).toBe(0);
    view.rerender(<RecipeDetailContent recipe={a} />);
    flushFrame();
    expect(screen.getByRole('heading', { name: a.name })).toBeTruthy();
    expect(screen.getByText('Ingredient A')).toBeTruthy();
    expect(screen.getByText('Cook A')).toBeTruthy();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('recipe → empty → another recipe keeps the same hook order', () => {
    const view = render(<RecipeDetailContent recipe={a} />);
    flushFrame();
    view.rerender(<RecipeDetailContent recipe={null} />);
    expect(view.container.textContent).toBe('');
    view.rerender(<RecipeDetailContent recipe={b} />);
    flushFrame();
    expect(screen.queryByText('Ingredient A')).toBeNull();
    expect(screen.getByText('Ingredient B')).toBeTruthy();
    expect(screen.getByText('Cook B')).toBeTruthy();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('clearing the recipe cancels its pending frame and schedules no empty frame', () => {
    const view = render(<RecipeDetailContent recipe={a} />);
    expect(frames.size).toBe(1);
    view.rerender(<RecipeDetailContent recipe={null} />);
    expect(frames.size).toBe(0);
    expect(cancel).toHaveBeenCalledWith(1);
    flushFrame();
    expect(view.container.textContent).toBe('');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('rapid A → B cancels the A frame and renders only B sections', () => {
    const view = render(<RecipeDetailContent recipe={a} />);
    view.rerender(<RecipeDetailContent recipe={b} />);
    expect(cancel).toHaveBeenCalledWith(1);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(screen.queryByText('Cook A')).toBeNull();
    expect(screen.getByText('Cook B')).toBeTruthy();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('loading skeleton changes to full detail without changing the recipe ID', () => {
    const view = render(<RecipeDetailContent recipe={a} isLoading />);
    flushFrame();
    expect(screen.queryByText('Ingredient A')).toBeNull();
    view.rerender(<RecipeDetailContent recipe={a} isLoading={false} />);
    expect(screen.getByText('Ingredient A')).toBeTruthy();
    expect(screen.getByText('Cook A')).toBeTruthy();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('Strict Mode empty → recipe leaves one active frame and cleans up on unmount', () => {
    const view = render(<RecipeDetailContent recipe={null} />, { reactStrictMode: true });
    expect(frames.size).toBe(0);
    view.rerender(<RecipeDetailContent recipe={a} />);
    expect(frames.size).toBe(1);
    view.unmount();
    expect(frames.size).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('favorite action still works after an empty-to-recipe transition', () => {
    const favorite = vi.fn();
    const view = render(<RecipeDetailContent recipe={null} onFavoriteClick={favorite} />);
    view.rerender(<RecipeDetailContent recipe={a} onFavoriteClick={favorite} />);
    flushFrame();
    fireEvent.click(screen.getByRole('button'));
    expect(favorite).toHaveBeenCalledTimes(1);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('reopening the same recipe still defers heavy sections until its new frame', () => {
    const view = render(<RecipeDetailContent recipe={a} />);
    flushFrame();
    view.rerender(<RecipeDetailContent recipe={null} />);
    view.rerender(<RecipeDetailContent recipe={a} />);
    expect(screen.queryByText('Ingredient A')).toBeNull();
    expect(frames.size).toBe(1);
    flushFrame();
    expect(screen.getByText('Ingredient A')).toBeTruthy();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('a cancelled stale frame cannot hide the current recipe sections', () => {
    const view = render(<RecipeDetailContent recipe={a} />);
    const oldCallback = frames.get(1)!;
    view.rerender(<RecipeDetailContent recipe={b} />);
    flushFrame();
    act(() => oldCallback(0));
    expect(screen.getByText('Ingredient B')).toBeTruthy();
    expect(screen.getByText('Cook B')).toBeTruthy();
    expect(screen.queryByText('Ingredient A')).toBeNull();
    expect(console.error).not.toHaveBeenCalled();
  });
});
