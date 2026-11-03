// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import WeeklyPlanGrid from '@/components/generate/WeeklyPlanGrid';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => createElement('img', { alt }) }));
vi.mock('@/features/recipes/services/recipeDetailClientCache', () => ({ prefetchRecipeDetail: vi.fn() }));
afterEach(cleanup);

function setup(locked = false) {
  const recipe = { id: 'recipe-1', name: '南瓜鮮菇雞絲飯', image_url: '/recipe.jpg' };
  const props = {
    weeklyPlan: { mon: [recipe] }, lockedSlots: { 'mon-0': locked }, daysPerWeek: 3,
    dishesPerDay: 1, dailyComposition: 'complete_meal', onRecipeClick: vi.fn(),
    onReplace: vi.fn(), onLock: vi.fn(), onUnlock: vi.fn(), onRemove: vi.fn(), onAddRandom: vi.fn(),
  };
  render(createElement(WeeklyPlanGrid, props));
  return { ...props, recipe };
}

describe('generated meal card interactions', () => {
  it('opens recipe details with the keyboard and replaces only the selected slot', () => {
    const props = setup();
    fireEvent.keyDown(screen.getByRole('button', { name: props.recipe.name }), { key: 'Enter' });
    expect(props.onRecipeClick).toHaveBeenCalledWith(props.recipe);
    fireEvent.click(screen.getByRole('button', { name: '換一道' }));
    expect(props.onReplace).toHaveBeenCalledWith('mon', 0);
  });
  it('keeps lock state explicit and routes unlock to the selected slot', () => {
    const props = setup(true);
    const unlock = screen.getByRole('button', { name: '解鎖' });
    expect(unlock.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(unlock);
    expect(props.onUnlock).toHaveBeenCalledWith('mon', 0);
    expect(props.onLock).not.toHaveBeenCalled();
  });
  it('reveals removal through more actions and preserves the add-to-gap callback', () => {
    const props = setup();
    const more = screen.getByLabelText('第一天第1道更多操作');
    const disclosure = more.closest('details')!;
    expect(disclosure.open).toBe(false);
    fireEvent.click(more);
    expect(disclosure.open).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '移除' }));
    expect(props.onRemove).toHaveBeenCalledWith('mon', 0);
    fireEvent.click(screen.getByRole('button', { name: '第二天第1道：添加完整餐' }));
    expect(props.onAddRandom).toHaveBeenCalledWith('tue', 0);
  });
});
