import { SharedFilterPanel } from '@/components/filters';

interface RecipeFiltersProps {
  // State
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  // Filter sections
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
  return (
    <div className="mb-6">
      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="搜尋食譜..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pl-12 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-[#9B6035]/30"
          style={{ borderColor: '#E5DCC8' }}
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">🔍</span>
      </div>

      {/* Filter Panel */}
      <SharedFilterPanel
        sections={recipeFilterSections}
        onClear={hasFilters ? clearFilters : undefined}
        showAdvanced={showAdvanced}
        setShowAdvanced={setShowAdvanced}
        hasAdvanced={true}
        advancedLabel="更多篩選"
      />

      {/* Sort Row */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-[#7A746B]">
          {activeFilterCount > 0 && (
            <span className="mr-2">已選 {activeFilterCount} 項</span>
          )}
        </span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#9B6035]/30"
          style={{ borderColor: '#E5DCC8', color: '#3D3D3D' }}
        >
          <option value="newest">最新</option>
          <option value="popular">最受歡迎</option>
          <option value="calories_low">卡路里低到高</option>
          <option value="calories_high">卡路里高到低</option>
          <option value="protein_high">蛋白質高到低</option>
          <option value="time_short">時間短到長</option>
        </select>
      </div>
    </div>
  );
}
