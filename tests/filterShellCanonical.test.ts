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

  it('Home and /recipes both go through the identical FilterShell markup: same root marker, same disclosure-button DOM shape (label + directional indicator, no icon, no page-specific extra structural wrapper)', () => {
    const { unmount } = render(createElement(RecipesFilterHarness));
    const recipesToggle = screen.getByRole('button', { name: /^篩選/ });
    const recipesShape = {
      hasSvgIcon: recipesToggle.querySelector('svg') !== null,
      childElementCount: recipesToggle.childElementCount,
      clusterChildElementCount: recipesToggle.parentElement?.childElementCount,
    };
    unmount();

    render(createElement(HomeFilterHarness));
    const homeToggle = screen.getByTestId('home-filter-toggle-button');
    const homeShape = {
      hasSvgIcon: homeToggle.querySelector('svg') !== null,
      childElementCount: homeToggle.childElementCount,
      clusterChildElementCount: homeToggle.parentElement?.childElementCount,
    };

    // Option A (borderless tool section) intentionally removes the funnel
    // icon from the disclosure button - neither consumer should have one.
    expect(homeShape.hasSvgIcon).toBe(false);
    expect(recipesShape.hasSvgIcon).toBe(false);
    // Same element count: label span + directional-indicator span - proving
    // both are built from the same FilterShell disclosure button, not two
    // independently maintained implementations.
    expect(homeShape.childElementCount).toBe(recipesShape.childElementCount);
    // Same for the surrounding heading/badge/disclosure cluster (both here
    // have zero active filters, so heading span + disclosure button = 2
    // children each).
    expect(homeShape.clusterChildElementCount).toBe(recipesShape.clusterChildElementCount);
  });
});

describe('FilterShell borderless header: static heading vs. disclosure button are genuinely separate', () => {
  it('the "篩選" heading text is not itself the disclosure button, and only the disclosure button is a <button>', () => {
    render(createElement(RecipesFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.tagName).toBe('BUTTON');

    const cluster = toggle.parentElement as HTMLElement;
    const heading = within(cluster).getByText('篩選');
    // The heading is its own element, a sibling of (not the same node as,
    // and not itself) the disclosure button.
    expect(heading).not.toBe(toggle);
    expect(heading.tagName).not.toBe('BUTTON');
    expect(cluster.contains(heading)).toBe(true);
    expect(cluster.contains(toggle)).toBe(true);
  });

  it('the disclosure button remains a real, keyboard-operable <button> with aria-expanded/aria-controls intact', () => {
    render(createElement(RecipesFilterHarness));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('type')).toBe('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); // /recipes defaults to expanded
    expect(toggle.getAttribute('aria-controls')).toBeTruthy();
  });

  it('the disclosure\'s computed accessible name includes the heading context ("篩選 ... 展開/收起"), not just the disclosure word alone', () => {
    render(createElement(GenerateSettingsHarness));
    // Generate starts collapsed.
    const collapsed = screen.getByRole('button', { name: /^篩選/ });
    expect(collapsed.getAttribute('aria-expanded')).toBe('false');
    // testing-library's accessible-name computation already found this by
    // matching /^篩選/ above; assert the full expected name explicitly too.
    expect(screen.getByRole('button', { name: '篩選 展開' })).toBe(collapsed);

    fireEvent.click(collapsed);
    expect(screen.getByRole('button', { name: '篩選 收起' })).toBeTruthy();
  });

  it('the active-count badge is excluded from the disclosure button itself, not just "findable nearby"', () => {
    render(createElement(RecipesFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: '中式' }));
    const toggle = screen.getByRole('button', { name: /^篩選/ });
    // The badge must not be a descendant of the button - it lives beside
    // the heading in the same cluster instead (Option A's borderless
    // header split intentionally keeps it out of the disclosure control).
    expect(within(toggle).queryByText('1')).toBeNull();
    expect(within(toggle.parentElement as HTMLElement).getByText('1')).toBeTruthy();
    // ...and per the previous test, it therefore doesn't appear in the
    // disclosure's accessible name either.
    expect(toggle.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByRole('button', { name: '篩選 收起' })).toBe(toggle);
  });

  it('Home\'s disclosure button does not recreate the old bordered/rounded pill chrome', () => {
    render(createElement(HomeFilterHarness));
    const toggle = screen.getByTestId('home-filter-toggle-button');
    expect(toggle.className).not.toMatch(/\brounded-xl\b/);
    expect(toggle.className).not.toMatch(/\bborder\b/);
    expect(toggle.className).not.toMatch(/\bbg-white\b/);
  });
});
