// Unified filter shell for generate page - reuses recipes page design language
import { useState } from 'react';
import FilterSection from '@/components/filters/FilterSection';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSectionConfig {
  id: string;
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: 'default' | 'danger';
}

interface PlanningConfig {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
  dishesPerDay: number;
  setDishesPerDay: (v: number) => void;
  servings: number;
  setServings: (v: number) => void;
}

interface GenerateFilterShellProps {
  // Planning controls
  planning: PlanningConfig;
  // Filter sections
  filterSections: FilterSectionConfig[];
  // Optional pantry input
  pantryValue?: string;
  onPantryChange?: (v: string) => void;
  // Clear handler
  onClear?: () => void;
}

const DAYS_OPTIONS = [3, 5, 7];
const DISHES_OPTIONS = [1, 2, 3];
const SERVINGS_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function GenerateFilterShell({
  planning,
  filterSections,
  pantryValue = '',
  onPantryChange,
  onClear
}: GenerateFilterShellProps) {
  const [showFilters, setShowFilters] = useState(true);

  // Collect all selected for count
  const activeCount = filterSections.reduce((sum, s) => sum + s.selected.length, 0);

  return (
    <div className="bg-white rounded-xl border border-[#E5DCC8] shadow-sm mb-6 overflow-hidden">
      {/* 1. Search/Pantry Bar - Same visual as recipes page */}
      {onPantryChange && (
        <div className="relative px-4 pt-4 pb-2">
          <span className="absolute left-7 top-1/2 -translate-y-1/2 text-[#AA7A50]">🔍</span>
          <input
            type="text"
            value={pantryValue}
            onChange={(e) => onPantryChange(e.target.value)}
            placeholder="輸入食材... 例如：番茄、牛肉、咖哩"
            className="w-full py-3.5 pl-11 pr-4 rounded-xl border-2 border-[#DDD0B0] bg-white text-[#3A2010] placeholder:text-[#C0A080] focus:outline-none focus:border-[#9B6035] transition-colors text-sm"
          />
        </div>
      )}

      {/* 2. Planning Controls Row - Embedded in filter shell */}
      <div className="px-4 py-3 bg-[#F8F3E8] border-y border-[#E5DCC8]">
        <div className="flex items-center gap-4">
          {/* Days per week */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#7A5A38]">每週</span>
            <div className="flex gap-1">
              {DAYS_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => planning.setDaysPerWeek(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    planning.daysPerWeek === d
                      ? 'bg-[#9B6035] text-white'
                      : 'bg-white text-[#3A2010] border border-[#E5DCC8] hover:bg-[#F4EDDD]'
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </div>

          {/* Dishes per day */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#7A5A38]">每日</span>
            <div className="flex gap-1">
              {DISHES_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => planning.setDishesPerDay(d)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    planning.dishesPerDay === d
                      ? 'bg-[#9B6035] text-white'
                      : 'bg-white text-[#3A2010] border border-[#E5DCC8] hover:bg-[#F4EDDD]'
                  }`}
                >
                  {d}碟
                </button>
              ))}
            </div>
          </div>

          {/* Servings */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#7A5A38]">份量</span>
            <select
              value={planning.servings}
              onChange={(e) => planning.setServings(parseInt(e.target.value))}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E5DCC8] text-[#3A2010] focus:outline-none"
            >
              {SERVINGS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}人</option>
              ))}
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs font-semibold text-[#9B6035]"
          >
            {showFilters ? '▲ 收起' : '▼ 展開'}
          </button>
        </div>
      </div>

      {/* 3. Filter Sections - Same chip layout as recipes page */}
      {showFilters && (
        <div className="px-4 pb-4">
          {/* Active count */}
          <div className="py-2 text-xs font-semibold text-[#C0A080]">
            {activeCount > 0 ? `已選 ${activeCount} 項` : '所有條件'}
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
                        onClick={() => section.onToggle(option.value)}
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
          {onClear && activeCount > 0 && (
            <div className="mt-4 pt-3 border-t border-[#EEE5D6]">
              <button
                onClick={onClear}
                className="block text-left text-xs font-semibold text-[#9B6035] hover:underline"
              >
                清除全部
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
