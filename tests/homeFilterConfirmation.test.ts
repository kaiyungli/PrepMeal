// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import HomeRecipeFilterControls from '@/features/home/components/HomeRecipeFilterControls';
import AppliedFiltersSummary from '@/features/home/components/AppliedFiltersSummary';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';
import { useHomePageViewState } from '@/features/home/hooks/useHomePageViewState';

afterEach(cleanup);

const catalog = [
  { id: '1', name: '中式魚飯', cuisine: 'chinese', created_at: '2026-01-02' },
  { id: '2', name: '意粉', cuisine: 'italian', created_at: '2026-01-01' },
];

// Mirrors src/pages/index.js's own gating: AppliedFiltersSummary only shows
// while the page has a definitive (non-loading, non-error) result state -
// covering BOTH showResults and showEmptyState, which is exactly what issue
// 4 requires and what a harness that always rendered the summary could not
// have caught.
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
  return createElement(
    'div',
    null,
    createElement(HomeRecipeFilterControls, {
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
    }),
    (showResults || showEmptyState) &&
      createElement(AppliedFiltersSummary, {
        chips: state.appliedFilterChips,
        appliedSearchQuery: state.appliedSearchQuery,
        resultCountText,
        onRemoveChip: state.removeDraftFilterValue,
        onRemoveSearch: state.removeDraftSearch,
        onResetAll: state.clearAppliedFilters,
      }),
    createElement(
      'output',
      { 'data-testid': 'result-names' },
      state.recipesList.map((recipe: { name: string }) => recipe.name).join(',')
    )
  );
}

function openPanel() {
  fireEvent.click(screen.getByTestId('home-filter-toggle-button'));
}

function desktopPanel() {
  return screen.getByTestId('home-filter-desktop-panel');
}

function isHidden(el: HTMLElement) {
  // aria-hidden may live on an ancestor wrapper rather than the element
  // itself (e.g. the mobile tray's outer backdrop container) - a descendant
  // of an aria-hidden ancestor is equally excluded from the a11y tree.
  return el.closest('[aria-hidden="true"]') !== null;
}

/** A matchMedia stub whose `matches` can change and fire `change` listeners,
 * so tests can simulate the viewport crossing the mobile/desktop breakpoint
 * while a component is already open. */
function installMatchMediaMock(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners: Array<(e: { matches: boolean }) => void> = [];
  const mql = {
    get matches() {
      return matches;
    },
    media: '(max-width: 767px)',
    addEventListener: (event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') listeners.push(cb);
    },
    removeEventListener: (event: string, cb: (e: { matches: boolean }) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = vi.fn().mockReturnValue(mql);
  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.slice().forEach(cb => cb({ matches: next }));
    },
    uninstall() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).matchMedia;
    },
  };
}

describe('homepage filter redesign: select-then-confirm is preserved', () => {
  it('keeps results unchanged while selecting options, then applies on confirmation', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(within(desktopPanel()).getByText('有未套用的選項')).toBeTruthy();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
  });

  it('submits the search when Enter is pressed', () => {
    render(createElement(HomeFilterHarness));
    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    fireEvent.change(input, { target: { value: '魚飯' } });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
  });

  it('keeps a visible apply button beside search for search, sort and collapsed filter edits', () => {
    render(createElement(HomeFilterHarness));
    const apply = screen.getByRole('button', { name: '顯示食譜' });
    expect(apply.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getByRole('combobox', { name: '排序方式' }), { target: { value: 'oldest' } });
    expect(apply.hasAttribute('disabled')).toBe(false);
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    fireEvent.click(apply);
    expect(screen.getByTestId('result-names').textContent).toBe('意粉,中式魚飯');
    expect(apply.hasAttribute('disabled')).toBe(true);

    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    openPanel();
    expect(apply.hasAttribute('disabled')).toBe(false);
    fireEvent.click(apply);
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
    expect(apply.hasAttribute('disabled')).toBe(true);
  });

  it('waits for confirmation before changing the sort order', () => {
    render(createElement(HomeFilterHarness));
    fireEvent.change(screen.getByRole('combobox', { name: '排序方式' }), { target: { value: 'oldest' } });
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('意粉,中式魚飯');
  });
});

