'use client';
import { getWeekDates } from '@/utils/dateUtils';
import { perfNow, perfMeasure } from '@/utils/perf';
import { useWeeklyPlanActions } from '@/hooks/useWeeklyPlanActions';
import { fetchAvailableRecipes, saveGeneratedPlan, buildSavePayload, fetchGeneratedPlanShoppingList } from '@/features/generate';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateResults from '@/components/generate/GenerateResults';
import { useState, useEffect, useRef, useMemo } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';
import { UI } from '@/styles/ui';
import { COMPOSITION_CONFIG } from '@/constants/composition';
import { useGeneratePreferences } from '@/hooks/useGeneratePreferences';
import { useAuth } from '@/hooks/useAuth';

import Head from 'next/head';
import Header from '@/components/layout/Header';
import RecipeDetailModal from '@/components/RecipeDetailModal';
import ShoppingListModal from '@/components/generate/ShoppingListModal';
import Footer from '@/components/layout/Footer';
import { useRouter } from 'next/router';
import { planWeekAdvanced } from '@/lib/mealPlanner';
import { getMaxTimeFromSpeedFilters } from '@/utils/generateTimeMapping';



// Category mapping for shopping list

const DAYS = getWeekDates();

export default function GeneratePage() {
  const router = useRouter();
  
  // Settings State - use hook for preferences
  const {
    daysPerWeek, setDaysPerWeek,
    dishesPerDay, setDishesPerDay, dailyComposition, setDailyComposition, allowCompleteMeal, setAllowCompleteMeal,
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
    clearFilters,
    filters, // NEW: derived unified filters
    setFilters, // NEW: setter for unified filters
  } = useGeneratePreferences();
  
  // Use centralized composition config
  const compositionKey = dailyComposition || 'meat_veg';
  const compositionConfig = COMPOSITION_CONFIG[compositionKey] || COMPOSITION_CONFIG.meat_veg;
  const effectiveDishesPerDay = compositionConfig.dishesPerDay;
  
  // Auth for save functionality
  const { isAuthenticated, getAccessToken } = useAuth();
  const [saveNotice, setSaveNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Explicit day index mapping for deterministic day_index
  const DAY_INDEX_MAP = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  
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

  // Derived: check if any unified filters are active (for UI/analytics)

  // Lazy load shopping list when modal opens
  useEffect(() => {
    if (showShoppingList && !shoppingListLoaded && Object.keys(weeklyPlan).length > 0) {
      preloadShoppingList(weeklyPlan);
    }
  }, [showShoppingList, shoppingListLoaded]);

  // Fetch base recipes once on mount (no refetch on filter changes)
  useEffect(() => {
    fetchAvailableRecipes(200)
      .then(recipes => setAllRecipes(recipes))
      .catch(() => {});
  }, []);
  
  // Compute locally filtered recipes from base dataset
  // This runs on every filter change but uses cached allRecipes - no network request
  const filteredRecipes = useMemo(() => {
    if (!allRecipes.length) return [];
    
    // Build filter object for recipeMatchesFilters
    const filterObj = { ...filters };
    
    // Apply exclusions as negative filter
    const result = allRecipes.filter(recipe => {
      // Check exclusions first (negative filter)
      if (exclusions.length > 0) {
        const recipeProteins = [recipe.primary_protein, ...(recipe.protein || [])].filter(Boolean);
        const hasExcludedProtein = recipeProteins.some(p => exclusions.includes(p));
        if (hasExcludedProtein) return false;
      }
      
      // Apply positive filters
      if (!recipeMatchesFilters(recipe, filterObj)) return false;
      
      return true;
    });
    
    return result;
  }, [allRecipes, filters, exclusions]);

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

  // ============================================
// PLANNER CONFIGURATION CONSTANTS
// ============================================

// Generate meal plan based on settings with balancing rules

  // Preload shopping list - called after plan generation
  const preloadShoppingList = async (plan) => {
    try {
      const list = await fetchGeneratedPlanShoppingList(plan, pantryIngredients, servings);
      setShoppingList(list);
      setShoppingListLoaded(true);
    } catch (err) {
      console.error('Error preloading shopping list:', err);
      setShoppingListLoaded(true);
    }
  };

  const handleGenerate = () => {
    const genStart = perfNow();
    // Build locked recipes map
    const lockedRecipes = {};
    Object.entries(lockedSlots).forEach(([key, isLocked]) => {
      if (isLocked && weeklyPlan[key.split('-')[0]]?.[parseInt(key.split('-')[1])]) {
        lockedRecipes[key] = weeklyPlan[key.split('-')[0]][parseInt(key.split('-')[1])];
      }
    });

    const slotRoles = compositionConfig.slotRoles;

    const plannerStart = perfNow();
    // Call the meal planner
    const newPlan = planWeekAdvanced(filteredRecipes, {
      daysPerWeek,
      dishesPerDay: effectiveDishesPerDay,
      slotRoles,
      dailyComposition,
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
    perfMeasure('generate.handleGenerate.planWeekAdvanced', plannerStart);
    perfMeasure('generate.handleGenerate.total', genStart);
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
    // Reset planning settings to defaults
    setDaysPerWeek(7);
    setDishesPerDay(2); // Legacy - keep for compatibility
    setDailyComposition('meat_veg');
    setAllowCompleteMeal(true); // Reset checkbox to default
    setServings(2);
    
    // Reset all filters
    clearFilters();
    
    // Reset generate page transient state
    setWeeklyPlan(DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {}));
    setLockedSlots({});
    setHasGenerated(false);
    setShoppingList([]);
    setShoppingListLoaded(false);
    setShowShoppingList(false);
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
          dailyComposition={dailyComposition} setDailyComposition={setDailyComposition}
          allowCompleteMeal={allowCompleteMeal} setAllowCompleteMeal={setAllowCompleteMeal}
          servings={servings} setServings={setServings}
          filters={filters}
          setFilters={setFilters}
          onClearAll={clearAll}
        />

        {/* Action Bar */}
        
        <GenerateActions 
          isSaving={isSaving}
          selectedCount={selectedCount}
          hasRecipes={hasRecipes}
          onClear={clearAll}
          onShoppingList={generateShoppingList}
          onGenerate={() => handleGenerate()}
          onSave={async () => {
            if (isSaving) return;
            // Check auth first
            if (!isAuthenticated) {
              alert('請先登入以保存餐單');
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
              return;
            }
            const name = `${servings}人 ${daysPerWeek}日餐單 ${new Date().toLocaleDateString('zh-HK')}`;
            if (!name) return;
            
            // Build save payload using service
            const payload = buildSavePayload(weeklyPlan, servings, daysPerWeek);
            
            if (payload.items.length === 0) {
              alert('沒有餐單內容可以保存');
              return;
            }
            
            // Get token and verify before sending request
            const token = await getAccessToken();
            if (!token) {
              alert('登入狀態已失效，請重新登入');
              window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
              return;
            }
            
            try {
              setIsSaving(true);
              const result = await saveGeneratedPlan(payload, token);
              if (!result.success) throw new Error(result.error);
              setSaveNotice(`✅ 已保存餐單：${payload.name}`);
              setTimeout(() => setSaveNotice(''), 3000);
            } catch (e) {
              alert('保存失敗: ' + e.message);
            } finally {
              setIsSaving(false);
            }
          }}
        />

        {/* Weekly Plan Grid */}
        <GenerateResults
          weeklyPlan={weeklyPlan}
          lockedSlots={lockedSlots}
          daysPerWeek={daysPerWeek}
          dishesPerDay={effectiveDishesPerDay}
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
        {saveNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className={UI.notice}>
              <span className="text-[var(--color-primary)]">✓</span>
              <span className="font-medium text-[var(--color-text-primary)]">{saveNotice}</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
