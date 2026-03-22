import Link from 'next/link'

interface RecipeFiltersProps {
  // State
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  // Filter sections (from useRecipeFilters)
  recipeFilterSections: any[];
  // Helpers
  hasFilters: boolean;
  activeFilterCount: number;
  clearFilters: () => void;
}

export default function RecipeFilters({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showAdvanced,
  setShowAdvanced,
  recipeFilterSections,
  hasFilters,
  activeFilterCount,
  clearFilters,
}: RecipeFiltersProps) {
  // Filter groups to display (all from recipeFilterSections)
  const filterGroups = recipeFilterSections;

  return (
    <div className="mb-6">
      {/* 1. Search Bar - Same as homepage */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#AA7A50]">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="尋食譜... 例如：番茄、牛肉、咖哩"
          className="w-full py-3.5 pl-11 pr-11 rounded-xl border-2 border-[#DDD0B0] bg-white text-[#3A2010] placeholder:text-[#C0A080] focus:outline-none focus:border-[#9B6035] transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AA7A50] hover:text-[#9B6035]"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Filter Card - Single collapsible card, same as homepage */}
      <div className="bg-white rounded-xl border border-[#E5DCC8] shadow-sm mb-8 overflow-hidden">
        {/* Header with expand/collapse */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <span className="text-sm font-semibold text-[#7A5A38]">篩選</span>
          <span className="text-[#9B6035]">{showAdvanced ? '▲ 收起' : '▼ 展開'}</span>
        </div>
        
        {/* Filter groups - shown when expanded */}
        {showAdvanced && (
          <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {filterGroups.map((group) => (
              <div key={group.id} className="min-w-0 space-y-1">
                <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase">{group.title}</div>
                <div className="flex flex-nowrap overflow-x-auto gap-1.5 pb-2 pr-2">
                  {group.options.map((option: any) => {
                    const isSelected = group.selected?.includes(option.value);
                    const isDanger = group.variant === 'danger';
                    return (
                      <button
                        key={option.value}
                        onClick={() => group.onToggle(option.value)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? isDanger
                              ? 'bg-red-500 text-white'
                              : 'bg-[#9B6035] text-white'
                            : 'bg-white text-[#3A2010] border border-[#E7E0D4] hover:bg-gray-100'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Clear All at bottom */}
            <div className="mt-3 w-full border-t border-[#EEE5D6] pt-3 col-span-full">
              <button
                onClick={clearFilters}
                className="block text-left text-xs font-semibold text-[#9B6035] hover:underline"
              >
                清除全部
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Count + Sort Row - Same as homepage */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-semibold text-[#C0A080]">
          {activeFilterCount > 0 ? `已選 ${activeFilterCount} 項` : '所有食譜'}
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-full border border-[#DDD0B0] bg-white text-sm font-medium text-[#3A2010] focus:outline-none"
        >
          <option value="newest">最新</option>
          <option value="popular">最受歡迎</option>
          <option value="time_short">最快</option>
          <option value="calories_low">卡路里低到高</option>
          <option value="protein_high">蛋白質高到低</option>
        </select>
      </div>
    </div>
  );
}
