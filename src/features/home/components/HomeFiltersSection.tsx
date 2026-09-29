import { useRef } from 'react';
import { FilterShell, FilterGroupList, FilterSectionConfig, RecipeSortSelect } from '@/components/filters';
import HomeFilterFooter from './HomeFilterFooter';
import HomeFilterMobileTray from './HomeFilterMobileTray';
import AppliedFiltersSummary, { type AppliedFilterChip } from './AppliedFiltersSummary';

interface HomeFiltersSectionProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  recipeFilterSections: FilterSectionConfig[];
  hasDraftSelection: boolean;
  hasPendingChanges: boolean;
  appliedFilterCount: number;
  clearFilters: () => void;
  applyFilters: () => void;
  // Applied-filter summary - structurally owned by this component (it sits
  // below the filter card as result-state presentation, not a control), but
  // its visibility gate and derived values still come from the caller
  // (index.js via useHomePageViewState) rather than being recomputed here.
  showSummary: boolean;
  appliedFilterChips: AppliedFilterChip[];
  appliedSearchQuery: string;
  resultCountText: string;
  removeDraftFilterValue: (sectionId: string, value: string) => void;
  removeDraftSearch: () => void;
  clearAppliedFilters: () => void;
}

const PANEL_ID = 'home-recipe-filter-panel';

/**
 * Owns the complete homepage filter presentation as one public boundary:
 * persistent search/sort/trigger bar, expanded desktop panel, mobile tray,
 * and the applied-filter summary. All filtering/business state stays in
 * useHomeRecipeFilters (via index.js) - this component only arranges the
 * shared FilterShell (search bar, toggle, desktop content region) plus the
 * homepage-specific mobile tray, which is a separate modal presentation of
 * the same FilterGroupList/FilterFooter primitives rather than something the
 * base shell needs to know about.
 */
export default function HomeFiltersSection({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  recipeFilterSections,
  hasDraftSelection,
  hasPendingChanges,
  appliedFilterCount,
  clearFilters,
  applyFilters,
  showSummary,
  appliedFilterChips,
  appliedSearchQuery,
  resultCountText,
  removeDraftFilterValue,
  removeDraftSearch,
  clearAppliedFilters,
}: HomeFiltersSectionProps) {
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const desktopPanelId = `${PANEL_ID}-desktop`;
  const mobilePanelId = `${PANEL_ID}-mobile`;

  return (
    <div className="mb-4">
      <FilterShell
        ref={triggerButtonRef}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="搜尋食譜... 例如：番茄、牛肉、咖哩"
        onSearchSubmit={applyFilters}
        searchApplyButton={{ label: '顯示食譜', shortLabel: '顯示', pending: hasPendingChanges }}
        isExpanded={showFilters}
        onToggleExpand={() => setShowFilters(!showFilters)}
        activeFilterCount={appliedFilterCount}
        hasPendingChanges={hasPendingChanges}
        headerContent={
          <RecipeSortSelect
            id="home-recipe-sort"
            value={sortBy}
            onChange={setSortBy}
            wrapperClassName="flex min-w-0 items-center gap-2"
            labelClassName="shrink-0 text-sm text-[#7A5A38]"
            selectClassName="h-10 max-w-[155px] min-w-0 px-2 rounded-xl border border-[#DDD0B0] text-sm bg-white text-[#5C4033]"
          />
        }
        cardTestId="home-filter-section-card"
        searchWrapperClassName="px-4 pt-3"
        headerWrapperClassName="flex items-center justify-between gap-3 px-4 pb-3 mt-2.5"
        toggleTestId="home-filter-toggle-button"
        badgeClassName="text-xs bg-[#9B6035] text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
        contentId={desktopPanelId}
        contentTestId="home-filter-desktop-panel"
        ariaControls={`${desktopPanelId} ${mobilePanelId}`}
        contentExpandedClassName="pt-4 pb-6 hidden md:block"
        contentCollapsedClassName="pt-4 pb-6 hidden"
      >
        <FilterGroupList sections={recipeFilterSections} />
        <HomeFilterFooter
          hasDraftSelection={hasDraftSelection}
          hasPendingChanges={hasPendingChanges}
          onClearDraft={clearFilters}
          onApply={applyFilters}
        />
      </FilterShell>

      <HomeFilterMobileTray
        panelId={PANEL_ID}
        show={showFilters}
        onClose={() => setShowFilters(false)}
        triggerRef={triggerButtonRef}
        sections={recipeFilterSections}
        hasDraftSelection={hasDraftSelection}
        hasPendingChanges={hasPendingChanges}
        onClearDraft={clearFilters}
        onApply={applyFilters}
      />

      {showSummary && (
        <AppliedFiltersSummary
          chips={appliedFilterChips}
          appliedSearchQuery={appliedSearchQuery}
          resultCountText={resultCountText}
          onRemoveChip={removeDraftFilterValue}
          onRemoveSearch={removeDraftSearch}
          onResetAll={clearAppliedFilters}
        />
      )}
    </div>
  );
}
