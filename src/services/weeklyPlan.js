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
 * @returns {Object} - { dayIndex: { dayIndex, dayName, date, items: [...] } }
 */
export function groupPlanByDay(planDays) {
  if (!planDays || planDays.length === 0) return {};
  
  const grouped = {};
  
  for (const day of planDays) {
    const dayIndex = day.dayIndex ?? 0;
    const dayName = day.dayName || DAY_NAMES[dayIndex] || `Day ${dayIndex + 1}`;
    
    if (!grouped[dayIndex]) {
      grouped[dayIndex] = {
        dayIndex,
        dayName,
        date: day.date || null,
        items: []
      };
    }
    
    // Items is array of {recipe, servings, mealSlot}
    const items = day.items || [];
    for (const item of items) {
      grouped[dayIndex].items.push({
        recipeId: item.recipe?.id || null,
        recipeName: item.recipe?.name || '未知食譜',
        recipeImage: item.recipe?.image_url || null,
        servings: item.servings || 1,
        mealSlot: item.mealSlot || item.meal_slot || 'dinner',
        done: false
      });
    }
  }
  
  return grouped;
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
        // Handle both string and array formats
        const ingredients = typeof recipe.ingredients === 'string'
          ? JSON.parse(recipe.ingredients)
          : recipe.ingredients;
        
        if (!Array.isArray(ingredients)) continue;
        
        for (const ing of ingredients) {
          const name = ing.name || ing.item || '未知食材';
          
          // Parse quantity - try multiple fields
          const qtyRaw = ing.qty || ing.amount || ing.quantity || ing.qty_per_person || '1';
          const qtyNum = parseFloat(qtyRaw);
          
          if (ingredientMap.has(name)) {
            const existing = ingredientMap.get(name);
            // Aggregate if both are numbers
            if (typeof existing === 'number' && !isNaN(qtyNum)) {
              ingredientMap.set(name, existing + qtyNum);
            } else {
              // Just concatenate as fallback
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
 * Transform raw recipes to weekly plan format (multiple items per day ready)
 * 
 * @param {Array} recipes - Array of recipe objects
 * @param {number} daysCount - Number of days to generate (default 5)
 * @returns {Array} - Weekly plan: [{ dayIndex, dayName, date, items: [{recipe, servings, mealSlot}] }]
 */
export function generateWeeklyPlan(recipes, daysCount = 5) {
  if (!recipes || recipes.length === 0) return [];
  
  const shuffled = [...recipes].sort(() => 0.5 - Math.random());
  const selectedRecipes = shuffled.slice(0, daysCount);
  
  // Return structure ready for multiple items per day
  return selectedRecipes.map((recipe, index) => ({
    dayIndex: index,
    dayName: DAY_NAMES[index] || `Day ${index + 1}`,
    date: null,
    items: [
      {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          image_url: recipe.image_url,
          ingredients: recipe.ingredients || null
        },
        servings: 2,
        mealSlot: 'dinner'
      }
    ]
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
