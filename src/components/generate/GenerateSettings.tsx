// Generate page settings panel - unified with recipes page design language
import { FilterCardShell } from '@/components/filters';
import { CUISINES, COOKING_CONSTRAINTS, EXCLUSIONS, DIET_MODES, GENERATE_TIME_CONSTRAINTS, GENERATE_DIFFICULTY_CONSTRAINTS, GENERATE_EQUIPMENT_CONSTRAINTS } from '@/constants/filters';

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

  // Build filter sections - NO BUDGET
  const filterSections = [
    // Diet mode
    {
      id: 'diet',
      title: '飲食模式',
      options: DIET_MODES.map(d => ({ value: d.value, label: d.label })),
      selected: [dietMode],
      onToggle: (v: string) => setDietMode(v)
    },
    // Ingredient reuse
    {
      id: 'reuse',
      title: '食材重用',
      options: [
        { value: 'allow', label: '允許' },
        { value: 'avoid', label: '避免' }
      ],
      selected: [ingredientReuse],
      onToggle: (v: string) => setIngredientReuse(v)
    },
    // Cuisine
    {
      id: 'cuisine',
      title: '菜系',
      options: CUISINES.map(c => ({ value: c.value, label: c.label })),
      selected: cuisines,
      onToggle: toggleCuisine
    },
    // Time constraints
    {
      id: 'time',
      title: '時間',
      options: GENERATE_TIME_CONSTRAINTS.map(c => ({ value: c.value, label: c.label })),
      selected: cookingConstraints.filter(c => c.startsWith('under_')),
      onToggle: toggleConstraint
    },
    // Difficulty
    {
      id: 'difficulty',
      title: '難度',
      options: GENERATE_DIFFICULTY_CONSTRAINTS.map(c => ({ value: c.value, label: c.label })),
      selected: cookingConstraints.filter(c => ['easy', 'medium', 'hard'].includes(c)),
      onToggle: toggleConstraint
    },
    // Equipment
    {
      id: 'equipment',
      title: '工具',
      options: GENERATE_EQUIPMENT_CONSTRAINTS.map(c => ({ value: c.value, label: c.label })),
      selected: cookingConstraints.filter(c => ['one_pot', 'air_fryer'].includes(c)),
      onToggle: toggleConstraint
    },
    // Exclusions
    {
      id: 'exclusions',
      title: '排除',
      options: EXCLUSIONS.map(e => ({ value: e.value, label: e.label })),
      selected: exclusions,
      onToggle: toggleExclusion,
      variant: 'danger' as const
    }
  ];

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
