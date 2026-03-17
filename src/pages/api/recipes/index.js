import { supabase } from '@/lib/supabaseClient'
import { getCanonicalIngredients } from '@/lib/ingredientNormalizer'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const { 
      search, 
      cuisine, 
      maxTime, 
      difficulty,
      method,
      diet,
      sort = 'newest',
      limit = 20, 
      offset = 0 
    } = req.query;
    
    let query = supabase
      .from('recipes')
      .select('id, name, description, image_url, cuisine, dish_type, method, speed, difficulty, protein, diet, flavor, base_servings, calories_per_serving, protein_g, carbs_g, fat_g, slug, is_public, prep_time_minutes, cook_time_minutes, created_at', { count: 'exact' });
    
    // Always filter by public
    query = query.eq('is_public', true);
    
    // Search
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Cuisine filter
    if (cuisine && cuisine !== '全部') {
      query = query.eq('cuisine', cuisine);
    }
    
    // Difficulty filter
    if (difficulty && difficulty !== '全部') {
      query = query.eq('difficulty', difficulty);
    }
    
    // Method filter
    if (method && method !== '全部') {
      query = query.ilike('method', `%${method}%`);
    }
    
    // Diet filter
    if (diet && diet !== '全部') {
      query = query.ilike('diet', `%${diet}%`);
    }
    
    // Max time filter
    if (maxTime) {
      const timeNum = parseInt(maxTime);
      if (timeNum) {
        query = query.lt('cook_time_minutes', timeNum);
      }
    }
    
    // Sorting
    switch (sort) {
      case 'popular':
        // Could add view_count column later
        query = query.order('created_at', { ascending: false });
        break;
      case 'quick':
        query = query.order('cook_time_minutes', { ascending: true });
        break;
      case 'fewest_ingredients':
        // Sort by number of ingredients (requires subquery - skip for now)
        query = query.order('created_at', { ascending: false });
        break;
      case 'high_protein':
        query = query.order('protein_g', { ascending: false, nullsFirst: false });
        break;
      case 'low_budget':
        // Could add estimated_cost column later - sort by calories as proxy
        query = query.order('calories_per_serving', { ascending: true, nullsFirst: false });
        break;
      case 'low_calorie':
        query = query.order('calories_per_serving', { ascending: true, nullsFirst: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
    }
    
    // Pagination
    const limitNum = parseInt(limit) || 20;
    const offsetNum = parseInt(offset) || 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);
    
    const { data: recipes, error, count } = await query;
    
    // Fetch ingredients for each recipe
    if (recipes && recipes.length > 0) {
      const recipeIds = recipes.map(r => r.id);
      const { data: allIngredients } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, name')
        .in('recipe_id', recipeIds);
      
      // Map ingredients to recipes
      const ingredientMap = {};
      allIngredients?.forEach(ing => {
        if (!ingredientMap[ing.recipe_id]) ingredientMap[ing.recipe_id] = [];
        ingredientMap[ing.recipe_id].push(ing.name);
      });
      
      recipes.forEach(r => {
        r.ingredients_list = ingredientMap[r.id] || [];
        r.canonical_ingredients = getCanonicalIngredients(r.ingredients_list);
      });
    }
    
    if (error) throw error

    res.status(200).json({ 
      recipes: recipes || [], 
      hasMore: (count || 0) > (offsetNum + (recipes?.length || 0))
    })
  } catch (error) {
    console.error('Recipes API error:', error)
    res.status(500).json({ error: error.message })
  }
}
