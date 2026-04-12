// Shared filter card shell - used by both recipes page and generate page
import { useState, useEffect, ReactNode } from 'react';

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
  // Optional search bar at top
  searchQuery?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  // Filter sections
  filterSections: FilterSectionConfig[];
  // Active filter count
  activeFilterCount: number;
  // Clear handler
  onClear?: () => void;
  // Clear label
  clearLabel?: string;
  // Expand/collapse state
  defaultExpanded?: boolean;
  // Additional header content
  headerContent?: ReactNode;
}

export default function FilterCardShell({
  searchQuery,
  onSearchChange,
  searchPlaceholder = '尋食譜...',
  filterSections,
  activeFilterCount,
  onClear,
  clearLabel = '清除全部',
  defaultExpanded = true,
  headerContent
}: FilterCardShellProps) {
  // Sync with prop to avoid hydration mismatch
  const [showFilters, setShowFilters] = useState(defaultExpanded);
  useEffect(() => {
    setShowFilters(defaultExpanded);
  }, [defaultExpanded]);

  // Compute expand/collapse text on render to ensure consistency
  const expandText = showFilters ? '▲ 收起' : '▼ 展開';

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* 1. Header row - always visible */}
      <div 
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#FAF7F2] transition-colors border-b border-[#F5EDE3]"
        onClick={() => setShowFilters(!showFilters)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-[#9B6035]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-[#7A5A38]">篩選</span>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {headerContent}
        </div>
        <span className="text-[#9B6035] text-sm">{expandText}</span>
      </div>

      {/* 2. Search bar - below header */}
      {onSearchChange && (
        <div className="relative px-6 py-4 border-b border-[#F5EDE3]">
          <svg 
            className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-[#B79B7A] pointer-events-none" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-12 pl-12 pr-12 rounded-xl border border-[#E9DFC9] bg-[#FFFDF8] text-[15px] text-[#5C4033] placeholder:text-[#B79B7A] focus:outline-none focus:ring-2 focus:ring-[#D9B98C]/30 focus:border-[#D9B98C] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-7 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full text-[#B79B7A] hover:bg-[#F5EDE3] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 3. Filter Sections - Content layer */}
      {showFilters && (
        <div className="px-4 pb-4 pt-2">
          {/* Active count */}
          <div className="pb-3 text-xs font-medium text-[#B79B7A]">
            {activeFilterCount > 0 ? `已選 ${activeFilterCount} 項` : '所有食譜'}
          </div>

          {/* Filter chips in grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 max-h-[300px] overflow-y-auto pr-2">
            {(filterSections || []).map(section => (
              <div key={section.id} className="min-w-0 space-y-1.5">
                <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase sticky top-0 bg-white py-1">
                  {section.title}
                </div>
                <div className="flex flex-wrap gap-1.5 pb-2 pr-2">
                  {section.options.map(option => {
                    const isSelected = section.selected?.includes(option.value);
                    const isDanger = section.variant === 'danger';
                    return (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          section.onToggle(option.value);
                        }}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? isDanger
                              ? 'bg-red-500 text-white'
                              : 'bg-[#9B6035] text-white'
                            : 'bg-white text-[#3A2010] border border-[#E7E0D4] hover:bg-gray-100'
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

          {/* Clear All */}
          {onClear && activeFilterCount > 0 && (
            <div className="mt-4 pt-3 border-t border-[#EEE5D6]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="block text-left text-xs font-semibold text-[#9B6035] hover:underline"
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
