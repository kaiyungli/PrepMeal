'use client';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateResults from '@/components/generate/GenerateResults';
import PantryChipInput from '@/components/home/PantryChipInput';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ShoppingListModal from '@/components/generate/ShoppingListModal';
import { buildShoppingList } from '@/lib/shoppingList';
import Footer from '@/components/layout/Footer';
import { useRouter } from 'next/router';
import { recommendRecipes, scoreRecipeForPlanner } from '@/lib/ingredientMatcher';
import { normalizeIngredients } from '@/lib/ingredientNormalizer';
import { planWeekAdvanced } from '@/lib/mealPlanner';

// Category mapping for shopping list
const CATEGORY_MAP = {
  meat: '肉類',
  beef: '肉類',
  pork: '肉類',
  chicken: '肉類',
  vegetable: '蔬菜',
  vegetables: '蔬菜',
  tofu: '豆腐',
  egg: '蛋類',
  eggs: '蛋類',
  seafood: '海鮮',
  shrimp: '海鮮',
  fish: '海鮮',
  other: '雜貨',
};

function getCategory(name, existingCategory) {
  if (existingCategory && existingCategory !== 'other') {
    return CATEGORY_MAP[existingCategory] || '雜貨';
  }
  // Try to infer from ingredient name
  const lower = name.toLowerCase();
  if (lower.includes('牛') || lower.includes('豬') || lower.includes('雞') || lower.includes('肉')) return '肉類';
  if (lower.includes('菜') || lower.includes('茄') || lower.includes('蔥') || lower.includes('椒')) return '蔬菜';
  if (lower.includes('蛋')) return '蛋類';
  if (lower.includes('蝦') || lower.includes('魚')) return '海鮮';
  if (lower.includes('豆腐')) return '豆腐';
  return '雜貨';
}

// Settings Options from Spec
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

// Generate dynamic week dates
const getWeekDates = () => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    days.push({
      key: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][i],
      label: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][i],
      short: ['一', '二', '三', '四', '五', '六', '日'][i],
      date: `${month}月${day}日`,
      isWeekend: i >= 5,
    });
  }
  return days;
};

const DAYS = getWeekDates();

