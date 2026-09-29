// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useState } from 'react';
import GenerateSettings from '@/components/generate/GenerateSettings';

afterEach(cleanup);

// A fully stateful harness (unlike generateSettingsFilterShell.test.ts's
// smoke test, which uses no-op setters for these fields) so clicking a
// segmented option actually flows back through GenerateSettings and is
// reflected in the next render - proving the real setter/value wiring, not
// just that onClick fires.
function StatefulGenerateSettingsHarness() {
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [dailyComposition, setDailyComposition] = useState('meat_veg');
  const [allowCompleteMeal, setAllowCompleteMeal] = useState(false);
  const [servings, setServings] = useState(2);
  const [budget, setBudget] = useState('normal');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  return createElement(GenerateSettings, {
    daysPerWeek, setDaysPerWeek,
    dailyComposition, setDailyComposition,
    allowCompleteMeal, setAllowCompleteMeal,
    servings, setServings,
    budget, setBudget,
    filters, setFilters,
    onClearAll: () => setFilters({}),
    isFilterExpanded: false,
    setIsFilterExpanded: () => {},
    handleToggleFilterExpanded: () => {},
  });
}

describe('GenerateSettings: single-choice settings via SegmentedControl', () => {
  it('changing 每週日數 calls setDaysPerWeek with the numeric value and updates the checked segment', () => {
    render(createElement(StatefulGenerateSettingsHarness));
    expect((screen.getByRole('radio', { name: '5天' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '7天' }));
    expect((screen.getByRole('radio', { name: '7天' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '5天' }) as HTMLInputElement).checked).toBe(false);
  });

  it('changing 每餐菜式 calls setDailyComposition with the exact existing value (not a simplified label)', () => {
    render(createElement(StatefulGenerateSettingsHarness));
    expect((screen.getByRole('radio', { name: '一肉一菜' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '二肉一菜' }));
    expect((screen.getByRole('radio', { name: '二肉一菜' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('radio', { name: '一肉一菜' }) as HTMLInputElement).checked).toBe(false);
  });

  it('changing 預算偏好 calls setBudget with the exact existing value', () => {
    render(createElement(StatefulGenerateSettingsHarness));
    expect((screen.getByRole('radio', { name: '一般' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '寬裕' }));
    expect((screen.getByRole('radio', { name: '寬裕' }) as HTMLInputElement).checked).toBe(true);
  });

  it('leaves servings as the existing native select, unconverted', () => {
    render(createElement(StatefulGenerateSettingsHarness));
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('2');
    fireEvent.change(select, { target: { value: '4' } });
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
  });
});

describe('GenerateSettings: allowCompleteMeal stays an independent boolean toggle', () => {
  it('is visible when dailyComposition is meat_veg, hidden for complete_meal', () => {
    const { rerender } = render(createElement(GenerateSettings, {
      daysPerWeek: 5, setDaysPerWeek: () => {},
      dailyComposition: 'meat_veg', setDailyComposition: () => {},
      allowCompleteMeal: false, setAllowCompleteMeal: () => {},
      servings: 2, setServings: () => {},
      budget: 'normal', setBudget: () => {},
      filters: {}, setFilters: () => {},
      isFilterExpanded: false, setIsFilterExpanded: () => {}, handleToggleFilterExpanded: () => {},
    }));
    expect(screen.getByRole('button', { name: '可接受完整餐' })).toBeTruthy();

    rerender(createElement(GenerateSettings, {
      daysPerWeek: 5, setDaysPerWeek: () => {},
      dailyComposition: 'complete_meal', setDailyComposition: () => {},
      allowCompleteMeal: false, setAllowCompleteMeal: () => {},
      servings: 2, setServings: () => {},
      budget: 'normal', setBudget: () => {},
      filters: {}, setFilters: () => {},
      isFilterExpanded: false, setIsFilterExpanded: () => {}, handleToggleFilterExpanded: () => {},
    }));
    expect(screen.queryByRole('button', { name: /可接受完整餐/ })).toBeNull();
  });

  it('is visible for two_meat_one_veg too', () => {
    render(createElement(GenerateSettings, {
      daysPerWeek: 5, setDaysPerWeek: () => {},
      dailyComposition: 'two_meat_one_veg', setDailyComposition: () => {},
      allowCompleteMeal: false, setAllowCompleteMeal: () => {},
      servings: 2, setServings: () => {},
      budget: 'normal', setBudget: () => {},
      filters: {}, setFilters: () => {},
      isFilterExpanded: false, setIsFilterExpanded: () => {}, handleToggleFilterExpanded: () => {},
    }));
    expect(screen.getByRole('button', { name: '可接受完整餐' })).toBeTruthy();
  });

  it('exposes its state via aria-pressed and the accessible name stays exactly "可接受完整餐"', () => {
    render(createElement(GenerateSettings, {
      daysPerWeek: 5, setDaysPerWeek: () => {},
      dailyComposition: 'meat_veg', setDailyComposition: () => {},
      allowCompleteMeal: true, setAllowCompleteMeal: () => {},
      servings: 2, setServings: () => {},
      budget: 'normal', setBudget: () => {},
      filters: {}, setFilters: () => {},
      isFilterExpanded: false, setIsFilterExpanded: () => {}, handleToggleFilterExpanded: () => {},
    }));
    const button = screen.getByRole('button', { name: '可接受完整餐' });
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles setAllowCompleteMeal with the flipped boolean, independently of dailyComposition', () => {
    render(createElement(StatefulGenerateSettingsHarness));
    const button = screen.getByRole('button', { name: '可接受完整餐' });
    expect(button.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '可接受完整餐' }).getAttribute('aria-pressed')).toBe('true');
    // dailyComposition's own segmented selection is untouched by this click.
    expect((screen.getByRole('radio', { name: '一肉一菜' }) as HTMLInputElement).checked).toBe(true);
  });
});
