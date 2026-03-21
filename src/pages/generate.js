'use client';
import { getWeekDates, getInitialWeekPlan } from '@/utils/dateUtils';
import { useWeeklyPlanActions } from '@/hooks/useWeeklyPlanActions';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateResults from '@/components/generate/GenerateResults';
import PantryChipInput from '@/components/home/PantryChipInput';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ShoppingListModal from '@/components/generate/ShoppingListModal';
import Footer from '@/components/layout/Footer';
import { useRouter } from 'next/router';
import { planWeekAdvanced } from '@/lib/mealPlanner';

// Category mapping for shopping list

const DAYS = getWeekDates();

export default function GeneratePage() {
  const router = useRouter();
  
  // Settings State - use hook for preferences
  const {
    daysPerWeek, setDaysPerWeek,
    dishesPerDay, setDishesPerDay,
    servings, setServings,
    dietMode, setDietMode,
    budget, setBudget,
    ingredientReuse, setIngredientReuse,
    exclusions, setExclusions,
    cuisines, setCuisines,
    cookingConstraints, setCookingConstraints,
    toggleExclusion,
    toggleCuisine,
    toggleConstraint,
  } = useGeneratePreferences();
  
  // Recipe State
  const [allRecipes, setAllRecipes] = useState([]);
  
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // Pantry ingredients from URL
  const [pantryIngredients, setPantryIngredients] = useState([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Weekly Plan
  const [weeklyPlan, setWeeklyPlan] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {})
  );
  const [lockedSlots, setLockedSlots] = useState({}); // { 'mon-0': true }

  // Use weekly plan actions hook for simple actions
  const { lockSlot, unlockSlot, removeRecipe } = useWeeklyPlanActions(
    setWeeklyPlan,
    setLockedSlots
  );
  
  // Shopping List
  const [shoppingList, setShoppingList] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingListLoaded, setShoppingListLoaded] = useState(false);
  
  // Recipe detail cache (optimization)
  const recipeCache = useRef(new Map());

  // Lazy load shopping list when modal opens
  useEffect(() => {
    if (showShoppingList && !shoppingListLoaded && Object.keys(weeklyPlan).length > 0) {
      preloadShoppingList(weeklyPlan);
    }
  }, [showShoppingList, shoppingListLoaded]);

  useEffect(() => {
    // Build filter params for API (server-side filtering)
    const params = new URLSearchParams();
    params.set('limit', '100');
    
    if (cuisines.length > 0) params.set('cuisine', cuisines.join(','));
    if (cookingConstraints.length > 0) {
      const difficulty = cookingConstraints.find(c => ['easy', 'medium', 'hard'].includes(c));
      if (difficulty) params.set('difficulty', difficulty);
      const time = cookingConstraints.find(c => c.startsWith('under_'));
      if (time) params.set('maxTime', time.split('_')[1]);
    }
    if (exclusions.length > 0) params.set('exclusions', exclusions.join(','));
    
    fetch('/api/recipes?' + params.toString())
      .then(res => res.json())
      .then(data => {
        const recipes = data.recipes || [];
        setAllRecipes(recipes);
      })
      .catch(() => {});
  }, [cuisines, cookingConstraints, exclusions]);

  // Read pantry ingredients from URL
  useEffect(() => {
    const { ingredients } = router.query;
    if (ingredients) {
      const parsed = ingredients.toString().split(',').map(i => i.trim()).filter(Boolean);
      setPantryIngredients(parsed);
    }
  }, [router.query]);

  // Load heroWeeklyPlan from sessionStorage
  useEffect(() => {
    const heroPlanStr = sessionStorage.getItem('heroWeeklyPlan');
    if (heroPlanStr) {
      try {
        const heroPlan = JSON.parse(heroPlanStr);
        if (heroPlan && heroPlan.length > 0) {
          // Convert from hero format [{day, recipe}] to generate format {mon: [recipe], ...}
          const converted = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
          const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
          const dayMap = {
            '週一': 'mon', '週二': 'tue', '週三': 'wed', '週四': 'thu', '週五': 'fri',
            '週六': 'sat', '週日': 'sun', '週天': 'sun',
            'mon': 'mon', 'tue': 'tue', 'wed': 'wed', 'thu': 'thu', 'fri': 'fri', 'sat': 'sat', 'sun': 'sun'
          };
          heroPlan.forEach((item, idx) => {
            const dayKey = dayMap[item.day] || days[idx % 7];
            if (item.recipe && converted[dayKey]) {
              converted[dayKey].push(item.recipe);
            }
          });
          setWeeklyPlan(converted);
          setHasGenerated(true);
          // Shopping list loads lazily when modal opens
          sessionStorage.removeItem('heroWeeklyPlan');
        }
      } catch (e) {
        console.error('[Generate] Failed to parse hero weekly plan:', e);
      }
    }
  }, []);

  // Filter recipes based on settings (useMemo for optimization)
  const filteredRecipes = useMemo(() => {
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
    
    return filtered;
  }, [allRecipes, cuisines, cookingConstraints, exclusions]);

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

  // Preload shopping list - called after plan generation
  const preloadShoppingList = async (plan) => {
    // Collect recipe IDs from plan
    const recipeIds = [];
    Object.values(plan).forEach(recipes => {
      if (Array.isArray(recipes)) {
        recipes.forEach(r => {
          if (r?.id) recipeIds.push(r.id);
        });
      }
    });
    
    if (recipeIds.length === 0) {
      setShoppingList([]);
      setShoppingListLoaded(true);
      return;
    }
    
    try {
      // Use dedicated shopping list API for server-side aggregation
      const res = await fetch('/api/shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeIds,
          pantryIngredients,
          servings
        })
      });
      
      if (!res.ok) throw new Error('Failed to fetch shopping list');
      
      const data = await res.json();
      
      // Convert API response to shopping list format
      const list = [
        ...(data.pantry || []).map(p => ({ ...p, inPantry: true })),
        ...(data.toBuy || []).map(t => ({ ...t, inPantry: false }))
      ];
      
      setShoppingList(list);
      setShoppingListLoaded(true);
    } catch (err) {
      console.error('Error preloading shopping list:', err);
      setShoppingListLoaded(true);
    }
  };

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
    
    // Shopping list loads lazily when modal opens
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

  // Open shopping list - data already preloaded
  const generateShoppingList = () => {
    // Open modal immediately - data already in state
    // If not loaded yet, show inline loading inside modal
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
          lockedSlots={lockedSlots}
          daysPerWeek={daysPerWeek}
          dishesPerDay={dishesPerDay}
          filteredRecipes={filteredRecipes}
          onLock={lockSlot}
          onUnlock={unlockSlot}
          onRemove={removeRecipe}
          setWeeklyPlan={setWeeklyPlan}
          onRecipeClick={(recipe) => {
            // Use cache if available
            if (recipeCache.current.has(recipe.id)) {
              setSelectedRecipe(recipeCache.current.get(recipe.id));
              return;
            }
            setModalLoading(true);
            fetch('/api/recipes/' + recipe.id)
              .then(res => res.json())
              .then(data => {
                recipeCache.current.set(recipe.id, data);
                setSelectedRecipe(data);
              })
              .finally(() => setModalLoading(false));
          }}
        />
        {/* Shopping List Modal */}
        <ShoppingListModal 
          isOpen={showShoppingList} 
          onClose={() => setShowShoppingList(false)}
          shoppingList={shoppingList}
          loading={!shoppingListLoaded}
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
