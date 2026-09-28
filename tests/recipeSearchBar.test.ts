// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useState, type ChangeEvent } from 'react';
import RecipeSearchBar from '@/components/filters/RecipeSearchBar';
import FilterShell from '@/components/filters/FilterShell';
import RecipeFilters from '@/components/recipes/RecipeFilters';
import { useRecipeFilters } from '@/hooks/useRecipeFilters';

afterEach(cleanup);

describe('RecipeSearchBar: the single shared search input implementation', () => {
  it('renders the icon + input, calls onChange while typing, and has an accessible label from the placeholder', () => {
    const onChange = vi.fn();
    render(
      createElement(RecipeSearchBar, {
        value: '',
        onChange,
        placeholder: '搜尋食譜...',
      })
    );
    const input = screen.getByRole('textbox', { name: '搜尋食譜...' });
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '牛肉' } });
    expect(onChange).toHaveBeenCalledWith('牛肉');
  });

  it('Enter calls onSubmit when provided, and is a no-op (no throw) when onSubmit is not provided', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      createElement(RecipeSearchBar, { value: '牛肉', onChange: vi.fn(), onSubmit, placeholder: '搜尋' })
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: '搜尋' }), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(createElement(RecipeSearchBar, { value: '牛肉', onChange: vi.fn(), placeholder: '搜尋' }));
    expect(() =>
      fireEvent.keyDown(screen.getByRole('textbox', { name: '搜尋' }), { key: 'Enter' })
    ).not.toThrow();
  });

  it('renders no trailing button when applyButton is omitted (the /recipes and /favorites case)', () => {
    render(createElement(RecipeSearchBar, { value: '', onChange: vi.fn(), placeholder: '搜尋' }));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders and wires an apply button when applyButton is provided, respecting the pending/disabled state', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      createElement(RecipeSearchBar, {
        value: '',
        onChange: vi.fn(),
        onSubmit,
        placeholder: '搜尋',
        applyButton: { label: '顯示食譜', pending: false },
      })
    );
    const button = screen.getByRole('button', { name: '顯示食譜' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      createElement(RecipeSearchBar, {
        value: '',
        onChange: vi.fn(),
        onSubmit,
        placeholder: '搜尋',
        applyButton: { label: '顯示食譜', pending: true },
      })
    );
    expect(screen.getByRole('button', { name: '顯示食譜' }).hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '顯示食譜' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('FilterShell: sort control is a sibling of the toggle button, not nested inside it', () => {
  function ShellHarness() {
    const [expanded, setExpanded] = useState(false);
    const [sort, setSort] = useState('newest');
    return createElement(FilterShell, {
      searchQuery: '',
      onSearchChange: () => {},
      isExpanded: expanded,
      onToggleExpand: () => setExpanded(v => !v),
      headerContent: createElement(
        'select',
        {
          'aria-label': '排序方式',
          value: sort,
          onChange: (e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value),
        },
        createElement('option', { value: 'newest' }, '最新'),
        createElement('option', { value: 'oldest' }, '最舊')
      ),
    });
  }

  it('the toggle button does not contain the sort <select> as a DOM descendant', () => {
    render(createElement(ShellHarness));
    const toggle = screen.getByRole('button', { name: /篩選/ });
    expect(toggle.querySelector('select')).toBeNull();
  });

  it('the sort <select> can be changed independently without toggling expand/collapse', () => {
    render(createElement(ShellHarness));
    const toggle = screen.getByRole('button', { name: /篩選/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.change(screen.getByRole('combobox', { name: '排序方式' }), { target: { value: 'oldest' } });
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); // unaffected by the sort change
  });

  it('aria-controls references an element that exists in the DOM in both the collapsed and expanded state', () => {
    render(createElement(ShellHarness));
    const toggle = screen.getByRole('button', { name: /篩選/ });
    const id = toggle.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).not.toBeNull();
    fireEvent.click(toggle);
    expect(document.getElementById(id as string)).not.toBeNull();
  });

  it('the search bar stays visible and usable while the panel is collapsed', () => {
    const onSearchChange = vi.fn();
    render(
      createElement(FilterShell, {
        searchQuery: '',
        onSearchChange,
        searchPlaceholder: '搜尋食譜...',
        isExpanded: false,
        onToggleExpand: () => {},
      })
    );
    const input = screen.getByPlaceholderText('搜尋食譜...');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '牛肉' } });
    expect(onSearchChange).toHaveBeenCalledWith('牛肉');
    // The collapsed detail panel must not claim the search input - it lives
    // outside the aria-hidden content region.
    const toggle = screen.getByRole('button', { name: /篩選/ });
    const contentId = toggle.getAttribute('aria-controls') as string;
    const content = document.getElementById(contentId);
    expect(content?.contains(input)).toBe(false);
  });
});

