import { forwardRef } from 'react';

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
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B79B7A]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onApply();
              }
            }}
            placeholder="搜尋食譜... 例如：番茄、牛肉、咖哩"
            aria-label="搜尋食譜"
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#E9DFC9] bg-[#FFFDF8] text-[15px] text-[#5C4033] placeholder:text-[#B79B7A] focus:outline-none focus:ring-2 focus:ring-[#D9B98C]/30 focus:border-[#D9B98C]"
          />
        </div>

        <button
          type="button"
          onClick={onApply}
          disabled={!hasPendingChanges}
          className="h-11 shrink-0 rounded-xl bg-[#9B6035] px-3 sm:px-5 text-sm font-medium text-white transition-colors hover:bg-[#784A29] disabled:cursor-default disabled:bg-[#F3EBE2] disabled:text-[#876F5A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
          aria-label="顯示食譜"
        >
          <span className="sm:hidden">顯示</span>
          <span className="hidden sm:inline">顯示食譜</span>
        </button>
      </div>

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
