// Generate page settings panel component
import { FilterSection, FilterChip } from '@/components/filters';

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

const DIET_MODES = [
  { value: 'general', label: 'General' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'egg_lacto', label: 'Egg/Lacto Vegetarian' },
  { value: 'high_protein', label: 'High Protein' },
  { value: 'low_fat', label: 'Low Fat' },
  { value: 'light', label: 'Light' },
];

const EXCLUSIONS = [
  { value: 'beef', label: 'No Beef' },
  { value: 'pork', label: 'No Pork' },
  { value: 'chicken', label: 'No Chicken' },
  { value: 'seafood', label: 'No Seafood' },
  { value: 'eggs', label: 'No Eggs' },
  { value: 'dairy', label: 'No Dairy' },
  { value: 'spicy', label: 'No Spicy' },
];

const CUISINES = [
  { value: 'chinese', label: 'Chinese' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'western', label: 'Western' },
  { value: 'taiwanese', label: 'Taiwanese' },
  { value: 'se_asian', label: 'Southeast Asian' },
];

const COOKING_CONSTRAINTS = [
  { value: 'under_15', label: 'Under 15 min' },
  { value: 'under_30', label: 'Under 30 min' },
  { value: 'under_45', label: 'Under 45 min' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'one_pot', label: 'One-pot' },
  { value: 'air_fryer', label: 'Air fryer' },
];

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget' },
  { value: 'normal', label: 'Normal' },
  { value: 'premium', label: 'Premium' },
];

const INGREDIENT_REUSE = [
  { value: 'normal', label: 'Normal' },
  { value: 'smart', label: 'Smart Reuse' },
];

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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每週日數</label>
            <div className="flex gap-1">
              {DAYS_PER_WEEK.map(days => (
                <button
                  key={days}
                  onClick={() => setDaysPerWeek(days)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    daysPerWeek === days ? 'bg-[#9B6035] text-white' : 'bg-[#F8F3E8] text-[#3A2010]'
                  }`}
                >
                  {days}日
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每日碟數</label>
            <div className="flex gap-1">
              {DISHES_PER_DAY.map(dishes => (
                <button
                  key={dishes}
                  onClick={() => setDishesPerDay(dishes)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dishesPerDay === dishes ? 'bg-[#9B6035] text-white' : 'bg-[#F8F3E8] text-[#3A2010]'
                  }`}
                >
                  {dishes}碟
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#AA7A50] mb-2">人數</label>
            <select 
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value))}
              className="w-full py-2 px-3 rounded-lg bg-[#F8F3E8] text-[#3A2010] border-none text-sm"
            >
              {SERVINGS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}人</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#AA7A50] mb-2">飲食模式</label>
            <select 
              value={dietMode}
              onChange={(e) => setDietMode(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-[#F8F3E8] text-[#3A2010] border-none text-sm"
            >
              {DIET_MODES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#AA7A50] mb-2">預算</label>
            <div className="flex gap-1">
              {BUDGET_OPTIONS.map(b => (
                <button
                  key={b.value}
                  onClick={() => setBudget(b.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    budget === b.value ? 'bg-[#9B6035] text-white' : 'bg-[#F8F3E8] text-[#3A2010]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">菜系</label>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map(c => (
              <button
                key={c.value}
                onClick={() => toggleCuisine(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  cuisines.includes(c.value) ? 'bg-[#C8D49A] text-[#3A2010]' : 'bg-[#F8F3E8] text-[#AA7A50]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">烹飪限制</label>
          <div className="flex flex-wrap gap-2">
            {COOKING_CONSTRAINTS.map(c => (
              <button
                key={c.value}
                onClick={() => toggleConstraint(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  cookingConstraints.includes(c.value) ? 'bg-[#F0A060] text-white' : 'bg-[#F8F3E8] text-[#AA7A50]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">排除</label>
          <div className="flex flex-wrap gap-2">
            {EXCLUSIONS.map(e => (
              <button
                key={e.value}
                onClick={() => toggleExclusion(e.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  exclusions.includes(e.value) ? 'bg-red-100 text-red-700' : 'bg-[#F8F3E8] text-[#AA7A50]'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

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
