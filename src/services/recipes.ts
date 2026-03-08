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

// Filter recipes
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
