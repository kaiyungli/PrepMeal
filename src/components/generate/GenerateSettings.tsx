// Generate page settings panel - unified with recipes page design language
import { FilterCardShell } from '@/components/filters';
import { buildGenerateFilterSections } from '@/constants/filters';

interface GenerateSettingsProps {
  daysPerWeek: number;
  setDaysPerWeek: (v: number) => void;
  dishesPerDay: number;
  setDishesPerDay: (v: number) => void;
  servings: number;
  setServings: (v: number) => void;
  dietMode: string;
  setDietMode: (v: string) => void;
  exclusions: string[];
  toggleExclusion: (v: string) => void;
  cuisines: string[];
  toggleCuisine: (v: string) => void;
  cookingConstraints: string[];
  toggleConstraint: (v: string) => void;
  ingredientReuse: string;
  setIngredientReuse: (v: string) => void;
  pantryIngredients: string[];
  setPantryIngredients: (v: string[]) => void;
  onClearAll?: () => void;
}

const DAYS_OPTIONS = [3, 5, 7];
const DISHES_OPTIONS = [1, 2, 3];
const SERVINGS_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function GenerateSettings({ 
  daysPerWeek, setDaysPerWeek,
  dishesPerDay, setDishesPerDay,
  servings, setServings,
  dietMode, setDietMode,
  exclusions, toggleExclusion,
  cuisines, toggleCuisine,
  cookingConstraints, toggleConstraint,
  ingredientReuse, setIngredientReuse,
  pantryIngredients, setPantryIngredients,
  onClearAll
}: GenerateSettingsProps) {
  // Count active filters
  const activeCount = 
    (dietMode && dietMode !== 'general' ? 1 : 0) +
    (ingredientReuse && ingredientReuse !== 'allow' ? 1 : 0) +
    cuisines.length +
    cookingConstraints.length +
    exclusions.length;

  // Use shared builder
  const filterSections = buildGenerateFilterSections({
    dietMode,
    setDietMode,
    ingredientReuse,
    setIngredientReuse,
    cuisines,
    toggleCuisine,
    cookingConstraints,
    toggleConstraint,
    exclusions,
    toggleExclusion
  });

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
              <span className="text-xs font-medium text-[#7A5A38]">每日</span>
              <div className="flex gap-1">
                {DISHES_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDishesPerDay(d)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      dishesPerDay === d
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
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#E5DCC8] text-[#3A2010] focus:outline-none"
              >
                {SERVINGS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}人</option>
                ))}
              </select>
            </div>

            {/* Pantry indicator */}
            {pantryIngredients.length > 0 && (
              <div className="ml-auto text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                已選 {pantryIngredients.length} 項食材
              </div>
            )}
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
