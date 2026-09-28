import { useRef } from 'react';
import { FilterSectionConfig } from '@/components/filters';
import HomeFilterBar from './HomeFilterBar';
import HomeFilterDesktopPanel from './HomeFilterDesktopPanel';
import HomeFilterMobileTray from './HomeFilterMobileTray';
import PendingChangesNotice from './PendingChangesNotice';

interface HomeRecipeFilterControlsProps {
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
}

const PANEL_ID = 'home-recipe-filter-panel';

export default function HomeRecipeFilterControls({
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
}: HomeRecipeFilterControlsProps) {
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="mb-4">
      <HomeFilterBar
        ref={triggerButtonRef}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSubmitSearch={applyFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        appliedFilterCount={appliedFilterCount}
        hasPendingChanges={hasPendingChanges}
        panelId={PANEL_ID}
      />

      <PendingChangesNotice
        show={hasPendingChanges && !showFilters}
        onApply={applyFilters}
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
    </div>
  );
}