describe('homepage filter redesign: applied count vs pending indicator', () => {
  it('the filter button badge counts only applied filters, never the unconfirmed draft', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    expect(within(screen.getByTestId('home-filter-toggle-button')).queryByText('1')).toBeNull();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(within(screen.getByTestId('home-filter-toggle-button')).getByText('1')).toBeTruthy();
  });

  it('announces pending changes while the panel is closed with unconfirmed edits', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    openPanel(); // close the panel again without confirming
    expect(screen.getByText('有未確認的更改，尚未影響下方結果')).toBeTruthy();
    openPanel();
    expect(within(desktopPanel()).getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('homepage filter redesign: issue 1 - applied-summary removal must not re-select', () => {
  it('removing a chip from the applied summary only edits the draft; results need reconfirmation', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    const summary = screen.getByTestId('home-filter-applied-summary');
    fireEvent.click(within(summary).getByRole('button', { name: /中式/ }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });

  it('does not re-select a value the user already unchecked in the panel, even if clicked again from the summary', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    // User reopens the panel and unchecks it in the draft, WITHOUT confirming.
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    expect(within(desktopPanel()).getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('false');

    // The summary still shows "中式" (it reflects the still-applied state).
    // Clicking its remove button again must be a no-op on the draft, not a
    // re-add - repeating the click must not toggle it back on.
    const summary = screen.getByTestId('home-filter-applied-summary');
    const summaryChip = within(summary).getByRole('button', { name: /中式/ });
    fireEvent.click(summaryChip);
    expect(within(desktopPanel()).getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(summaryChip);
    expect(within(desktopPanel()).getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });

  it('清空選擇 only clears the draft (applied results stay); 重設篩選 clears both immediately', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '清空選擇' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    fireEvent.click(screen.getByRole('button', { name: '重設篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });
});

describe('homepage filter redesign: issue 2 - mobile tray focus management', () => {
  it('moves focus into the tray on open, and back to the toggle button on Escape', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    expect(document.activeElement).toBe(within(tray).getByRole('button', { name: /關閉篩選/ }));

    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(isHidden(screen.getByTestId('home-filter-mobile-tray'))).toBe(true);
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(document.activeElement).toBe(screen.getByTestId('home-filter-toggle-button'));
  });

  it('the tray close (✕) button also discards without applying, and restores focus', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    fireEvent.click(within(tray).getByRole('button', { name: /關閉篩選/ }));
    expect(isHidden(screen.getByTestId('home-filter-mobile-tray'))).toBe(true);
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(document.activeElement).toBe(screen.getByTestId('home-filter-toggle-button'));
  });

  it('confirming inside the mobile tray applies, closes the tray, and restores focus', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    fireEvent.click(within(tray).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
    expect(isHidden(screen.getByTestId('home-filter-mobile-tray'))).toBe(true);
    expect(document.activeElement).toBe(screen.getByTestId('home-filter-toggle-button'));
  });

  it('traps Tab within the tray: Tab on the last focusable element wraps to the first, Shift+Tab wraps back', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    // Create a pending change so both 清空選擇 and 確認篩選 are present/enabled.
    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    const closeBtn = within(tray).getByRole('button', { name: /關閉篩選/ });
    const confirmBtn = within(tray).getByRole('button', { name: '確認篩選' });

    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(closeBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirmBtn);
  });
});

describe('homepage filter redesign: issue 3 - breakpoint changes while the tray is open', () => {
  it('unlocks background scroll when the viewport crosses from mobile to desktop while the tray stays open', () => {
    const mock = installMatchMediaMock(true);
    render(createElement(HomeFilterHarness));
    openPanel();
    expect(document.body.style.overflow).toBe('hidden');

    mock.setMatches(false); // simulate resizing past 768px without closing the tray
    expect(document.body.style.overflow).toBe('');

    mock.setMatches(true); // and back to mobile - lock re-engages
    expect(document.body.style.overflow).toBe('hidden');

    mock.uninstall();
  });

  it('releases the hidden mobile focus trap on desktop and restores it on mobile', () => {
    const mock = installMatchMediaMock(true);
    render(createElement(HomeFilterHarness));
    openPanel();
    const toggle = screen.getByTestId('home-filter-toggle-button');
    const tray = screen.getByTestId('home-filter-mobile-tray');
    const close = within(tray).getByRole('button', { name: /關閉篩選/ });
    expect(document.activeElement).toBe(close);

    mock.setMatches(false);
    expect(document.activeElement).toBe(toggle);
    const desktopTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(desktopTab);
    expect(desktopTab.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    mock.setMatches(true);
    expect(document.activeElement).toBe(close);
    close.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).not.toBe(toggle);
    mock.uninstall();
  });

  it('leaves body scroll untouched when the tray never became the mobile presentation', () => {
    const mock = installMatchMediaMock(false); // desktop from the start
    render(createElement(HomeFilterHarness));
    openPanel();
    expect(document.body.style.overflow).toBe('');
    mock.uninstall();
  });
});

describe('homepage filter redesign: issue 4 - zero-result states keep the applied summary visible', () => {
  it('shows applied filter chips and a working reset when a filter yields zero results', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '日式' })); // matches neither catalog item
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('');

    const summary = screen.getByTestId('home-filter-applied-summary');
    expect(within(summary).getByText('日式')).toBeTruthy();
    fireEvent.click(within(summary).getByRole('button', { name: '重設篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });

  it('shows a working reset (draft + applied) when a pure search yields zero results', () => {
    render(createElement(HomeFilterHarness));
    const input = screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩');
    fireEvent.change(input, { target: { value: 'xyz-not-found' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('result-names').textContent).toBe('');

    const summary = screen.getByTestId('home-filter-applied-summary');
    expect(within(summary).getByText(/xyz-not-found/)).toBeTruthy();
    fireEvent.click(within(summary).getByRole('button', { name: '重設篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(screen.getByPlaceholderText('搜尋食譜... 例如：番茄、牛肉、咖哩')).toHaveProperty('value', '');
  });
});

describe('homepage filter redesign: accessibility structure', () => {
  it('chip buttons expose aria-pressed reflecting selection state', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const chip = within(desktopPanel()).getByRole('button', { name: '中式' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });

  it('the toggle button exposes aria-expanded/aria-controls pointing at elements that actually exist in the DOM, collapsed or expanded', () => {
    render(createElement(HomeFilterHarness));
    const toggle = screen.getByTestId('home-filter-toggle-button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const controlsIds = (toggle.getAttribute('aria-controls') || '').split(' ').filter(Boolean);
    expect(controlsIds.length).toBeGreaterThan(0);
    // Collapsed: every referenced id must resolve to a real element (not
    // conditionally unmounted), and it must be marked aria-hidden.
    for (const id of controlsIds) {
      const el = document.getElementById(id);
      expect(el, `expected #${id} to exist while collapsed`).not.toBeNull();
      expect(el && isHidden(el)).toBe(true);
    }
    expect(toggle.querySelector('select')).toBeNull();

    openPanel();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    for (const id of controlsIds) {
      expect(document.getElementById(id), `expected #${id} to exist while expanded`).not.toBeNull();
    }
  });
});
