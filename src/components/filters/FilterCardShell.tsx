// Shared filter card shell - simplified for accordion behavior
import { ReactNode, useId } from 'react';
import RecipeSearchBar from './RecipeSearchBar';
import FilterGroupList, { type FilterSectionConfig } from './FilterGroupList';
import FilterFooter from './FilterFooter';

export type { FilterSectionConfig };

interface FilterCardShellProps {
  // Title
  title?: string;
  // Search
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  // Expand/collapse
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  // Filter sections
  filterSections?: FilterSectionConfig[];
  // Active count
  activeFilterCount?: number;
  // Clear handler
  onClear?: () => void;
  clearLabel?: string;
  onApply?: () => void;
  hasPendingChanges?: boolean;
  // Additional header content (rendered next to the toggle button, never
  // inside it - e.g. a sort <select>)
  headerContent?: ReactNode;
  children?: ReactNode;
}

export default function FilterCardShell({
  title = '篩選',
  isExpanded = false,
  onToggleExpand,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filterSections,
  activeFilterCount,
  onClear,
  clearLabel = '清除全部',
  onApply,
  hasPendingChanges = false,
  headerContent,
  children,
}: FilterCardShellProps) {
  const expandText = isExpanded ? '▲ 收起' : '▼ 展開';
  // Stable per-instance id (React 18+ useId), so aria-controls always
  // resolves to the panel this specific instance controls - a module-level
  // constant here would collide if more than one FilterCardShell is ever
  // mounted at once.
  const contentId = `filter-card-shell-content-${useId()}`;
  const hasSearch = Boolean(onSearchChange);
  const showClear = Boolean(onClear) &&
    ((activeFilterCount != null && activeFilterCount > 0) || Boolean(searchQuery));

  return (
    <div className="rounded-2xl border border-[#E8D9C9] bg-white shadow-sm overflow-hidden">
      {/* Search bar - persistent and independent of the collapsible detail
          panel below, matching the homepage's layout: it stays visible
          whether or not the filter chips are expanded. */}
      {hasSearch && (
        <div className="px-6 pt-4">
          <RecipeSearchBar
            value={searchQuery || ''}
            onChange={onSearchChange as (v: string) => void}
            onSubmit={onApply}
            placeholder={searchPlaceholder || '搜尋...'}
          />
        </div>
      )}

      {/* Header row - the toggle button and any extra header content (e.g. a
          sort <select>) are siblings, never nested: a <button> must not
          contain interactive descendants per the HTML content model
          (https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element),
          and a nested <select> breaks keyboard/screen-reader interaction. */}
      <div className={`flex w-full items-center justify-between gap-3 px-6 ${hasSearch ? 'pt-3 pb-4' : 'py-4'}`}>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
        >
          <svg className="w-5 h-5 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-[#7A5A38]">{title}</span>
          {activeFilterCount != null && activeFilterCount > 0 && (
            <span className="text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <span className="text-[#9B6035] text-sm">{expandText}</span>
        </button>
        {headerContent}
      </div>

      {/* Content - always in the DOM so `aria-controls` above always
          resolves to a real element; visibility (not mounting) is what
          `isExpanded` controls. Only the detailed filter chips (and the
          clear/apply footer) live here now - search moved out above. */}
      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={isExpanded ? 'border-t border-[#F5EDE3] px-6 pb-6 pt-4' : 'hidden'}
      >
        {/* Filter sections */}
        {filterSections && filterSections.length > 0 && (
          <FilterGroupList sections={filterSections} />
        )}

        <FilterFooter
          onClear={showClear ? onClear : undefined}
          clearLabel={clearLabel}
          onApply={onApply}
          hasPendingChanges={hasPendingChanges}
        />
        {children}
      </div>
    </div>
  );
}