describe('FilterShell: each instance gets its own stable content id', () => {
  function TwoShellsHarness() {
    return createElement(
      'div',
      null,
      createElement(FilterShell, {
        title: '篩選 A',
        searchQuery: '',
        onSearchChange: () => {},
        isExpanded: false,
        onToggleExpand: () => {},
      }),
      createElement(FilterShell, {
        title: '篩選 B',
        searchQuery: '',
        onSearchChange: () => {},
        isExpanded: false,
        onToggleExpand: () => {},
      })
    );
  }

  it('two simultaneously mounted instances get distinct, non-colliding content ids, each valid for its own toggle button', () => {
    render(createElement(TwoShellsHarness));
    const [toggleA, toggleB] = screen.getAllByRole('button', { name: /篩選/ });
    const idA = toggleA.getAttribute('aria-controls');
    const idB = toggleB.getAttribute('aria-controls');
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);

    // No duplicate ids anywhere in the document (invalid HTML if there were).
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    expect(new Set(allIds).size).toBe(allIds.length);

    // Each id resolves, and resolves to the panel that instance actually owns.
    const contentA = document.getElementById(idA as string);
    const contentB = document.getElementById(idB as string);
    expect(contentA).not.toBeNull();
    expect(contentB).not.toBeNull();
    expect(contentA).not.toBe(contentB);
  });
});

// Reproduces /recipes' actual wiring: useRecipeFilters() with no options
// (panel expanded by default, matching recipes.js), and RecipeFilters
// called WITHOUT applyFilters/hasPendingChanges - search and filters must
// apply live, with no confirm step and no apply button.
function RecipesPageFilterHarness() {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    activeFilterCount,
    clearFilters,
  } = useRecipeFilters();
  return createElement(
    'div',
    null,
    createElement(RecipeFilters, {
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      showFilters,
      setShowFilters,
      recipeFilterSections,
      activeFilterCount,
      clearFilters,
    }),
    createElement('output', { 'data-testid': 'live-search-query' }, searchQuery)
  );
}

// Reproduces /favorites' actual wiring: useRecipeFilters({ initialShowFilters: false })
// and RecipeFilters called WITHOUT applyFilters/hasPendingChanges, with
// filterRecipes() driving a purely local, synchronous filter of an
// in-memory list (no network involved at all on that page).
function FavoritesPageFilterHarness({ recipes }: { recipes: { id: string; name: string; cuisine: string }[] }) {
  const {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    showFilters,
    setShowFilters,
    recipeFilterSections,
    activeFilterCount,
    clearFilters,
    filterRecipes,
  } = useRecipeFilters({ initialShowFilters: false });
  const filtered = filterRecipes(recipes);
  return createElement(
    'div',
    null,
    createElement(RecipeFilters, {
      searchQuery,
      setSearchQuery,
      sortBy,
      setSortBy,
      showFilters,
      setShowFilters,
      recipeFilterSections,
      activeFilterCount,
      clearFilters,
    }),
    createElement(
      'output',
      { 'data-testid': 'filtered-names' },
      filtered.map((r: { name: string }) => r.name).join(',')
    )
  );
}

describe('the shared search bar on /recipes: search applies live, no confirm step', () => {
  it('typing updates the search state immediately, with no apply button rendered', () => {
    render(createElement(RecipesPageFilterHarness));
    fireEvent.click(screen.getByRole('button', { name: /篩選/ }));
    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    expect(screen.queryByRole('button', { name: /確認|顯示食譜/ })).toBeNull();
    fireEvent.change(input, { target: { value: '番茄' } });
    expect(screen.getByTestId('live-search-query').textContent).toBe('番茄');
  });

  it('panel is expanded by default on /recipes (useRecipeFilters with no override)', () => {
    render(createElement(RecipesPageFilterHarness));
    expect(screen.getByRole('button', { name: /篩選/ }).getAttribute('aria-expanded')).toBe('true');
  });

  it('search stays visible and live-updating even after the user manually collapses the detail panel', () => {
    render(createElement(RecipesPageFilterHarness));
    const toggle = screen.getByRole('button', { name: /篩選/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); // /recipes defaults expanded
    fireEvent.click(toggle); // user collapses it
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    expect(input).toBeTruthy(); // still there, still findable, not hidden with the chips
    fireEvent.change(input, { target: { value: '意粉' } });
    expect(screen.getByTestId('live-search-query').textContent).toBe('意粉');
  });
});

describe('the shared search bar on /favorites: search filters an in-memory list live, no confirm step', () => {
  const recipes = [
    { id: '1', name: '番茄牛肉', cuisine: 'chinese' },
    { id: '2', name: '意粉', cuisine: 'italian' },
  ];

  it('typing immediately filters the local list, with no apply button rendered', () => {
    render(createElement(FavoritesPageFilterHarness, { recipes }));
    fireEvent.click(screen.getByRole('button', { name: /篩選/ }));
    expect(screen.getByTestId('filtered-names').textContent).toBe('番茄牛肉,意粉');
    expect(screen.queryByRole('button', { name: /確認|顯示食譜/ })).toBeNull();

    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    fireEvent.change(input, { target: { value: '意粉' } });
    expect(screen.getByTestId('filtered-names').textContent).toBe('意粉');
  });

  it('panel is collapsed by default on /favorites (matches its initialShowFilters: false)', () => {
    render(createElement(FavoritesPageFilterHarness, { recipes }));
    expect(screen.getByRole('button', { name: /篩選/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('the search bar is visible and functional on first render, without opening the panel (the reported bug: /favorites defaults collapsed, search used to be hidden with it)', () => {
    render(createElement(FavoritesPageFilterHarness, { recipes }));
    const toggle = screen.getByRole('button', { name: /篩選/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); // never opened

    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: '番茄' } });
    expect(screen.getByTestId('filtered-names').textContent).toBe('番茄牛肉');
  });
});
