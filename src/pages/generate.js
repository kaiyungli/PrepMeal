'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import RecipeCard from '@/components/RecipeCard';
import RecipeDetailModal from '@/components/RecipeDetailModal';
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

// Generate meal plan based on settings with balancing rules
  const handleGenerate = () => {
    const newPlan = {};
    const daysToGenerate = DAYS.slice(0, daysPerWeek);
    const usedRecipeIds = new Set();
    const recentProteins = [];
    
    // Categorize recipes
    const completeMeals = filteredRecipes.filter(r => r.dish_type === 'main' || r.dish_type === 'complete');
    const sideDishes = filteredRecipes.filter(r => r.dish_type === 'side');
    
    // Helper: check if recipe uses excluded protein
    const hasExcludedProtein = (recipe) => {
      const protein = recipe.protein || [];
      return exclusions.some(ex => protein.includes(ex));
    };
    
    // Helper: check for dietary match
    const matchesDiet = (recipe) => {
      if (dietMode === 'general') return true;
      const diet = recipe.diet || [];
      if (dietMode === 'vegetarian') return diet.includes('vegetarian') || diet.includes('tofu');
      if (dietMode === 'egg_lacto') return diet.includes('vegetarian') || diet.includes('egg') || diet.includes('dairy');
      return true;
    };
    
    daysToGenerate.forEach(day => {
      const dayRecipes = [];
      
      for (let dish = 0; dish < dishesPerDay; dish++) {
        const slotKey = `${day.key}-${dish}`;
        if (lockedSlots[slotKey]) continue;
        
        let candidates;
        
        if (dishesPerDay === 1) {
          // 1 dish: use complete meals only
          candidates = completeMeals.filter(r => 
            !usedRecipeIds.has(r.id) && 
            !hasExcludedProtein(r) &&
            matchesDiet(r)
          );
        } else if (dishesPerDay === 2) {
          // 2 dishes: 1 main + 1 side
          if (dish === 0) {
            candidates = completeMeals.filter(r => 
              !usedRecipeIds.has(r.id) && 
              !hasExcludedProtein(r) &&
              matchesDiet(r)
            );
          } else {
            candidates = sideDishes.filter(r => 
              !usedRecipeIds.has(r.id) && 
              !hasExcludedProtein(r)
            );
          }
        } else {
          // 3 dishes: main + side + flexible
          if (dish === 0) {
            candidates = completeMeals.filter(r => 
              !usedRecipeIds.has(r.id) && 
              !hasExcludedProtein(r) &&
              matchesDiet(r)
            );
          } else if (dish === 1) {
            candidates = sideDishes.filter(r => 
              !usedRecipeIds.has(r.id) && 
              !hasExcludedProtein(r)
            );
          } else {
            candidates = filteredRecipes.filter(r => 
              !usedRecipeIds.has(r.id) && 
              !hasExcludedProtein(r)
            );
          }
        }
        
        // Balance: avoid same protein within 2 days
        if (recentProteins.length > 0) {
          candidates = candidates.filter(r => {
            const protein = r.protein?.[0];
            if (!protein) return true;
            return !recentProteins.slice(-2).includes(protein);
          });
        }
        
        // Shuffle for variety
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        
        if (candidates.length > 0) {
          const recipe = candidates[0];
          dayRecipes.push(recipe);
          usedRecipeIds.add(recipe.id);
          
          if (recipe.protein?.[0]) {
            recentProteins.push(recipe.protein[0]);
          }
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
        <div className="bg-white border-b border-[#DDD0B0] p-4">
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              
              {/* Days per Week */}
              <div>
                <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每週日數</label>
                <div className="flex gap-1">
                  {DAYS_PER_WEEK.map(days => (
                    <button
                      key={days}
                      onClick={() => setDaysPerWeek(days)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        daysPerWeek === days 
                          ? 'bg-[#9B6035] text-white' 
                          : 'bg-[#F8F3E8] text-[#3A2010]'
                      }`}
                    >
                      {days}日
                    </button>
                  ))}
                </div>
              </div>

              {/* Dishes per Day */}
              <div>
                <label className="block text-xs font-semibold text-[#AA7A50] mb-2">每日碟數</label>
                <div className="flex gap-1">
                  {DISHES_PER_DAY.map(dishes => (
                    <button
                      key={dishes}
                      onClick={() => setDishesPerDay(dishes)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        dishesPerDay === dishes 
                          ? 'bg-[#9B6035] text-white' 
                          : 'bg-[#F8F3E8] text-[#3A2010]'
                      }`}
                    >
                      {dishes}碟
                    </button>
                  ))}
                </div>
              </div>

              {/* Servings */}
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

              {/* Diet Mode */}
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

              {/* Budget */}
              <div>
                <label className="block text-xs font-semibold text-[#AA7A50] mb-2">預算</label>
                <div className="flex gap-1">
                  {BUDGET_OPTIONS.map(b => (
                    <button
                      key={b.value}
                      onClick={() => setBudget(b.value)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                        budget === b.value 
                          ? 'bg-[#9B6035] text-white' 
                          : 'bg-[#F8F3E8] text-[#3A2010]'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Cuisines */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#AA7A50] mb-2">菜系</label>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => toggleCuisine(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cuisines.includes(c.value)
                        ? 'bg-[#C8D49A] text-[#3A2010]'
                        : 'bg-[#F8F3E8] text-[#AA7A50]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cooking Constraints */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#AA7A50] mb-2">烹飪限制</label>
              <div className="flex flex-wrap gap-2">
                {COOKING_CONSTRAINTS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => toggleConstraint(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cookingConstraints.includes(c.value)
                        ? 'bg-[#F0A060] text-white'
                        : 'bg-[#F8F3E8] text-[#AA7A50]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#AA7A50] mb-2">排除</label>
              <div className="flex flex-wrap gap-2">
                {EXCLUSIONS.map(e => (
                  <button
                    key={e.value}
                    onClick={() => toggleExclusion(e.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      exclusions.includes(e.value)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-[#F8F3E8] text-[#AA7A50]'
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredient Reuse */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-[#AA7A50] mb-2">食材重用</label>
              <div className="flex gap-2">
                {INGREDIENT_REUSE.map(ir => (
                  <button
                    key={ir.value}
                    onClick={() => setIngredientReuse(ir.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      ingredientReuse === ir.value 
                        ? 'bg-[#9B6035] text-white' 
                        : 'bg-[#F8F3E8] text-[#3A2010]'
                    }`}
                  >
                    {ir.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white px-6 py-4 border-b border-[#DDD0B0] flex flex-wrap justify-between items-center gap-3">
          <div className='flex gap-2 items-center'>
            <span className='text-sm font-semibold text-[#3A2010]'>
              已選擇 {selectedCount} 餐
            </span>
            {hasRecipes && (
              <button
                onClick={clearAll}
                className="px-3 py-1.5 bg-transparent border border-[#DDD0B0] rounded-md text-xs text-[#AA7A50] cursor-pointer"
              >
                🗑️ 清空
              </button>
            )}
          </div>
          <div className='flex gap-2'>
            <button
              onClick={generateShoppingList}
              disabled={!hasRecipes}
              className="px-5 py-2.5 bg-[#C8D49A] text-[#3A2010] border-none rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              🛒 購物清單
            </button>
            <button
              onClick={handleGenerate}
              disabled={!filteredRecipes || filteredRecipes.length === 0}
              className="px-5 py-2.5 bg-[#F0A060] text-white border-none rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              ✨ 一鍵生成
            </button>
            <button
              onClick={async () => {
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
              disabled={!hasRecipes}
              className="px-5 py-2.5 bg-[#9B6035] text-white border-none rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              💾 保存
            </button>
          </div>
        </div>

        {/* Weekly Plan Grid */}
        <div className="max-w-[1200px] mx-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
            {DAYS.slice(0, daysPerWeek).map(day => (
              <div 
                key={day.key}
                className={`rounded-xl overflow-hidden ${
                  day.isWeekend ? 'bg-[#C8D49A]/30' : 'bg-white'
                } shadow-md`}
              >
                {/* Day Header */}
                <div className={`px-3 py-2 flex justify-between items-center ${
                  day.isWeekend ? 'bg-[#C8D49A]' : 'bg-[#9B6035]'
                }`}>
                  <div>
                    <span className="text-white font-bold text-sm">{day.label}</span>
                    <span className="text-white/70 text-xs ml-1">{day.date}</span>
                  </div>
                </div>

                {/* Recipe Slots */}
                <div className="p-2 space-y-2">
                  {Array.from({ length: dishesPerDay }).map((_, index) => {
                    const recipe = weeklyPlan[day.key]?.[index];
                    const isLocked = lockedSlots[`${day.key}-${index}`];
                    
                    return (
                      <div key={index} className="relative">
                        {recipe ? (
                          <div className="bg-[#F8F3E8] rounded-lg overflow-hidden">
                            <div 
                              className="h-20 relative cursor-pointer"
                              onClick={() => {
                                setModalLoading(true);
                                fetch('/api/recipes/' + recipe.id)
                                  .then(res => res.json())
                                  .then(setSelectedRecipe)
                                  .finally(() => setModalLoading(false));
                              }}
                            >
                              {recipe.image_url ? (
                                <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
                              ) : (
                                <div className="h-full flex items-center justify-center bg-gray-200">
                                  <span className="text-2xl">🍳</span>
                                </div>
                              )}
                              {isLocked && (
                                <div className="absolute top-1 right-1 bg-yellow-400 text-xs px-1 rounded">
                                  🔒
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <div className="text-xs font-medium text-[#3A2010] truncate">{recipe.name}</div>
                              <div className="flex gap-1 mt-1">
                                <button
                                  onClick={() => replaceRecipe(day.key, index)}
                                  className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-[#AA7A50]"
                                >
                                  替換
                                </button>
                                <button
                                  onClick={() => isLocked ? unlockSlot(day.key, index) : lockSlot(day.key, index)}
                                  className="text-[10px] px-1 py-0.5 bg-gray-200 rounded text-[#AA7A50]"
                                >
                                  {isLocked ? '解鎖' : '鎖定'}
                                </button>
                                <button
                                  onClick={() => removeRecipe(day.key, index)}
                                  className="text-[10px] px-1 py-0.5 bg-red-100 rounded text-red-600"
                                >
                                  移除
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              const available = filteredRecipes.filter(r => 
                                !weeklyPlan[day.key]?.some(pr => pr?.id === r.id)
                              );
                              if (available.length > 0) {
                                const random = available[Math.floor(Math.random() * available.length)];
                                setWeeklyPlan(prev => ({
                                  ...prev,
                                  [day.key]: [...(prev[day.key] || []), random]
                                }));
                              }
                            }}
                            className="w-full py-3 border-2 border-dashed border-[#DDD0B0] rounded-lg text-[#AA7A50] text-sm hover:border-[#9B6035] hover:text-[#9B6035] transition-colors"
                          >
                            + 添加
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shopping List Modal */}
        <Modal isOpen={showShoppingList} title="購物清單" onClose={() => setShowShoppingList(false)} maxWidth="600px">
          <div className="space-y-2">
            {shoppingList.map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-[#DDD0B0]">
                <span className="text-[#3A2010]">{item.name}</span>
                <span className="text-[#AA7A50]">{item.quantity} {item.unit || ''}</span>
              </div>
            ))}
            {shoppingList.length === 0 && (
              <p className="text-center text-[#AA7A50] py-4">暫無食材</p>
            )}
          </div>
        </Modal>

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
