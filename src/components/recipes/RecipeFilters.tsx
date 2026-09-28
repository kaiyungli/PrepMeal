import { FilterShell, FilterGroupList, FilterFooter, FilterSectionConfig, RecipeSortSelect } from '@/components/filters';

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
  // type/toggle and correctly omit them, so the footer falls back to its
  // no-confirm-row behavior.
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
  const showClear = activeFilterCount > 0 || Boolean(searchQuery);

  return (
    <div className="mb-6">
      {/* Use the shared canonical FilterShell */}
      <FilterShell
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜尋食譜... 例如：番茄、牛肉、咖哩"
        onSearchSubmit={applyFilters}
        activeFilterCount={activeFilterCount}
        hasPendingChanges={hasPendingChanges}
        isExpanded={showFilters} onToggleExpand={() => setShowFilters(!showFilters)}
        headerContent={
          <RecipeSortSelect id="recipe-filters-sort" value={sortBy} onChange={setSortBy} />
        }
      >
        {recipeFilterSections.length > 0 && <FilterGroupList sections={recipeFilterSections} />}
        <FilterFooter
          onClear={showClear ? clearFilters : undefined}
          onApply={applyFilters}
          hasPendingChanges={hasPendingChanges}
        />
      </FilterShell>
    </div>
  );
}
