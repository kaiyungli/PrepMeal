// Generate page settings - Unified filter system
import { useState } from 'react';
import { FilterCardShell } from '@/components/filters';
import { FILTER_GROUPS } from '@/constants/filters';

interface GenerateSettingsProps {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
  
  dailyComposition: string;
  setDailyComposition: (v: string) => void;
  allowCompleteMeal: boolean;
  setAllowCompleteMeal: (v: boolean) => void;
  servings: number;
  setServings: (v: number) => void;
  // Legacy props - ignored in unified mode
  dietMode?: any;
  exclusions?: any;
  toggleExclusion?: any;
  cuisines?: any;
  toggleCuisine?: any;
  cookingConstraints?: any;
  toggleConstraint?: any;
  ingredientReuse?: any;
  setIngredientReuse?: any;
  pantryIngredients?: any;
  setPantryIngredients?: any;
  // New unified filter props
  filters?: Record<string, string[]>;
  setFilters?: (f: Record<string, string[]>) => void;
  onClearAll?: () => void;
}

const DAYS_OPTIONS = [3, 5, 7];

const SERVINGS_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function GenerateSettings({ 
  daysPerWeek, setDaysPerWeek,
  dailyComposition, setDailyComposition, allowCompleteMeal, setAllowCompleteMeal,
  servings, setServings,
  filters: externalFilters,
  setFilters: externalSetFilters,
  onClearAll
}: GenerateSettingsProps) {
  
  // Use external filters if provided, otherwise use internal state
  const [internalFilters, setInternalFilters] = useState<Record<string, string[]>>({
    cuisine: [],
    dish_type: [],
    protein: [],
    method: [],
    speed: [],
    difficulty: [],
    diet: [],
    flavor: [],
  });
  
  const filters = externalFilters || internalFilters;
  const setFilters = externalSetFilters || setInternalFilters;

  // Build filter sections from unified FILTER_GROUPS with defensive dedupe
  const filterSections = FILTER_GROUPS.map(group => {
    const groupKey = group.key as string;
    
    // Defensive dedupe by value - ensure no duplicate options in UI
    const seen = new Set<string>();
    const dedupedOptions = (group.options || []).filter(opt => {
      if (!opt || !opt.value || seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
    
    return {
      id: group.key,
      title: group.label,
      options: dedupedOptions,
      selected: filters[groupKey] || [],
      onToggle: (value: string) => {
        const current = filters[groupKey] || [];
        const newValues = current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value];
        setFilters({ ...filters, [groupKey]: newValues });
      }
    };
  });

  // Count active filters
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto">
        {/* Planning Controls - embedded in header */}
        <div className="bg-[#F8F3E8] rounded-t-xl border border-b-0 border-[#E5DCC8] px-4 py-3 mb-[-1px]">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Days per week */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#7A5A38]">每週</span>
              <div className="flex gap-1">
                {DAYS_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDaysPerWeek(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      daysPerWeek === d
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
              <span className="text-xs font-medium text-[#7A5A38]">餐單</span>
              <div className="flex gap-1">
                {[
                  { value: 'complete_meal', label: '一份完整餐' },
                  { value: 'meat_veg', label: '一肉一菜' },
                  { value: 'two_meat_one_veg', label: '二肉一菜' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDailyComposition(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      dailyComposition === opt.value
                        ? 'bg-[#9B6035] text-white'
                        : 'bg-white text-[#3A2010] border border-[#E5DCC8] hover:bg-[#F4EDDD]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {(dailyComposition === 'meat_veg' || dailyComposition === 'two_meat_one_veg') && (
              <label className="flex items-center gap-2 mt-2 text-sm text-[#6B5C4F]">
                <input
                  type="checkbox"
                  checked={allowCompleteMeal}
                  onChange={(e) => setAllowCompleteMeal(e.target.checked)}
                />
                可接受一份完整餐
              </label>
            )}

            {/* Servings */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#7A5A38]">份量</span>
              <select
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E5DCC8] text-[#3A2010] focus:outline-none"
              >
                {SERVINGS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}人</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Use shared FilterCardShell */}
        <FilterCardShell
          filterSections={filterSections}
          activeFilterCount={activeCount}
          onClear={onClearAll}
          clearLabel="重設所有設定"
        />
      </div>
    </div>
  );
}
