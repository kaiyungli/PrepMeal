/**
 * Recipe API fetch service with filters and pagination
 */
export async function fetchRecipesFromAPI({
  search = '',
  cuisine = '',
  dish_type = '',
  maxTime = '',
  difficulty = '',
  method = '',
  flavor = "",
  diet = '',
  protein = '',
  speed = '',
  sort = 'newest',
  limit = 24,
  page = 1,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();
  
  if (search) params.set('search', search);
  if (cuisine) params.set('cuisine', cuisine);
  if (dish_type) params.set('dish_type', dish_type);
  if (maxTime) params.set('maxTime', maxTime);
  if (difficulty) params.set('difficulty', difficulty);
  if (method) params.set('method', method);
  if (diet) params.set('diet', diet);
  if (protein) params.set('protein', protein);
  if (speed) params.set('speed', speed);
  if (flavor) params.set("flavor", flavor);
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  if (page > 1) params.set('page', String(page));
  if (offset > 0) params.set('offset', String(offset));
  
  const url = `/api/recipes${params.toString() ? '?' + params.toString() : ''}`;
  
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch recipes: ${res.status}`);
  }
  
  const data = await res.json();
  return {
    recipes: data.recipes || [],
    total: data.total || 0
  };
}