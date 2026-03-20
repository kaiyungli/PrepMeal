// Generate page settings panel component
import PlanningSection from './PlanningSection';
import PreferenceSection from './PreferenceSection';
import { FilterSection, FilterChip } from '@/components/filters';
import { DIET_MODES, EXCLUSIONS, CUISINES, COOKING_CONSTRAINTS, BUDGET_OPTIONS, INGREDIENT_REUSE } from '@/constants/filters';

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
  budget: string;
  setBudget: (v: string) => void;
  ingredientReuse: string;
  setIngredientReuse: (v: string) => void;
}

const DAYS_PER_WEEK = [3, 5, 7];
const DISHES_PER_DAY = [1, 2, 3];
const SERVINGS_OPTIONS = [1, 2, 3, 4, 5, 6];







export default function GenerateSettings({ 
  daysPerWeek, setDaysPerWeek,
  dishesPerDay, setDishesPerDay,
  servings, setServings,
  dietMode, setDietMode,
  exclusions, toggleExclusion,
  cuisines, toggleCuisine,
  cookingConstraints, toggleConstraint,
  budget, setBudget,
  ingredientReuse, setIngredientReuse
}: GenerateSettingsProps) {
  return (
    <div className="bg-white border-b border-[#DDD0B0] p-4">
      <div className="max-w-[1200px] mx-auto">
        <PlanningSection
          daysPerWeek={daysPerWeek}
          setDaysPerWeek={setDaysPerWeek}
          dishesPerDay={dishesPerDay}
          setDishesPerDay={setDishesPerDay}
          servings={servings}
          setServings={setServings}
        />

        <PreferenceSection
          dietMode={dietMode}
          setDietMode={setDietMode}
          budget={budget}
          setBudget={setBudget}
          ingredientReuse={ingredientReuse}
          setIngredientReuse={setIngredientReuse}
          CUISINES={CUISINES}
          cuisines={cuisines}
          toggleCuisine={toggleCuisine}
          COOKING_CONSTRAINTS={COOKING_CONSTRAINTS}
          cookingConstraints={cookingConstraints}
          toggleConstraint={toggleConstraint}
          EXCLUSIONS={EXCLUSIONS}
          exclusions={exclusions}
          toggleExclusion={toggleExclusion}
        />

        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">食材重用</label>
          <div className="flex gap-2">
            {INGREDIENT_REUSE.map(ir => (
              <button
                key={ir.value}
                onClick={() => setIngredientReuse(ir.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ingredientReuse === ir.value ? 'bg-[#9B6035] text-white' : 'bg-[#F8F3E8] text-[#3A2010]'
                }`}
              >
                {ir.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
