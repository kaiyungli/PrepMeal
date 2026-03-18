// Preference section - diet mode, budget, reuse
import { FilterSection } from '@/components/filters';

interface PreferenceSectionProps {
  dietMode: string;
  setDietMode: (v: string) => void;
  budget: string;
  setBudget: (v: string) => void;
  ingredientReuse: string;
  setIngredientReuse: (v: string) => void;
  CUISINES: any[];
  cuisines: string[];
  toggleCuisine: (v: string) => void;
  COOKING_CONSTRAINTS: any[];
  cookingConstraints: string[];
  toggleConstraint: (v: string) => void;
  EXCLUSIONS: any[];
  exclusions: string[];
  toggleExclusion: (v: string) => void;
}

export default function PreferenceSection({
  dietMode,
  setDietMode,
  budget,
  setBudget,
  ingredientReuse,
  setIngredientReuse,
  CUISINES,
  cuisines,
  toggleCuisine,
  COOKING_CONSTRAINTS,
  cookingConstraints,
  toggleConstraint,
  EXCLUSIONS,
  exclusions,
  toggleExclusion,
}: PreferenceSectionProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">飲食模式</label>
          <select
            value={dietMode}
            onChange={(e) => setDietMode(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
          >
            <option value="general">不設限</option>
            <option value="vegetarian">素食</option>
            <option value="egg_lacto">蛋奶素</option>
            <option value="high_protein">高蛋白</option>
            <option value="low_fat">低脂</option>
            <option value="light">清淡</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">預算</label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
          >
            <option value="normal">一般</option>
            <option value="low">省錢</option>
            <option value="high">寬裕</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#AA7A50] mb-2">食材重用</label>
          <select
            value={ingredientReuse}
            onChange={(e) => setIngredientReuse(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#F8F3E8] text-[#3A2010] text-sm"
          >
            <option value="allow">允許</option>
            <option value="avoid">避免</option>
          </select>
        </div>
      </div>

      <FilterSection title="菜系" options={CUISINES} selected={cuisines} onToggle={toggleCuisine} />
      <FilterSection title="烹飪限制" options={COOKING_CONSTRAINTS} selected={cookingConstraints} onToggle={toggleConstraint} />
      <FilterSection title="排除" options={EXCLUSIONS} selected={exclusions} onToggle={toggleExclusion} variant="danger" />
    </>
  );
}
