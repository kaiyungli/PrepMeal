// Generate page settings panel - unified with recipes page design language
import { useState } from 'react';
import GenerateFilterShell from './GenerateFilterShell';
import { CUISINES, COOKING_CONSTRAINTS, EXCLUSIONS, DIET_MODES } from '@/constants/filters';

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
  pantryIngredients: string[];
  setPantryIngredients: (v: string[]) => void;
  onClearAll?: () => void;
}

export default function GenerateSettings({ 
  daysPerWeek, setDaysPerWeek,
  dishesPerDay, setDishesPerDay,
  servings, setServings,
  dietMode, setDietMode,
  exclusions, toggleExclusion,
  cuisines, toggleCuisine,
  cookingConstraints, toggleConstraint,
  budget, setBudget,
  ingredientReuse, setIngredientReuse,
  pantryIngredients, setPantryIngredients,
  onClearAll
}: GenerateSettingsProps) {
  const [pantryInput, setPantryInput] = useState(pantryIngredients.join(', '));

  const handlePantryChange = (value: string) => {
    setPantryInput(value);
  };

  const handlePantryBlur = () => {
    const ingredients = pantryInput
      .split(',')
      .map(i => i.trim())
      .filter(Boolean);
    setPantryIngredients(ingredients);
  };

  // Build filter sections for the shared shell
  const filterSections = [
    {
      id: 'diet',
      title: '飲食模式',
      options: DIET_MODES.map(d => ({ value: d.value, label: d.label })),
      selected: [dietMode],
      onToggle: (v: string) => setDietMode(v)
    },
    {
      id: 'budget',
      title: '預算',
      options: [
        { value: 'normal', label: '普通' },
        { value: 'low', label: '省錢' },
        { value: 'high', label: '寬裕' }
      ],
      selected: [budget],
      onToggle: (v: string) => setBudget(v)
    },
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
    {
      id: 'cuisine',
      title: '菜系',
      options: CUISINES.map(c => ({ value: c.value, label: c.label })),
      selected: cuisines,
      onToggle: toggleCuisine
    },
    {
      id: 'constraints',
      title: '烹飪限制',
      options: COOKING_CONSTRAINTS.map(c => ({ value: c.value, label: c.label })),
      selected: cookingConstraints,
      onToggle: toggleConstraint
    },
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
        <GenerateFilterShell
          planning={{
            daysPerWeek,
            setDaysPerWeek,
            dishesPerDay,
            setDishesPerDay,
            servings,
            setServings
          }}
          filterSections={filterSections}
          pantryValue={pantryInput}
          onPantryChange={handlePantryChange}
          onClear={onClearAll}
        />
      </div>
    </div>
  );
}
