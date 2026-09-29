// @vitest-environment jsdom
// Structural regression (Shared Filter Architecture Slice 2): Home, /recipes
// and /generate must all render through the one canonical FilterShell, not
// through parallel bespoke shell markup that merely looks similar. Every
// FilterShell instance stamps its root with `data-filter-shell-root` - this
// asserts that marker is present, and specifically on the elements each page
// already asserts its toggle button/content region against, so a future
// regression that reintroduces a page-specific card/header implementation
// (instead of composing FilterShell) fails here even if it happens to keep
// the same visual classes.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement, useState } from 'react';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';
import GenerateSettings from '@/components/generate/GenerateSettings';
import HomeFiltersSection from '@/features/home/components/HomeFiltersSection';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';
import { useHomePageViewState } from '@/features/home/hooks/useHomePageViewState';

afterEach(cleanup);

const SHELL_ROOT_SELECTOR = '[data-filter-shell-root="true"]';

function RecipesFilterHarness() {
  const {
    searchQuery, setSearchQuery, sortBy, setSortBy, showFilters, setShowFilters,
    recipeFilterSections, activeFilterCount, clearFilters,
  } = useRecipeFilters();
  return createElement(RecipeFilters, {
    searchQuery, setSearchQuery, sortBy, setSortBy, showFilters, setShowFilters,
    recipeFilterSections, activeFilterCount, clearFilters,
  });
}

function GenerateSettingsHarness() {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  return createElement(GenerateSettings, {
    daysPerWeek: 5, setDaysPerWeek: () => {},
    dailyComposition: 'meat_veg', setDailyComposition: () => {},
    allowCompleteMeal: false, setAllowCompleteMeal: () => {},
    servings: 2, setServings: () => {},
    budget: 'normal', setBudget: () => {},
    filters, setFilters,
    onClearAll: () => setFilters({}),
    isFilterExpanded, setIsFilterExpanded,
    handleToggleFilterExpanded: () => setIsFilterExpanded(v => !v),
  });
}

const catalog = [
  { id: '1', name: '中式魚飯', cuisine: 'chinese', created_at: '2026-01-02' },
  { id: '2', name: '意粉', cuisine: 'italian', created_at: '2026-01-01' },
];

function HomeFilterHarness() {
  const state = useHomeRecipeFilters({ catalog, initialRecipes: catalog, initialTotalCount: 2 });
  const { showResults, showEmptyState, resultCountText } = useHomePageViewState({
    loading: state.loading,
    fetchError: state.fetchError,
    recipesList: state.recipesList,
    totalCount: state.totalCount,
    hasFilters: state.hasFilters,
    searchQuery: state.searchQuery,
  });
  return createElement(HomeFiltersSection, {
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    sortBy: state.sortBy,
    setSortBy: state.setSortBy,
    showFilters: state.showFilters,
    setShowFilters: state.setShowFilters,
    recipeFilterSections: state.recipeFilterSections,
    hasDraftSelection: state.hasDraftSelection,
    hasPendingChanges: state.hasPendingChanges,
    appliedFilterCount: state.appliedFilterCount,
    clearFilters: state.clearFilters,
    applyFilters: state.applyFilters,
    showSummary: showResults || showEmptyState,
    appliedFilterChips: state.appliedFilterChips,
    appliedSearchQuery: state.appliedSearchQuery,
    resultCountText,
    removeDraftFilterValue: state.removeDraftFilterValue,
    removeDraftSearch: state.removeDraftSearch,
    clearAppliedFilters: state.clearAppliedFilters,
  });
}

