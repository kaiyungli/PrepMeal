// Shared filter card shell - used by both recipes page and generate page
import { useState, ReactNode } from 'react';

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
  const [showFilters, setShowFilters] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-xl border border-[#E5DCC8] shadow-sm mb-6 overflow-hidden">
      {/* 1. Search Bar */}
      {onSearchChange && (
        <div className="relative px-4 pt-4">
          <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[#AA7A50]">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full py-3.5 pl-11 pr-11 rounded-xl border-2 border-[#DDD0B0] bg-white text-[#3A2010] placeholder:text-[#C0A080] focus:outline-none focus:border-[#9B6035] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#AA7A50] hover:text-[#9B6035]"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 2. Header with expand/collapse + custom content */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer border-t border-[#E5DCC8]"
        onClick={() => setShowFilters(!showFilters)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#7A5A38]">篩選</span>
          {activeFilterCount > 0 && (
            <span className="text-xs bg-[#9B6035] text-white px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          {headerContent}
        </div>
        <span className="text-[#9B6035]">{showFilters ? '▲ 收起' : '▼ 展開'}</span>
      </div>

      {/* 3. Filter Sections */}
      {showFilters && (
        <div className="px-4 pb-4">
          {/* Active count */}
          <div className="py-2 text-xs font-semibold text-[#C0A080]">
            {activeFilterCount > 0 ? `已選 ${activeFilterCount} 項` : '所有食譜'}
          </div>

          {/* Filter chips in grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {filterSections.map(section => (
              <div key={section.id} className="min-w-0 space-y-1">
                <div className="text-xs font-bold text-[#7A5A38] tracking-wide uppercase">
                  {section.title}
                </div>
                <div className="flex flex-nowrap overflow-x-auto gap-1.5 pb-2 pr-2">
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
