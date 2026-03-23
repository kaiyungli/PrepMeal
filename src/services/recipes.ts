// Supabase client and helper functions

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Fetch all recipes
export async function fetchRecipes() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?select=*&order=id.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.json();
}

// Fetch single recipe
export async function fetchRecipe(id: number) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  return data[0] || null;
}

// Add new recipe
export async function addRecipe(recipe: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(recipe)
  });
  return res.json();
}

// Update recipe
export async function updateRecipe(id: number, updates: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updates)
  });
  return res.json();
}

// Delete recipe
export async function deleteRecipe(id: number) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  return res.ok;
}

/**
 * @deprecated Use useRecipeFilters hook + recipeMatchesFilters from @/constants/filters instead.
 * This function is kept for backward compatibility but is no longer used in the application.
 */
export function filterRecipes(recipes: any[], filters: {
  cuisine?: string;
  time?: string;
  difficulty?: string;
}) {
  let filtered = [...recipes];
  
  if (filters.cuisine && filters.cuisine !== '全部') {
    filtered = filtered.filter(r => r.cuisine === filters.cuisine);
  }
  if (filters.time && filters.time !== '全部') {
    const timeMap: Record<string, number> = { '15分鐘': 15, '30分鐘': 30, '1小時': 60 };
    const maxTime = timeMap[filters.time] || 60;
    filtered = filtered.filter(r => r.cooking_time <= maxTime);
  }
  if (filters.difficulty && filters.difficulty !== '全部') {
    filtered = filtered.filter(r => r.difficulty === filters.difficulty);
  }
  
  return filtered;
}

// Fetch full recipe with ingredients and steps
export async function getRecipeDetail(id: number | string) {
  // Fetch recipe
  const recipeRes = await fetch(`${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const recipes = await recipeRes.json();
  const recipe = recipes[0];
  
  if (!recipe) return null;
  
  // Fetch ingredients
  const ingRes = await fetch(
    `${SUPABASE_URL}/rest/v1/recipe_ingredients?recipe_id=eq.${id}&select=quantity,unit,ingredients(name)`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  const recipeIngredients = await ingRes.json();
  const ingredients = recipeIngredients.map((ri: any) => ({
    name: ri.ingredients?.name || '',
    quantity: ri.quantity,
    unit: ri.unit
  }));
  
  // Fetch steps
  const stepsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/recipe_steps?recipe_id=eq.${id}&select=step_no,text,time_seconds&order=step_no`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  const steps = await stepsRes.json();
  
  return { ...recipe, ingredients, steps };
}
