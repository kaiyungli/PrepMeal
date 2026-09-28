import { FilterCardShell, FilterSectionConfig, RecipeSortSelect } from '@/components/filters';

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
  // Only /recipes-family pages that require an explicit confirm step (none
  // currently) need these - /recipes and /favorites filter live as you
  // type/toggle and correctly omit them, so FilterCardShell falls back to
  // its no-confirm-footer behavior.
  applyFilters?: () => void;
  hasPendingChanges?: boolean;
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
  applyFilters,
  hasPendingChanges,
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
        onApply={applyFilters}
        hasPendingChanges={hasPendingChanges}
        isExpanded={showFilters} onToggleExpand={() => setShowFilters(!showFilters)}
        headerContent={
          <RecipeSortSelect id="recipe-filters-sort" value={sortBy} onChange={setSortBy} />
        }
      />
    </div>
  );
}
