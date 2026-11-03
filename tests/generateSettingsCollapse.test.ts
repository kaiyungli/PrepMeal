// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import GenerateSettings from '@/components/generate/GenerateSettings';

afterEach(cleanup);

const collapseClass = '[@media(min-width:1280px)_and_(pointer:fine)]:hidden';

function setup(hasRecipes = false) {
  const handlers = {
    setDaysPerWeek: vi.fn(), setDailyComposition: vi.fn(),
    setAllowCompleteMeal: vi.fn(), setServings: vi.fn(),
    setBudget: vi.fn(), setFilters: vi.fn(),
    onClearAll: vi.fn(), handleToggleFilterExpanded: vi.fn(),
  };
  const props = {
    hasRecipes, daysPerWeek: 3, dailyComposition: 'complete_meal',
    allowCompleteMeal: false, servings: 1, budget: 'normal',
    filters: { cuisine: [], dish_type: [], protein: [], method: [], speed: [],
      difficulty: [], diet: [], flavor: [] },
    isFilterExpanded: false, ...handlers,
  };
  const view = render(createElement(GenerateSettings, props));
  const update = (changes: Partial<typeof props>) =>
    view.rerender(createElement(GenerateSettings, { ...props, ...changes }));
  return { ...view, props, handlers, update };
}

function controlsRegion(): HTMLElement {
  const toggle = screen.getByRole('button', { name: /^(修改設定|收起設定)$/ });
  const id = toggle.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const region = document.getElementById(id!);
  expect(region).not.toBeNull();
  return region!;
}

describe('Generate settings responsive collapse', () => {
  it('shows planning controls before a plan exists and has no collapse toggle', () => {
    setup(false);
    expect(screen.queryByRole('button', { name: '修改設定' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '用餐人數' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3天' })).toBeTruthy();
  });

  it('collapses the desktop controls after a plan exists while retaining the settings summary', () => {
    const { update } = setup(false);
    update({ hasRecipes: true });
    const toggle = screen.getByRole('button', { name: '修改設定' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(controlsRegion().className).toContain(collapseClass);
    expect(screen.getByText(/目前設定：3 日 · 一份完整餐 · 1 人 · 一般/)).toBeTruthy();
  });

  it('expands and collapses the settings using the same accessible control region', () => {
    setup(true);
    const region = controlsRegion();
    fireEvent.click(screen.getByRole('button', { name: '修改設定' }));
    expect(screen.getByRole('button', { name: '收起設定' }).getAttribute('aria-expanded')).toBe('true');
    expect(region.className).not.toContain(collapseClass);
    fireEvent.click(screen.getByRole('button', { name: '收起設定' }));
    expect(screen.getByRole('button', { name: '修改設定' }).getAttribute('aria-expanded')).toBe('false');
    expect(region.className).toContain(collapseClass);
  });

  it('keeps controlled setting callbacks working and reflects changed values in the summary', () => {
    const { handlers, update } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: '修改設定' }));
    fireEvent.click(screen.getByRole('radio', { name: '5天' }));
    expect(handlers.setDaysPerWeek).toHaveBeenCalledWith(5);
    fireEvent.change(screen.getByRole('combobox', { name: '用餐人數' }), { target: { value: '2' } });
    expect(handlers.setServings).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('radio', { name: '省錢' }));
    expect(handlers.setBudget).toHaveBeenCalledWith('budget');
    update({ daysPerWeek: 5, servings: 2, budget: 'budget' });
    expect(screen.getByText(/目前設定：5 日 · 一份完整餐 · 2 人 · 省錢/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '收起設定' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('restores visible settings when the plan is cleared, including from a collapsed state', () => {
    const { update } = setup(true);
    const region = controlsRegion();
    expect(region.className).toContain(collapseClass);
    update({ hasRecipes: false });
    expect(screen.queryByRole('button', { name: '修改設定' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '用餐人數' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '3天' })).toBeTruthy();
    // The responsive hidden class must disappear when there is no plan.
    expect(region.className).not.toContain(collapseClass);
  });
});