export default function GeneratePage() {
  const router = useRouter();
  
  // Settings State
  const [daysPerWeek, setDaysPerWeek] = useState(7);
  const [dishesPerDay, setDishesPerDay] = useState(1);
  const [servings, setServings] = useState(2);
  const [dietMode, setDietMode] = useState('general');
  const [exclusions, setExclusions] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [cookingConstraints, setCookingConstraints] = useState([]);
  const [budget, setBudget] = useState('normal');
  const [ingredientReuse, setIngredientReuse] = useState('normal');
  
  // Recipe State
  const [allRecipes, setAllRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Pantry ingredients from URL
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Weekly Plan
  const [weeklyPlan, setWeeklyPlan] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {})
  );
  const [lockedSlots, setLockedSlots] = useState({}); // { 'mon-0': true }
  
  // Shopping List
  const [shoppingList, setShoppingList] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);

  useEffect(() => {
    fetch('/api/recipes?limit=500')
      .then(res => res.json())
      .then(data => {
        const recipes = data.recipes || [];
        setAllRecipes(recipes);
        setFilteredRecipes(recipes);
      })
      .catch(() => {});
  }, []);

  // Read pantry ingredients from URL
  useEffect(() => {
    const { ingredients } = router.query;
    if (ingredients) {
      const parsed = ingredients.toString().split(',').map(i => i.trim()).filter(Boolean);
      setPantryIngredients(parsed);
    }
  }, [router.query]);

  // Filter recipes based on settings
  useEffect(() => {
    let filtered = [...allRecipes];
    
    // Filter by cuisine
    if (cuisines.length > 0) {
      filtered = filtered.filter(r => cuisines.includes(r.cuisine));
    }
    
    // Filter by cooking time
    const timeConstraint = cookingConstraints.find(c => c.startsWith('under_'));
    if (timeConstraint) {
      const maxMinutes = parseInt(timeConstraint.split('_')[1]);
      filtered = filtered.filter(r => {
        const time = r.prep_time_minutes || r.cook_time_minutes || 30;
        return time <= maxMinutes;
      });
    }
    
    // Filter by difficulty
    const difficulty = cookingConstraints.find(c => ['easy', 'medium', 'hard'].includes(c));
    if (difficulty) {
      filtered = filtered.filter(r => r.difficulty === difficulty);
    }
    
    // Filter by exclusions
    if (exclusions.length > 0) {
      filtered = filtered.filter(r => {
        // Use normalized exclusion matching
        const proteinValues = [r.primary_protein, ...(r.protein || [])].filter(Boolean);
        const normProtein = proteinValues.map(p => p.toLowerCase());
        const normExclusions = exclusions.map(e => e.toLowerCase());
        return !normProtein.some(p => normExclusions.includes(p));
      });
    }
    
    // Note: Pantry now affects scoring only (not filtering)
    // This is handled in mealPlanner.ts
    
    setFilteredRecipes(filtered);
  }, [allRecipes, cuisines, cookingConstraints, exclusions, pantryIngredients]);

  const toggleExclusion = (value) => {
    setExclusions(prev => 
      prev.includes(value) 
        ? prev.filter(e => e !== value)
        : [...prev, value]
    );
  };

  const toggleCuisine = (value) => {
    setCuisines(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  };

  const toggleConstraint = (value) => {
    setCookingConstraints(prev => 
      prev.includes(value) 
        ? prev.filter(c => c !== value)
        : [...prev, value]
    );
  };

// ============================================
// PLANNER CONFIGURATION CONSTANTS
// ============================================
const CONFIG = {
  // How many days to look back for protein diversity
  PROTEIN_LOOKBACK_DAYS: 2,
  // How many days to look back for method diversity
  METHOD_LOOKBACK_DAYS: 1,
  // Whether to allow recipe repetition within the week
  RECIPE_REPEAT_ALLOWED: false,
  // Debug mode - logs selection reasoning
  DEBUG_MODE: false,
};

// Generate meal plan based on settings with balancing rules

  const handleGenerate = () => {
    // Build locked recipes map
    const lockedRecipes = {};
    Object.entries(lockedSlots).forEach(([key, isLocked]) => {
      if (isLocked && weeklyPlan[key.split('-')[0]]?.[parseInt(key.split('-')[1])]) {
        lockedRecipes[key] = weeklyPlan[key.split('-')[0]][parseInt(key.split('-')[1])];
      }
    });

    // Call the meal planner
    const newPlan = planWeekAdvanced(filteredRecipes, {
      daysPerWeek,
      dishesPerDay,
      isWeekend: (dayKey) => DAYS.find(d => d.key === dayKey)?.isWeekend || false,
      cuisines,
      exclusions,
      cookingConstraints,
      budget,
      pantryIngredients,
      lockedSlots,
      lockedRecipes
    });

    setWeeklyPlan(newPlan);
    setHasGenerated(true);
  };

  const lockSlot = (dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: true }));
  };

  const unlockSlot = (dayKey, index) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: false }));
  };

  const removeRecipe = (dayKey, index) => {
    setWeeklyPlan(prev => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes.splice(index, 1);
      return { ...prev, [dayKey]: dayRecipes };
    });
  };

  const replaceRecipe = (dayKey, index) => {
    // Get current recipes for this day to use in scoring
    const currentDayRecipes = weeklyPlan[dayKey] || [];
    const allRecipes = Object.values(weeklyPlan).flat().filter(r => r);
    
    // Score each available recipe using same logic as planner
    const scored = filteredRecipes
      .filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id))
      .map(r => {
        let score = 5; // base score
        
        // Repeat penalty - avoid recipes already in plan
        if (allRecipes.some(pr => pr.id === r.id)) {
          score -= 100;
        }
        
        // Protein diversity
        const protein = r.primary_protein || r.protein?.[0];
        const recentProteins = allRecipes.slice(-3).map(pr => pr.primary_protein || pr.protein?.[0]).filter(Boolean);
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.includes(protein)) {
            score += 2;
          } else {
            score -= 1;
          }
        }
        
        // Method diversity
        const method = r.method;
        const recentMethods = allRecipes.slice(-2).map(pr => pr.method).filter(Boolean);
        if (method && recentMethods.length > 0) {
          if (!recentMethods.includes(method)) {
            score += 1;
          } else {
            score -= 1;
          }
        }
        
        return { recipe: r, score };
      });
    
    if (scored.length === 0) return;
    
    // Sort by score and pick highest
    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0]?.recipe;
    
    if (selected) {
      setWeeklyPlan(prev => {
        const dayRecipes = [...(prev[dayKey] || [])];
        dayRecipes[index] = selected;
        return { ...prev, [dayKey]: dayRecipes };
      });
    }
  };

  // Generate shopping list - fetch full recipe details with ingredients
  const generateShoppingList = async () => {
    // Collect unique recipe IDs from weekly plan
    const recipeIds = new Set();
    Object.values(weeklyPlan).forEach(recipes => {
      (recipes || []).forEach(recipe => {
        if (recipe?.id) recipeIds.add(recipe.id);
      });
    });
    
    if (recipeIds.size === 0) {
      alert('請先生成餐單!');
      return;
    }
    
    // Fetch full recipe details
    const fetchPromises = Array.from(recipeIds).map(id => 
      fetch('/api/recipes/' + id)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .catch(err => {
          console.error('Error fetching recipe:', id, err);
          return null;
        })
    );
    
    const fullRecipes = await Promise.all(fetchPromises);
    const validRecipes = fullRecipes.filter(r => r !== null);
    
    // Use buildShoppingList to separate pantry vs toBuy
    const { pantry, toBuy } = buildShoppingList(validRecipes, pantryIngredients, servings);
    
    // Combine for modal display
    const list = [
      ...pantry.map(p => ({ ...p, inPantry: true })),
      ...toBuy.map(t => ({ ...t, inPantry: false }))
    ];
    
    setShoppingList(list);
    setShowShoppingList(true);
  };

  const clearAll = () => {
    setWeeklyPlan(DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}));
    setLockedSlots({});
  };

  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0);
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);

  return (
    <>
      <Header />
      <Head><title>今晚食乜 - 一週餐單</title></Head>
      <div className="min-h-screen bg-[#F8F3E8]">
        
        {/* Hero Header */}
        <section className='bg-[#9B6035] px-6 py-8 text-center'>
          <h1 className='text-[clamp(1.5rem,4vw,2.5rem)] font-black text-white mb-2'>
            🍽️ 一週餐單
          </h1>
          <p className='text-white/80 text-base'>
            為你安排每日晚餐，簡單方便
          </p>
        </section>

        {/* Settings Panel */}
        <GenerateSettings 
          daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
          dishesPerDay={dishesPerDay} setDishesPerDay={setDishesPerDay}
          servings={servings} setServings={setServings}
          dietMode={dietMode} setDietMode={setDietMode}
          exclusions={exclusions} toggleExclusion={toggleExclusion}
          cuisines={cuisines} toggleCuisine={toggleCuisine}
          cookingConstraints={cookingConstraints} toggleConstraint={toggleConstraint}
          budget={budget} setBudget={setBudget}
          ingredientReuse={ingredientReuse} setIngredientReuse={setIngredientReuse}
        />

        {/* Pantry Input/Display */}
        {pantryIngredients.length > 0 ? (
          <div className="max-w-[1200px] mx-auto px-4 py-3">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm text-green-800 font-medium shrink-0">已選食材：</span>
                <div className="flex-1">
                  <PantryChipInput
                    value={pantryIngredients}
                    onChange={(chips) => {
                      setPantryIngredients(chips);
                    }}
                    placeholder="輸入更多食材..."
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition shrink-0"
                >
                  重新生成
                </button>
              </div>
              {hasGenerated && (
                <div className="text-xs text-green-600 mt-2">
                  已優先使用你現有的食材生成餐單
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-[1200px] mx-auto px-4 py-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm text-gray-600 font-medium shrink-0">你已有咩食材？（可選）</span>
                <div className="flex-1">
                  <PantryChipInput
                    value={pantryIngredients}
                    onChange={(chips) => {
                      setPantryIngredients(chips);
                    }}
                    placeholder="例如: 蛋, 番茄, 雞肉..."
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={pantryIngredients.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  用食材生成餐單
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <GenerateActions 
          selectedCount={selectedCount}
          hasRecipes={hasRecipes}
          onClear={clearAll}
          onShoppingList={generateShoppingList}
          onGenerate={() => handleGenerate()}
          onSave={async () => {
            const name = prompt('輸入餐單名稱:', `餐單 ${new Date().toLocaleDateString('zh-HK')}`);
            if (!name) return;
            try {
              await fetch('/api/menus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name,
                  menu_data: {
                    daysPerWeek,
                    dishesPerDay,
                    servings,
                    weeklyPlan,
                    settings: { dietMode, exclusions, cuisines, cookingConstraints, budget, ingredientReuse }
                  }
                })
              });
              alert('已保存餐單！');
            } catch (e) {
              alert('保存失敗: ' + e.message);
            }
          }}
        />

        {/* Weekly Plan Grid */}
        <GenerateResults
          weeklyPlan={weeklyPlan}
          setWeeklyPlan={setWeeklyPlan}
          lockedSlots={lockedSlots}
          setLockedSlots={setLockedSlots}
          daysPerWeek={daysPerWeek}
          dishesPerDay={dishesPerDay}
          filteredRecipes={filteredRecipes}
          onRecipeClick={(recipe) => {
            setModalLoading(true);
            fetch('/api/recipes/' + recipe.id)
              .then(res => res.json())
              .then(setSelectedRecipe)
              .finally(() => setModalLoading(false));
          }}
        />
        {/* Shopping List Modal */}
        <ShoppingListModal 
          isOpen={showShoppingList} 
          onClose={() => setShowShoppingList(false)}
          shoppingList={shoppingList}
        />

        {/* Recipe Detail Modal */}
        <RecipeDetailModal 
          isOpen={!!selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
          recipe={selectedRecipe}
          loading={modalLoading}
        />

        <Footer />
      </div>
    </>
  );
}
