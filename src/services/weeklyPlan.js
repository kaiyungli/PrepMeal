/**
 * Weekly Plan Service - Reusable weekly plan data transformation
 * 
 * Pattern similar to shoppingList.js
 * NO Supabase import - pure business logic
 */

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

/**
 * Group weekly plan items by day
 * 
 * @param {Array} planDays - Array of day objects with items: [{recipe, servings, mealSlot}]
 * @returns {Array} - [{ dayIndex, dayName, date, items: [...] }] sorted by dayIndex
 */
export function groupPlanByDay(planDays) {
  if (!planDays || planDays.length === 0) return [];
  
  // Sort by dayIndex and return array
  const sorted = [...planDays].sort((a, b) => (a.dayIndex || 0) - (b.dayIndex || 0));
  
  return sorted.map(day => ({
    dayIndex: day.dayIndex ?? 0,
    dayName: day.dayName || DAY_NAMES[day.dayIndex] || `Day ${day.dayIndex + 1}`,
    date: day.date || null,
    items: (day.items || []).map(item => ({
      recipeId: item.recipe?.id || null,
      recipeName: item.recipe?.name || '未知食譜',
      recipeImage: item.recipe?.image_url || null,
      servings: item.servings || 1,
      mealSlot: item.mealSlot || item.meal_slot || 'dinner',
      done: false
    }))
  }));
}

/**
 * Transform raw recipes to weekly plan format (multiple items per day ready)
 * 
 * @param {Array} recipes - Array of recipe objects
 * @param {number} daysCount - Number of days to generate (default 5)
 * @param {number} itemsPerDay - Number of meals per day (default 2)
 * @returns {Array} - Weekly plan: [{ dayIndex, dayName, date, items: [...] }]
 */
export function generateWeeklyPlan(recipes, daysCount = 5, itemsPerDay = 2) {
  if (!recipes || recipes.length === 0) return [];
  
  const shuffled = [...recipes].sort(() => 0.5 - Math.random());
  const selectedRecipes = shuffled.slice(0, daysCount * itemsPerDay);
  
  // Return structure with multiple items per day
  const mealSlots = ['lunch', 'dinner'];
  
  const result = [];
  for (let i = 0; i < daysCount; i++) {
    const dayItems = [];
    for (let j = 0; j < itemsPerDay; j++) {
      const recipeIdx = i * itemsPerDay + j;
      if (recipeIdx < selectedRecipes.length) {
        const recipe = selectedRecipes[recipeIdx];
        dayItems.push({
          recipe: {
            id: recipe.id,
            name: recipe.name,
            image_url: recipe.image_url,
            ingredients: recipe.ingredients || null
          },
          servings: 2,
          mealSlot: mealSlots[j % mealSlots.length]
        });
      }
    }
    
    result.push({
      dayIndex: i,
      dayName: DAY_NAMES[i] || `Day ${i + 1}`,
      date: null,
      items: dayItems
    });
  }
  
  return result;
}

/**
 * Build shopping list from weekly plan recipes
 * 
 * @param {Array} planDays - Array of day objects with items: [{recipe: {ingredients}}]
 * @returns {Array} - Aggregated ingredients [{ name, qty }]
 */
export function buildShoppingListFromPlan(planDays) {
  if (!planDays || planDays.length === 0) return [];
  
  const ingredientMap = new Map();
  
  for (const day of planDays) {
    const items = day.items || [];
    
    for (const item of items) {
      const recipe = item.recipe;
      
      if (!recipe?.ingredients) continue;
      
      try {
        const ingredients = typeof recipe.ingredients === 'string'
          ? JSON.parse(recipe.ingredients)
          : recipe.ingredients;
        
        if (!Array.isArray(ingredients)) continue;
        
        for (const ing of ingredients) {
          const name = ing.name || ing.item || '未知食材';
          
          const qtyRaw = ing.qty || ing.amount || ing.quantity || ing.qty_per_person || '1';
          const qtyNum = parseFloat(qtyRaw);
          
          if (ingredientMap.has(name)) {
            const existing = ingredientMap.get(name);
            if (typeof existing === 'number' && !isNaN(qtyNum)) {
              ingredientMap.set(name, existing + qtyNum);
            } else {
              ingredientMap.set(name, `${existing}+${qtyRaw}`);
            }
          } else {
            ingredientMap.set(name, !isNaN(qtyNum) ? qtyNum : qtyRaw);
          }
        }
      } catch (e) {
        // Skip invalid ingredients
      }
    }
  }
  
  return Array.from(ingredientMap.entries()).map(([name, qty]) => ({
    name,
    qty: typeof qty === 'number' ? Math.round(qty * 100) / 100 : qty
  }));
}

/**
 * Get meal type label
 * 
 * @param {string} slot - Meal slot (breakfast/lunch/dinner)
 * @returns {string} - Chinese label
 */
export function getMealLabel(slot) {
  const labels = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐'
  };
  return labels[slot] || '晚餐';
}
