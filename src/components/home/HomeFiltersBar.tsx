import React from 'react';

interface HomeFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeFilterCount: number;
  clearFilters: () => void;
}

function HomeFiltersBar({ searchQuery, setSearchQuery, showFilters, setShowFilters, activeFilterCount, clearFilters }: HomeFiltersBarProps) {
  return (
    <>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜尋食譜..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-[#E8DCC8] bg-[#FFFDF8] text-[#3A2010] placeholder-[#C0A080] focus:outline-none focus:border-[#9B6035]"
          />
        </div>
      </div>

      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#E8DCC8] bg-white text-[#3A2010] hover:border-[#9B6035]">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          篩選 {activeFilterCount > 0 && <span className="bg-[#9B6035] text-white px-2 py-0.5 rounded-full text-xs">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && <button onClick={clearFilters} className="text-[#9B6035] text-sm">清除全部</button>}
      </div>
    </>
  );
}

export default React.memo(HomeFiltersBar);