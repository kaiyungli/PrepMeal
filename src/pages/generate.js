'use client';
import GenerateActions from '@/components/generate/GenerateActions';
import GenerateSettings from '@/components/generate/GenerateSettings';
import GenerateResults from '@/components/generate/GenerateResults';
import { useState, useEffect } from 'react';
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
  
  // Weekly Plan
  const [weeklyPlan, setWeeklyPlan] = useState(
    DAYS.reduce((acc, day) => ({ ...acc, [day.key]: [] }), {})
  );
  const [lockedSlots, setLockedSlots] = useState({}); // { 'mon-0': true }
  
  // Shopping List
  const [shoppingList, setShoppingList] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);

  useEffect(() => {
    fetch('/api/recipes?limit=100')
      .then(res => res.json())
      .then(data => {
        const recipes = data.recipes || [];
        setAllRecipes(recipes);
        setFilteredRecipes(recipes);
      })
      .catch(() => {});
  }, []);

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
        const protein = r.protein || [];
        return !exclusions.some(ex => protein.includes(ex));
      });
    }
    
    setFilteredRecipes(filtered);
  }, [allRecipes, cuisines, cookingConstraints, exclusions]);

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
    const newPlan = {};
    const daysToGenerate = DAYS.slice(0, daysPerWeek);
    const usedRecipeIds = new Set();
    const recentProteins = [];
    const recentMethods = [];
    
    // Categorize recipes by meal_role (fallback to dish_type)
    const categorizeRecipe = (r) => {
      const role = r.meal_role || r.dish_type;
      if (role === 'main' || role === 'complete_meal' || role === 'complete') return 'complete';
      if (role === 'side' || role === 'veg_side') return 'side';
      if (role === 'soup') return 'soup';
      if (role === 'staple') return 'staple';
      return 'other';
    };
    
    // Filter by cuisine preferences
    const filterByCuisine = (recipes) => {
      if (!cuisines || cuisines.length === 0) return recipes;
      return recipes.filter(r => cuisines.includes(r.cuisine));
    };
    
    // Budget filtering
    const matchesBudget = (recipe) => {
      // No budget field in API, so just return true (allow all)
      // Budget filtering disabled until API adds budget_level field
      return true;
    };
    
    const categorized = {
      complete: filteredRecipes.filter(r => categorizeRecipe(r) === 'complete'),
      side: filteredRecipes.filter(r => categorizeRecipe(r) === 'side'),
      soup: filteredRecipes.filter(r => categorizeRecipe(r) === 'soup'),
      staple: filteredRecipes.filter(r => categorizeRecipe(r) === 'staple'),
      other: filteredRecipes.filter(r => categorizeRecipe(r) === 'other'),
    };
    
    // Helper: check if recipe uses excluded protein
    const hasExcludedProtein = (recipe) => {
      const protein = recipe.primary_protein || recipe.protein || [];
      return exclusions.some(ex => protein.includes(ex));
    };
    
    // Helper: check for dietary match
    const matchesDiet = (recipe) => {
      if (dietMode === 'general') return true;
      const diet = recipe.diet || [];
      if (dietMode === 'vegetarian') return diet.includes('vegetarian') || diet.includes('tofu');
      if (dietMode === 'egg_lacto') return diet.includes('vegetarian') || diet.includes('egg') || diet.includes('dairy');
      if (dietMode === 'high_protein') return diet.includes('high_protein') || diet.includes('protein');
      if (dietMode === 'low_fat') return diet.includes('low_fat') || diet.includes('light');
      return true;
    };
    
    // Helper: check cooking constraint (speed/difficulty)
    const matchesConstraint = (recipe) => {
      // Get cook time - use prep_time as proxy, map from speed
      const prepTime = recipe.prep_time_minutes || recipe.prep_time || 15;
      // Map speed to estimated cook time: quick=15, normal=30, slow=45
      let estimatedCook = 30;
      if (recipe.speed === 'quick') estimatedCook = 15;
      else if (recipe.speed === 'slow') estimatedCook = 45;
      const totalTime = prepTime + estimatedCook;
      
      // Check speed constraint - UI sends under_15, under_30, under_45
      if (cookingConstraints.includes('under_15') && totalTime > 15) return false;
      if (cookingConstraints.includes('under_30') && totalTime > 30) return false;
      if (cookingConstraints.includes('under_45') && totalTime > 45) return false;
      
      // Difficulty constraint - UI sends easy, medium, hard
      if (cookingConstraints.includes('easy') && recipe.difficulty !== 'easy') return false;
      if (cookingConstraints.includes('medium') && recipe.difficulty === 'hard') return false;
      
      // Method constraint - UI sends one_pot, air_fryer
      if (cookingConstraints.includes('one_pot') && recipe.method !== 'one_pot') return false;
      if (cookingConstraints.includes('air_fryer') && recipe.method !== 'air_fryer') return false;
      
      return true;
    };
    
    // Helper: filter candidates by all rules
    const filterCandidates = (candidates, isWeekend = false) => {
      const before = candidates.length;
      const filtered = candidates.filter(r => {
        // Check cuisine
        if (cuisines?.length > 0 && !cuisines.includes(r.cuisine)) return false;
        // Check exclusions
        const protein = r.primary_protein || r.protein?.[0];
        if (exclusions?.length > 0 && protein && exclusions.includes(protein)) return false;
        // Diet check
        if (dietMode !== 'general') {
          const diet = r.diet || [];
          if (dietMode === 'vegetarian' && !diet.includes('vegetarian') && !diet.includes('tofu')) return false;
        }
        return true;
      });
      return filtered;
    };
    
    // Helper: get candidates with smart fallbacks
    const getCandidatesWithFallback = (primary, fallbacks, isWeekend = false) => {
      // Try primary category first
      let candidates = filterCandidates(primary, isWeekend);
      
      // Fallback chain: if not enough, try each fallback category
      for (const fallback of fallbacks) {
        if (candidates.length >= 2) break; // Good enough
        const fallbackCandidates = filterCandidates(fallback, isWeekend);
        candidates = [...candidates, ...fallbackCandidates];
      }
      
      // If still not enough, try all other recipes
      if (candidates.length < 2) {
        const allFiltered = filterCandidates(filteredRecipes, isWeekend);
        candidates = [...candidates, ...allFiltered];
      }
      
      // Shuffle for variety
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      return candidates;
    };
    
    // Helper: score candidates instead of filtering
    const scoreCandidates = (candidates, isWeekend = false) => {
      if (candidates.length === 0) return candidates;
      
      const scored = candidates.map(r => {
        let score = 0;
        const breakdown = {};
        
        // +2 if protein not recently used (protein diversity)
        const protein = r.primary_protein || r.protein?.[0];
        if (protein && recentProteins.length > 0) {
          if (!recentProteins.slice(-CONFIG.PROTEIN_LOOKBACK_DAYS).includes(protein)) {
            score += 2;
            breakdown.protein_diversity = '+2';
          } else {
            score -= 1;
            breakdown.protein_same = '-1';
          }
        }
        
        // +1 if method adds variety, -1 penalty if same
        const method = r.method;
        if (method && recentMethods.length > 0) {
          if (!recentMethods.slice(-CONFIG.METHOD_LOOKBACK_DAYS).includes(method)) {
            score += 1;
            breakdown.method_variety = '+1';
          } else {
            score -= 1;
            breakdown.method_same = '-1';
          }
        }
        
        // +1 if speed matches weekday preference
        const speed = r.speed || 'normal';
        if (!isWeekend) {
          if (speed === 'quick') {
            score += 1;
            breakdown.speed_quick = '+1';
          } else if (speed === 'normal') {
            score += 0.5;
            breakdown.speed_normal = '+0.5';
          } else if (speed === 'slow') {
            score -= 2;
            breakdown.speed_slow = '-2';
          }
        }
        
        // +1 if difficulty matches weekday preference
        const difficulty = r.difficulty || 'medium';
        if (!isWeekend) {
          if (difficulty === 'easy') {
            score += 1;
            breakdown.difficulty_easy = '+1';
          } else if (difficulty === 'hard') {
            score -= 0.5;
            breakdown.difficulty_hard = '-0.5';
          }
        }
        
        // Budget awareness: prefer budget recipes when in budget mode
        if (budget && budget !== 'any') {
          const recipeBudget = r.budget_level || 'medium';
          if (budget === 'low' && recipeBudget === 'low') {
            score += 1;
            breakdown.budget_match = '+1';
          }
          if (budget === 'medium' && (recipeBudget === 'low' || recipeBudget === 'medium')) {
            score += 0.5;
            breakdown.budget_ok = '+0.5';
          }
          if (budget === 'low' && recipeBudget !== 'low') {
            score -= 0.5;
            breakdown.budget_expensive = '-0.5';
          }
        }
        
        // Variety bonus
        if (recentProteins.length > 3 && protein) {
          const uniqueProteins = new Set(recentProteins.slice(-4));
          if (!uniqueProteins.has(protein)) {
            score += 0.5;
            breakdown.variety_bonus = '+0.5';
          }
        }
        
        // Store debug info on recipe
        const debugInfo = {
          recipe: r,
          score,
          breakdown,
          protein,
          method,
          speed,
          difficulty,
          budget_level: r.budget_level,
        };
        
        if (CONFIG.DEBUG_MODE) {
          console.log(`[SCORING] ${r.name}: score=${score}`, breakdown);
        }
        
        return debugInfo;
      });
      
      // Sort by score (highest first), then shuffle equal scores for variety
      scored.sort((a, b) => b.score - a.score);
      
      // Shuffle top candidates with same score for randomness
      const topScore = scored[0]?.score || 0;
      const topCandidates = scored.filter(s => s.score === topScore);
      for (let i = topCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
      }
      
      // Rebuild list with shuffled top, then rest
      const rest = scored.filter(s => s.score < topScore);
      return [...topCandidates, ...rest].map(s => s.recipe);
    };
    
    // Helper: speed/difficulty based on weekday vs weekend
    const matchesSpeedDifficulty = (recipe, isWeekend) => {
      const speed = recipe.speed || 'normal';
      const difficulty = recipe.difficulty || 'medium';
      
      // Weekdays: prefer quick/normal, allow medium/hard only if needed
      if (!isWeekend) {
        // For weekdays, prefer quick recipes
        if (speed === 'slow') {
          // Only allow slow on Friday/Saturday nights (rare)
          return false;
        }
        if (difficulty === 'hard') {
          // Hard dishes on weekdays are okay if needed
          return true;
        }
      }
      // Weekends: allow everything
      return true;
    };
    
    // Helper: shuffle array
    const shuffle = (arr) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    daysToGenerate.forEach(day => {
      const dayRecipes = [];
      const isWeekend = day.isWeekend || false;
      
      for (let dish = 0; dish < dishesPerDay; dish++) {
        const slotKey = `${day.key}-${dish}`;
        if (lockedSlots[slotKey]) continue;
        
        let candidates = [];
        
        // Rule-based selection with smart fallbacks
        if (dishesPerDay === 1) {
          // 1 dish: complete meal only
          candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
        } else if (dishesPerDay === 2) {
          // 2 dishes: main + side (or soup/staple)
          if (dish === 0) {
            candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
          } else {
            // Prefer sides, fallback to soup/staple/other
            candidates = getCandidatesWithFallback(
              [...categorized.side],
              [...categorized.soup, ...categorized.staple, ...categorized.other],
              isWeekend
            );
          }
        } else {
          // 3 dishes: complete + side + flexible
          if (dish === 0) {
            candidates = getCandidatesWithFallback(categorized.complete, [categorized.other], isWeekend);
          } else if (dish === 1) {
            // Prefer veg_side, fallback to soup/staple
            candidates = getCandidatesWithFallback(
              [...categorized.side, ...categorized.soup],
              [...categorized.staple, ...categorized.other],
              isWeekend
            );
          } else {
            // Flexible: anything not used
            candidates = getCandidatesWithFallback(filteredRecipes, [], isWeekend);
          }
        }
        
        // Apply scoring to rank candidates by diversity
        candidates = scoreCandidates(candidates, isWeekend);
        
        // Select top candidate with reason tracking
        if (candidates.length > 0) {
          const recipe = candidates[0];
          const reason = recipe._selectionReason || 'Best score';
          
          // Track for balancing
          const protein = recipe.primary_protein || recipe.protein?.[0];
          if (protein) recentProteins.push(protein);
          
          const method = recipe.method;
          if (method) recentMethods.push(method);
          
          // Add selection to plan
          dayRecipes.push(recipe);
          usedRecipeIds.add(recipe.id);
        }
      }
      
      newPlan[day.key] = dayRecipes;
    });
    
    setWeeklyPlan(newPlan);
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
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id));
    if (available.length === 0) return;
    
    const random = available[Math.floor(Math.random() * available.length)];
    setWeeklyPlan(prev => {
      const dayRecipes = [...(prev[dayKey] || [])];
      dayRecipes[index] = random;
      return { ...prev, [dayKey]: dayRecipes };
    });
  };

  // Generate shopping list - fetch full recipe details with ingredients
  const generateShoppingList = async () => {
    const allIngredients = {};
    const recipeIds = new Set();
    
    // Collect unique recipe IDs
    Object.values(weeklyPlan).forEach(recipes => {
      (recipes || []).forEach(recipe => {
        if (recipe?.id) recipeIds.add(recipe.id);
      });
    });
    
    // Fetch full recipe details for each
    const fetchPromises = Array.from(recipeIds).map(id => 
      fetch('/api/recipes/' + id).then(res => res.json())
    );
    
    const fullRecipes = await Promise.all(fetchPromises);
    
    // Process ingredients
    fullRecipes.forEach(recipe => {
      if (recipe?.ingredients) {
        const scale = servings / (recipe.base_servings || 1);
        recipe.ingredients.forEach(ing => {
          const name = ing.name || 'Unknown';
          const qty = (ing.quantity || 1) * scale;
          const category = 'other'; // TODO: use ingredients.shopping_category
          
          const key = `${name}-${category}`;
          if (allIngredients[key]) {
            allIngredients[key].quantity += qty;
          } else {
            allIngredients[key] = { name, quantity: qty, category };
          }
        });
      }
    });
    
    setShoppingList(Object.values(allIngredients));
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
