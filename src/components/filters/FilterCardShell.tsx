// Shared filter card shell - simplified for accordion behavior
import { ReactNode } from 'react';

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
  // Additional header content
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
  headerContent,
  children,
}: FilterCardShellProps) {
  const expandText = isExpanded ? '▲ 收起' : '▼ 展開';

  return (
    <div className="rounded-2xl border border-[#E8D9C9] bg-white shadow-sm overflow-hidden">
      {/* Header row - always visible, clickable button */}
      <button
        type="button"
        onClick={function() { console.log('[Shell] button clicked, calling onToggleExpand'); onToggleExpand?.(); }}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-[#FAF7F2] transition-colors cursor-pointer relative z-10"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-[#7A5A38]">{title}</span>
          {activeFilterCount != null && activeFilterCount > 0 && (
            <span className="text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {headerContent}
        </div>
        <span className="text-[#9B6035] text-sm">{expandText}</span>
      </button>

      {/* Content - controlled by isExpanded */}
      {isExpanded && (
        <div className="border-t border-[#F5EDE3] px-6 pb-6 pt-4">
          {/* Search bar if provided */}
          {onSearchChange && (
            <div className="relative mb-4">
              <svg
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#B79B7A]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0a7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder || '搜尋...'}
                className="w-full h-12 pl-11 pr-11 rounded-xl border border-[#E9DFC9] bg-[#FFFDF8] text-[15px] text-[#5C4033] placeholder:text-[#B79B7A] focus:outline-none focus:ring-2 focus:ring-[#D9B98C]/30 focus:border-[#D9B98C]"
              />
            </div>
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
                          key={option.value}
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
          {onClear && activeFilterCount != null && activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-[#F5EDE3]">
              <button 
                onClick={onClear}
                className="text-sm text-[#9B6035] hover:underline"
              >
                {clearLabel || '清除全部'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
