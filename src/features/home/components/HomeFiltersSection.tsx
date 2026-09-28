import { useRef } from 'react';
import { FilterSectionConfig } from '@/components/filters';
import HomeFilterBar from './HomeFilterBar';
import HomeFilterDesktopPanel from './HomeFilterDesktopPanel';
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
 * useHomeRecipeFilters (via index.js) - this component only arranges
 * already-focused private subcomponents.
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

  return (
    <div className="mb-4">
      {/* The bar and the expanded panel share ONE visual card/boundary - no
          gap-separated double card. HomeFilterDesktopPanel contributes only
          an internal border-t divider when expanded; neither subcomponent
          owns its own border/shadow/rounding any more. The mobile tray
          stays a separate fixed-overlay subtree below - a modal can't be
          visually merged into a static card. */}
      <div
        data-testid="home-filter-section-card"
        className="rounded-2xl border border-[#E8D9C9] bg-white shadow-sm overflow-hidden"
      >
        <HomeFilterBar
          ref={triggerButtonRef}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onApply={applyFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          appliedFilterCount={appliedFilterCount}
          hasPendingChanges={hasPendingChanges}
          panelId={PANEL_ID}
        />

        <HomeFilterDesktopPanel
          panelId={PANEL_ID}
          show={showFilters}
          sections={recipeFilterSections}
          hasDraftSelection={hasDraftSelection}
          hasPendingChanges={hasPendingChanges}
          onClearDraft={clearFilters}
          onApply={applyFilters}
        />
      </div>

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
