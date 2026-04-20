import { FilterCardShell, FilterSectionConfig } from '@/components/filters';

interface RecipeFiltersProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  recipeFilterSections: FilterSectionConfig[];
  activeFilterCount: number;
  clearFilters: () => void;
}

export default function RecipeFilters({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  recipeFilterSections,

  activeFilterCount,
  clearFilters,
}: RecipeFiltersProps) {
  return (
    <div className="mb-6">
      {/* Use shared FilterCardShell */}
      <FilterCardShell
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜尋食譜... 例如：番茄、牛肉、咖哩"
        filterSections={recipeFilterSections}
        activeFilterCount={activeFilterCount}
        onClear={clearFilters}
        isExpanded={showFilters} onToggleExpand={() => setShowFilters(!showFilters)}
        headerContent={
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="ml-4 px-2 py-1 rounded border border-[#DDD0B0] text-xs bg-white"
          >
            <option value="newest">最新</option>
            <option value="oldest">最舊</option>
            <option value="popular">最受歡迎</option>
            <option value="time_short">最快</option>
            <option value="calories_low">卡路里低到高</option>
            <option value="protein_high">蛋白質高到低</option>
          </select>
        }
      />
    </div>
  );
}