describe('Shared Filter Shell: canonical FilterShell markup, not parallel implementations', () => {
  it('/recipes (via RecipeFilters) renders exactly one FilterShell root, and its toggle button lives inside it', () => {
    render(createElement(RecipesFilterHarness));
    const roots = document.querySelectorAll(SHELL_ROOT_SELECTOR);
    expect(roots.length).toBe(1);
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(roots[0].contains(toggle)).toBe(true);
  });

  it('/generate (via GenerateSettings) renders exactly one FilterShell root, and its toggle button lives inside it', () => {
    render(createElement(GenerateSettingsHarness));
    const roots = document.querySelectorAll(SHELL_ROOT_SELECTOR);
    expect(roots.length).toBe(1);
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(roots[0].contains(toggle)).toBe(true);
  });

  it('the homepage (via HomeFiltersSection) renders exactly one FilterShell root, and its toggle button + desktop content region live inside it', () => {
    render(createElement(HomeFilterHarness));
    const roots = document.querySelectorAll(SHELL_ROOT_SELECTOR);
    expect(roots.length).toBe(1);
    const toggle = screen.getByTestId('home-filter-toggle-button');
    const desktopPanel = screen.getByTestId('home-filter-desktop-panel');
    expect(roots[0].contains(toggle)).toBe(true);
    expect(roots[0].contains(desktopPanel)).toBe(true);

    // The mobile tray is a deliberately separate, homepage-only presentation
    // (a modal), not routed through FilterShell - it must NOT carry the
    // canonical shell's root marker.
    const tray = screen.getByTestId('home-filter-mobile-tray');
    expect(tray.matches(SHELL_ROOT_SELECTOR)).toBe(false);
    expect(tray.querySelector(SHELL_ROOT_SELECTOR)).toBeNull();
  });

  it('Home and /recipes both go through the identical FilterShell markup: same root marker, same unified disclosure-button DOM shape (no icon, no page-specific extra structural wrapper)', () => {
    const { unmount } = render(createElement(RecipesFilterHarness));
    const recipesToggle = screen.getByRole('button', { name: /^篩選/ });
    const recipesShape = {
      hasSvgIcon: recipesToggle.querySelector('svg') !== null,
      childElementCount: recipesToggle.childElementCount,
      headerRowChildElementCount: recipesToggle.parentElement?.childElementCount,
    };
    unmount();

    render(createElement(HomeFilterHarness));
    const homeToggle = screen.getByTestId('home-filter-toggle-button');
    const homeShape = {
      hasSvgIcon: homeToggle.querySelector('svg') !== null,
      childElementCount: homeToggle.childElementCount,
      headerRowChildElementCount: homeToggle.parentElement?.childElementCount,
    };

    // The funnel icon stays removed in the hybrid correction too - neither
    // consumer should have one.
    expect(homeShape.hasSvgIcon).toBe(false);
    expect(recipesShape.hasSvgIcon).toBe(false);
    // Same element count inside the unified button (title + sr-only status
    // span + expand-label + direction indicator, no active count/pending
    // dot in this scenario) - proving both are built from the same
    // FilterShell disclosure button, not two independently maintained
    // implementations.
    expect(homeShape.childElementCount).toBe(recipesShape.childElementCount);
    // Same for the header row itself (button + headerContent - both here
    // render a sort control, so 2 children each).
    expect(homeShape.headerRowChildElementCount).toBe(recipesShape.headerRowChildElementCount);
  });
});

// Hybrid correction (manual QA reversal of the heading/disclosure split):
// splitting "篩選" from a near-plain-text disclosure action removed too much
// click affordance. "篩選"/count/pending-dot/disclosure-label/direction-
// indicator are back inside ONE compact, clearly interactive <button> - the
// outer FilterShell card remains borderless (Option A's other half is kept).
describe('FilterShell hybrid disclosure: one unified, clearly clickable Filter control', () => {
  it('is one real <button> that visibly contains "篩選" as part of the same control (not split out as a separate static heading)', () => {
    render(createElement(RecipesFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.tagName).toBe('BUTTON');
    // "篩選" is a descendant of the button itself now, not a sibling.
    expect(within(toggle).getByText('篩選')).toBeTruthy();
  });

  it('the disclosure button remains a real, keyboard-operable <button> with aria-expanded/aria-controls intact', () => {
    render(createElement(RecipesFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); // /recipes defaults to expanded
    expect(toggle.getAttribute('aria-controls')).toBeTruthy();
  });

  it('contains the disclosure state label, and its computed accessible name reflects both "篩選" and that state ("篩選 展開"/"篩選 收起")', () => {
    render(createElement(GenerateSettingsHarness));
    // Generate starts collapsed.
    const collapsed = screen.getByRole('button', { name: /^篩選/ });
    expect(collapsed.getAttribute('aria-expanded')).toBe('false');
    expect(within(collapsed).getByText('展開')).toBeTruthy();
    expect(screen.getByRole('button', { name: '篩選 展開' })).toBe(collapsed);

    fireEvent.click(collapsed);
    expect(within(collapsed).getByText('收起')).toBeTruthy();
    expect(screen.getByRole('button', { name: '篩選 收起' })).toBeTruthy();
  });

  it('contains the active-count badge inside the button when count > 0, contributing to its accessible name', () => {
    render(createElement(RecipesFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    // The badge is now a descendant of the unified control, per the
    // approved hybrid reversal - not excluded from it.
    expect(within(toggle).getByText('1')).toBeTruthy();
    expect(screen.getByRole('button', { name: '篩選 1 收起' })).toBe(toggle);
  });

  it('has compact interactive chrome (rounded-lg, not rounded-xl/2xl) on every consumer, including Home', () => {
    render(createElement(RecipesFilterHarness));
    const recipesToggle = screen.getByRole('button', { name: /^篩選/ });
    expect(recipesToggle.className).toMatch(/\brounded-lg\b/);
    expect(recipesToggle.className).not.toMatch(/\brounded-xl\b/);
    expect(recipesToggle.className).not.toMatch(/\brounded-2xl\b/);

    render(createElement(HomeFilterHarness));
    const homeToggle = screen.getByTestId('home-filter-toggle-button');
    expect(homeToggle.className).toMatch(/\brounded-lg\b/);
    expect(homeToggle.className).not.toMatch(/\brounded-xl\b/);
    expect(homeToggle.className).not.toMatch(/\brounded-2xl\b/);
  });

  it('does not restore the old funnel icon', () => {
    render(createElement(RecipesFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.querySelector('svg')).toBeNull();
  });
});
