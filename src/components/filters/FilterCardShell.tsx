// Shared filter card shell - simplified for accordion behavior
import { ReactNode } from 'react';
import RecipeSearchBar from './RecipeSearchBar';

interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSectionConfig {
  id: string;
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: 'default' | 'danger';
}

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

const CONTENT_ID = 'filter-card-shell-content';

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

  return (
    <div className="rounded-2xl border border-[#E8D9C9] bg-white shadow-sm overflow-hidden">
      {/* Header row - the toggle button and any extra header content (e.g. a
          sort <select>) are siblings, never nested: a <button> must not
          contain interactive descendants per the HTML content model
          (https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element),
          and a nested <select> breaks keyboard/screen-reader interaction. */}
      <div className="flex w-full items-center justify-between gap-3 px-6 py-4">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={CONTENT_ID}
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
          `isExpanded` controls. */}
      <div
        id={CONTENT_ID}
        aria-hidden={!isExpanded}
        className={isExpanded ? 'border-t border-[#F5EDE3] px-6 pb-6 pt-4' : 'hidden'}
      >
        {/* Search bar if provided */}
        {onSearchChange && (
          <RecipeSearchBar
            value={searchQuery || ''}
            onChange={onSearchChange}
            onSubmit={onApply}
            placeholder={searchPlaceholder || '搜尋...'}
            className="mb-4"
          />
        )}

        {/* Filter sections */}
        {filterSections && filterSections.length > 0 && (
          <div className="space-y-4">
            {filterSections.map(section => (
              <div key={section.id}>
                <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase mb-2">
                  {section.title}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {section.options.map(option => {
                    const isSelected = section.selected?.includes(option.value);
                    return (
                      <button
                        type="button"
                        key={option.value}
                        aria-pressed={isSelected}
                        onClick={() => section.onToggle(option.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#9B6035] text-white border border-[#9B6035]'
                            : 'bg-white text-[#7A5A38] border border-[#E9DFC9] hover:border-[#9B6035]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Clear button */}
        {onClear && ((activeFilterCount != null && activeFilterCount > 0) || Boolean(searchQuery)) && (
          <div className="mt-4 pt-4 border-t border-[#F5EDE3]">
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-[#9B6035] hover:underline"
            >
              {clearLabel || '清除全部'}
            </button>
          </div>
        )}
        {onApply && (
          <div className="mt-5 pt-4 border-t border-[#F5EDE3] flex items-center justify-between gap-3">
            <span className="text-xs text-[#7A5A38]" aria-live="polite">
              {hasPendingChanges ? '有未套用的選項' : '目前顯示已確認的結果'}
            </span>
            <button
              type="button"
              onClick={onApply}
              disabled={!hasPendingChanges}
              className="rounded-lg bg-[#9B6035] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-default disabled:opacity-50"
            >
              確認篩選
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
