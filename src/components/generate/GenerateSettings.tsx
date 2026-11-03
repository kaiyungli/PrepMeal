// Generate page settings - Unified filter system

import { FilterShell, FilterGroupList, FilterFooter } from '@/components/filters';
import { FILTER_GROUPS } from '@/constants/filters';
import { buildFilterSections } from '@/constants/filterGroups';
import { useId, useState } from 'react';
import SegmentedControl from '@/components/ui/SegmentedControl';

interface GenerateSettingsProps {
  hasRecipes?: boolean;
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
  dietMode?: string;
  exclusions?: string[];
  toggleExclusion?: (value: string) => void;
  cuisines?: string[];
  toggleCuisine?: (value: string) => void;
  cookingConstraints?: string[];
  toggleConstraint?: (value: string) => void;
  ingredientReuse?: string;
  setIngredientReuse?: (value: string) => void;
  pantryIngredients?: string[];
  setPantryIngredients?: (values: string[]) => void;
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
  hasRecipes = false,
  daysPerWeek, setDaysPerWeek,
  dailyComposition, setDailyComposition, allowCompleteMeal, setAllowCompleteMeal,
  servings, setServings,
  budget, setBudget,
  filters,
  setFilters,
  onClearAll,
  isFilterExpanded,
  handleToggleFilterExpanded
}: GenerateSettingsProps) {
  
  const [editingSettings, setEditingSettings] = useState(false);
  const settingsId = useId();
  const desktopCollapsed = hasRecipes && !editingSettings;
  const compositionLabel = DAILY_COMPOSITION_OPTIONS.find(option => option.value === dailyComposition)?.label;
  const budgetLabel = BUDGET_OPTIONS.find(option => option.value === budget)?.label;

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
      {hasRecipes && <div className="hidden [@media(min-width:1280px)_and_(pointer:fine)]:flex items-center justify-between gap-4 rounded-xl border border-[#DDD0B0] bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#3A2010]">目前設定：{daysPerWeek} 日 · {compositionLabel} · {servings} 人 · {budgetLabel}</p>
          <p className="mt-1 text-xs text-[#66594B]">{activeCount > 0 ? `已選 ${activeCount} 個篩選條件。` : ''}修改設定後，按「一鍵生成」更新餐單。</p>
        </div>
        <button type="button" aria-expanded={!desktopCollapsed} aria-controls={settingsId} onClick={() => setEditingSettings(value => !value)} className="shrink-0 min-h-10 rounded-lg border border-[#DDD0B0] px-3 text-sm font-medium text-[#65482F] hover:bg-[#F8F3E8]">{desktopCollapsed ? '修改設定' : '收起設定'}</button>
      </div>}
      <div id={settingsId} className={desktopCollapsed ? '[@media(min-width:1280px)_and_(pointer:fine)]:hidden' : hasRecipes ? 'mt-3' : ''}>
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
              <label htmlFor={`${settingsId}-servings`} className="text-xs font-medium text-[#7A5A38]">用餐人數</label>
              <select
                id={`${settingsId}-servings`}
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
    </div>
  );
}
