// Generate page settings - Unified filter system
import { useState } from 'react';
import { FilterShell, FilterGroupList, FilterFooter } from '@/components/filters';
import { FILTER_GROUPS } from '@/constants/filters';
import { buildFilterSections } from '@/constants/filterGroups';
import SegmentedControl from '@/components/ui/SegmentedControl';

interface GenerateSettingsProps {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
  
  dailyComposition: string;
  setDailyComposition: (v: string) => void;
  allowCompleteMeal: boolean;
  setAllowCompleteMeal: (v: boolean) => void;
  servings: number;
  setServings: (v: number) => void;
  budget: string;
  setBudget: (v: string) => void;
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
  filters: Record<string, string[]>;
  setFilters: (f: Record<string, string[]>) => void;
  onClearAll?: () => void;
  isFilterExpanded?: boolean;
  setIsFilterExpanded?: (v: boolean) => void;
  handleToggleFilterExpanded?: () => void;
}

const DAYS_OPTIONS = [3, 5, 7];
const DAYS_SEGMENTED_OPTIONS = DAYS_OPTIONS.map(d => ({ value: String(d), label: `${d}天` }));

const DAILY_COMPOSITION_OPTIONS = [
  { value: 'complete_meal', label: '一份完整餐' },
  { value: 'meat_veg', label: '一肉一菜' },
  { value: 'two_meat_one_veg', label: '二肉一菜' },
];

const SERVINGS_OPTIONS = [1, 2, 3, 4, 5, 6];
const BUDGET_OPTIONS = [
  { value: 'budget', label: '省錢' },
  { value: 'normal', label: '一般' },
  { value: 'premium', label: '寬裕' },
];

// Decorative only, same convention as FilterGroupList's Soft Tile check icon
// (kept as a separate, un-exported copy here rather than importing that
// module's private helper - this is a distinct presentation-only boolean
// toggle, not a filter option). aria-pressed already carries the state;
// this is purely reinforcement, so it is aria-hidden and carries no text.
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export default function GenerateSettings({ 
  daysPerWeek, setDaysPerWeek,
  dailyComposition, setDailyComposition, allowCompleteMeal, setAllowCompleteMeal,
  servings, setServings,
  budget, setBudget,
  filters,
  setFilters,
  onClearAll,
  isFilterExpanded,
  setIsFilterExpanded,
  handleToggleFilterExpanded
}: GenerateSettingsProps) {
  
  // Controlled-only: filters come from parent (single source of truth)
  // No internal filter state

  // Build filter sections from unified FILTER_GROUPS via the shared helper
  // (also used by Home and /recipes/favorites) - same defensive dedupe and
  // shape as before (see tests/generateFilterSectionConstructionEquivalence.test.ts),
  // now also carrying each group's presentation tier through consistently.
  const filterSections = buildFilterSections(
    FILTER_GROUPS,
    filters,
    (groupKey, value) => {
      const current = filters[groupKey] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setFilters({ ...filters, [groupKey]: newValues });
    }
  );

  // Count active filters
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const showClear = Boolean(onClearAll) && activeCount > 0;

  return (
    <div>
      {/* Planning Controls - embedded in header */}
      <div className="bg-white rounded-xl border border-[#DDD0B0] px-4 py-3">
          {/* Grouped controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Group 1: 每週 - single-choice: exactly one of 3/5/7 days */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[#7A5A38]">每週</span>
              <SegmentedControl
                name="generate-days-per-week"
                legend="每週日數"
                options={DAYS_SEGMENTED_OPTIONS}
                value={String(daysPerWeek)}
                onChange={(v) => setDaysPerWeek(Number(v))}
              />
            </div>

            {/* Group 2: 餐單 */}
            <div className="flex flex-col gap-2">
              {/* Row 1: Label + independent boolean toggle (not part of the
                  dailyComposition single-choice group below - it stays its
                  own conditionally-visible on/off setting). */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#7A5A38]">餐單</span>
                {(dailyComposition === 'meat_veg' || dailyComposition === 'two_meat_one_veg') && (
                  <button
                    type="button"
                    aria-pressed={allowCompleteMeal}
                    onClick={() => setAllowCompleteMeal(!allowCompleteMeal)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035] ${
                      allowCompleteMeal
                        ? 'bg-[#9B6035] text-white border-[#9B6035]'
                        : 'bg-white text-[#7A5A38] border-[#E5D5C0] hover:border-[#9B6035]'
                    }`}
                  >
                    {allowCompleteMeal && <CheckIcon />}
                    可接受完整餐
                  </button>
                )}
              </div>
              {/* Row 2: single-choice: exactly one meal composition */}
              <SegmentedControl
                name="generate-daily-composition"
                legend="每餐菜式"
                options={DAILY_COMPOSITION_OPTIONS}
                value={dailyComposition}
                onChange={setDailyComposition}
              />
            </div>

            {/* Group 3: 份量 - out of scope: remains the existing native select */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[#7A5A38]">份量</span>
              <select
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E5DCC8] text-[#3A2010] focus:outline-none"
              >
                {SERVINGS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}人</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-[#7A5A38]">預算偏好</span>
              <SegmentedControl
                name="generate-budget"
                legend="預算偏好"
                options={BUDGET_OPTIONS}
                value={budget}
                onChange={setBudget}
              />
            </div>
          </div>
        </div>

        {/* Use the shared canonical FilterShell */}
        <FilterShell
          activeFilterCount={activeCount}
          isExpanded={isFilterExpanded}
          onToggleExpand={handleToggleFilterExpanded}
        >
          {filterSections.length > 0 && <FilterGroupList sections={filterSections} />}
          <FilterFooter onClear={showClear ? onClearAll : undefined} clearLabel="重設所有設定" />
        </FilterShell>
    </div>
  );
}
