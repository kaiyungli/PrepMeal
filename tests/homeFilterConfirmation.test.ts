// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import HomeRecipeFilterControls from '@/features/home/components/HomeRecipeFilterControls';
import AppliedFiltersSummary from '@/features/home/components/AppliedFiltersSummary';
import { useHomeRecipeFilters } from '@/features/home/hooks/useHomeRecipeFilters';

afterEach(cleanup);

const catalog = [
  { id: '1', name: '中式魚飯', cuisine: 'chinese', created_at: '2026-01-02' },
  { id: '2', name: '意粉', cuisine: 'italian', created_at: '2026-01-01' },
];

function HomeFilterHarness() {
  const state = useHomeRecipeFilters({ catalog, initialRecipes: catalog, initialTotalCount: 2 });
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
    createElement(AppliedFiltersSummary, {
      chips: state.appliedFilterChips,
      appliedSearchQuery: state.appliedSearchQuery,
      resultCountText: state.totalCount > 0 ? `共 ${state.totalCount} 個食譜` : '',
      onRemoveChip: state.toggleDraftFilter,
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
    // Draft has 1 selection, but nothing is applied yet - no numeric badge.
    expect(within(screen.getByTestId('home-filter-toggle-button')).queryByText('1')).toBeNull();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(within(screen.getByTestId('home-filter-toggle-button')).getByText('1')).toBeTruthy();
  });

  it('shows a distinct pending-changes notice while the panel is closed with unconfirmed edits', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    openPanel(); // close the panel again without confirming
    expect(screen.getByText('有未確認的更改，尚未影響下方結果')).toBeTruthy();
    // Closing then reopening must keep the draft selection intact.
    openPanel();
    expect(within(desktopPanel()).getByRole('button', { name: '中式' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('homepage filter redesign: applied summary + clear vs reset', () => {
  it('removing a chip from the applied summary only edits the draft; results need reconfirmation', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    const summary = screen.getByTestId('home-filter-applied-summary');
    fireEvent.click(within(summary).getByRole('button', { name: /中式/ }));
    // Still showing the confirmed result - removal from the summary is a draft edit only.
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');
    // Panel is still open from the earlier openPanel() call (never toggled closed).
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });

  it('清空選擇 only clears the draft (applied results stay); 重設篩選 clears both immediately', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '中式' }));
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '確認篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    // Draft mirrors applied right after confirming; clearing the draft alone
    // must not change the still-applied result.
    fireEvent.click(within(desktopPanel()).getByRole('button', { name: '清空選擇' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯');

    fireEvent.click(screen.getByRole('button', { name: '重設篩選' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
  });
});

describe('homepage filter redesign: mobile tray close/Escape behavior', () => {
  it('Escape closes the mobile tray without applying, and focus returns to the toggle button', () => {
    const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = matchMediaMock;

    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('home-filter-mobile-tray')).toBeNull();
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
    expect(document.activeElement).toBe(screen.getByTestId('home-filter-toggle-button'));
    expect(document.body.style.overflow).toBe('');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).matchMedia;
  });

  it('the tray close (✕) button also discards without applying', () => {
    render(createElement(HomeFilterHarness));
    openPanel();
    const tray = screen.getByTestId('home-filter-mobile-tray');
    fireEvent.click(within(tray).getByRole('button', { name: '中式' }));
    fireEvent.click(within(tray).getByRole('button', { name: /關閉篩選/ }));
    expect(screen.queryByTestId('home-filter-mobile-tray')).toBeNull();
    expect(screen.getByTestId('result-names').textContent).toBe('中式魚飯,意粉');
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

  it('the toggle button exposes aria-expanded/aria-controls, and does not contain the sort <select>', () => {
    render(createElement(HomeFilterHarness));
    const toggle = screen.getByTestId('home-filter-toggle-button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toMatch(/home-recipe-filter-panel-desktop/);
    expect(toggle.getAttribute('aria-controls')).toMatch(/home-recipe-filter-panel-mobile/);
    expect(toggle.querySelector('select')).toBeNull();
    openPanel();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });
});
