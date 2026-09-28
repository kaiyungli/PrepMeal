import { forwardRef } from 'react';
import RecipeSearchBar from '@/components/filters/RecipeSearchBar';

interface HomeFilterBarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onApply: () => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  appliedFilterCount: number;
  hasPendingChanges: boolean;
  panelId: string;
}

/**
 * Search and confirmation stay together; filter and sort sit below them.
 * The sort <select> is a sibling of the toggle button, never nested inside
 * it (a <button> must not contain interactive descendants - see
 * https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element).
 */
const HomeFilterBar = forwardRef<HTMLButtonElement, HomeFilterBarProps>(function HomeFilterBar({
  searchQuery,
  setSearchQuery,
  onApply,
  sortBy,
  setSortBy,
  showFilters,
  onToggleFilters,
  appliedFilterCount,
  hasPendingChanges,
  panelId,
}, ref) {
  return (
    <div className="rounded-2xl border border-[#E8D9C9] bg-white shadow-sm px-4 py-3 space-y-2.5">
      <RecipeSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={onApply}
        placeholder="搜尋食譜... 例如：番茄、牛肉、咖哩"
        applyButton={{ label: '顯示食譜', shortLabel: '顯示', pending: hasPendingChanges }}
      />

      <div className="flex items-center justify-between gap-3">
        <button
          ref={ref}
          type="button"
          data-testid="home-filter-toggle-button"
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-controls={`${panelId}-desktop ${panelId}-mobile`}
          className="relative h-10 px-3 rounded-xl border border-[#DDD0B0] bg-white hover:bg-[#FAF7F2] transition-colors text-sm font-medium text-[#7A5A38] flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
        >
          <svg className="w-4 h-4 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          篩選
          {appliedFilterCount > 0 && (
            <span className="text-xs bg-[#9B6035] text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {appliedFilterCount}
            </span>
          )}
          {hasPendingChanges && <span className="w-2 h-2 rounded-full bg-[#F0A060]" aria-hidden="true" />}
          <span className="sr-only">{hasPendingChanges ? '，有未確認的更改' : ''}</span>
          <span className="text-[#9B6035]">{showFilters ? '▲' : '▼'}</span>
        </button>

      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="home-recipe-sort" className="shrink-0 text-sm text-[#7A5A38]">排序</label>
        <select
          id="home-recipe-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          aria-label="排序方式"
          className="h-10 max-w-[155px] min-w-0 px-2 rounded-xl border border-[#DDD0B0] text-sm bg-white text-[#5C4033]"
        >
          <option value="newest">最新</option>
          <option value="oldest">最舊</option>
          <option value="popular">最受歡迎</option>
          <option value="time_short">最快</option>
          <option value="calories_low">卡路里低到高</option>
          <option value="protein_high">蛋白質高到低</option>
        </select>
      </div>
      </div>
      <span className="sr-only" role="status">{hasPendingChanges ? '有未確認的更改，尚未影響下方結果' : ''}</span>
    </div>
  );
});

export default HomeFilterBar;
