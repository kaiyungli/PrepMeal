'use client';
import { getWeekDates } from '@/utils/dateUtils';
import { perfNow, perfMeasure } from '@/utils/perf';
import { useWeeklyPlanActions } from '@/hooks/useWeeklyPlanActions';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateResults from '@/components/generate/GenerateResults';
import { useState, useEffect, useRef, useMemo } from 'react';
import { recipeMatchesFilters } from '@/constants/filters';
import { UI } from '@/styles/ui';
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
    dishesPerDay, setDishesPerDay, dailyComposition, setDailyComposition,
  // Derived dishesPerDay from composition
  const effectiveDishesPerDay = dailyComposition === 'complete_meal' ? 1 : dailyComposition === 'meat_veg_soup' ? 3 : 2;

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
    const t0 = perfNow();
    fetch('/api/recipes?limit=200&view=generate')
      .then(res => res.json())
      .then(data => {
        perfMeasure('generate.recipesFetch', t0);
        const recipes = data.recipes || [];
        setAllRecipes(recipes);
      })
      .catch(() => {});
  }, []); // Empty deps = run once on mount
  
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
    const preloadStart = perfNow();
    
    // Collect recipe IDs from plan
    const recipeIds = [];
    Object.values(plan).forEach(recipes => {
      if (Array.isArray(recipes)) {
        recipes.forEach(r => {
          if (r?.id) recipeIds.push(r.id);
        });
      }
    });
    
    // Debug logs
    console.log('[generate] shoppingList start:', {
      recipeIdsCount: recipeIds.length,
      pantryCount: pantryIngredients.length,
      servings: servings
    });
    
    if (recipeIds.length === 0) {
      setShoppingList([]);
      setShoppingListLoaded(true);
      perfMeasure('generate.preloadShoppingList.total', preloadStart);
      return;
    }
    
    try {
      const fetchStart = perfNow();
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
      perfMeasure('generate.shoppingList.fetch', fetchStart);
      console.log('[generate] shoppingList response:', {
        pantryItems: data.pantry?.length || 0,
        toBuyItems: data.data?.toBuy?.length || 0,
        total: data.data?.items?.length || 0
      });
      
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
    const genStart = perfNow();
    // Build locked recipes map
    const lockedRecipes = {};
    Object.entries(lockedSlots).forEach(([key, isLocked]) => {
      if (isLocked && weeklyPlan[key.split('-')[0]]?.[parseInt(key.split('-')[1])]) {
        lockedRecipes[key] = weeklyPlan[key.split('-')[0]][parseInt(key.split('-')[1])];
      }
    });

    // Composition mapping - dailyComposition is the source of truth
    const COMPOSITION_MAP = {
      'complete_meal': { slotRoles: ['complete_meal'], dishesPerDay: 1 },
      'meat_veg': { slotRoles: ['protein_main', 'veg_side'], dishesPerDay: 2 },
      'meat_veg_soup': { slotRoles: ['protein_main', 'veg_side', 'soup'], dishesPerDay: 3 }
    };
    const composition = COMPOSITION_MAP[dailyComposition] || COMPOSITION_MAP['meat_veg'];
    const slotRoles = composition.slotRoles;
