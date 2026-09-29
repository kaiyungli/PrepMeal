// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement, useState } from 'react';
import GenerateSettings from '@/components/generate/GenerateSettings';

afterEach(cleanup);

function isHidden(el: HTMLElement) {
  // Secondary filter groups stay mounted (never unmounted) behind the
  // "更多篩選" disclosure, same pattern as FilterShell's own content region -
  // a descendant of an aria-hidden ancestor is excluded from the a11y tree
  // even though it is still present in the DOM.
  return el.closest('[aria-hidden="true"]') !== null;
}

// GenerateSettings is a third, silent consumer of the shared FilterShell
// (alongside /recipes and /favorites via RecipeFilters, and the homepage via
// its own composition). This is a smoke test proving its filter shell still
// expands, renders groups, toggles a filter, and stays connected to clear -
// so a future refactor of the shared filter primitives cannot silently break
// /generate with nothing catching it.
function GenerateSettingsHarness() {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  return createElement(GenerateSettings, {
    daysPerWeek: 5,
    setDaysPerWeek: () => {},
    dailyComposition: 'meat_veg',
    setDailyComposition: () => {},
    allowCompleteMeal: false,
    setAllowCompleteMeal: () => {},
    servings: 2,
    setServings: () => {},
    budget: 'normal',
    setBudget: () => {},
    filters,
    setFilters,
    onClearAll: () => setFilters({}),
    isFilterExpanded,
    setIsFilterExpanded,
    handleToggleFilterExpanded: () => setIsFilterExpanded(v => !v),
  });
}

describe('GenerateSettings: filter shell regression smoke test', () => {
  it('expands and collapses the shared filter shell', () => {
    render(createElement(GenerateSettingsHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders filter groups with selectable chips once expanded', () => {
    render(createElement(GenerateSettingsHarness));
    fireEvent.click(screen.getByRole('button', { name: /^篩選/ }));
    const chip = screen.getByRole('button', { name: '中式' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });

  it('toggling a filter chip updates the active count badge', () => {
    render(createElement(GenerateSettingsHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    expect(screen.getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(toggle).getByText('1')).toBeTruthy();
  });

  it('clear stays connected: 重設所有設定 clears active filters', () => {
    render(createElement(GenerateSettingsHarness));
    fireEvent.click(screen.getByRole('button', { name: /^篩選/ }));
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    expect(screen.getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: '重設所有設定' }));
    expect(screen.getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('now that it is routed through the shared buildFilterSections, /generate gets the same primary/secondary disclosure as Home and /recipes', () => {
    render(createElement(GenerateSettingsHarness));
    fireEvent.click(screen.getByRole('button', { name: /^篩選/ }));
    // Primary (cuisine/protein/speed) is immediately visible...
    expect(screen.getByText('菜系')).toBeTruthy();
    expect(screen.getByText('主要蛋白')).toBeTruthy();
    expect(screen.getByText('所需時間')).toBeTruthy();
    // ...secondary (method/diet/etc.) is in the DOM but aria-hidden until
    // "更多篩選" is opened - not merely "not a button" (the label itself
    // never was one), but genuinely excluded from the accessibility tree.
    expect(isHidden(screen.getByText('烹調方式'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '＋ 更多篩選' }));
    expect(isHidden(screen.getByText('烹調方式'))).toBe(false);
    expect(isHidden(screen.getByText('飲食需求'))).toBe(false);
  });
});
