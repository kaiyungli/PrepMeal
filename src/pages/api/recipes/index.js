import { supabaseServer as supabase } from '@/lib/supabaseServer'
import { perfNow, perfMeasure } from '@/utils/perf';

// Recommended indexes for this query (see docs/db-indexes.md):
// - idx_recipes_is_public ON recipes(is_public)
// - idx_recipes_cuisine ON recipes(cuisine)  
// - idx_recipes_difficulty ON recipes(difficulty)
// - idx_recipes_primary_protein ON recipes(primary_protein)
// - idx_recipes_cook_time ON recipes(cook_time_minutes)
// - idx_recipes_created_at ON recipes(created_at DESC)

export default async function handler(req, res) {
  const handlerStart = perfNow();
  
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    
    if (!supabase) {
      if (process.env.NODE_ENV !== 'production') console.error('Supabase not configured')
      return res.status(500).json({ error: 'Supabase is not configured' })
    }

    const { 
      search, 
      cuisine, 
      dish_type,
      maxTime, 
      difficulty,
      method,
      diet,
      protein,
      speed,
      flavor,
      budget,
      complete,
      exclusions,
      sort = 'newest',
      limit = 100, 
      offset = 0 
    } = req.query;
    
    
    // Build query safely - select only fields needed for recipe cards
    const { view } = req.query;
    const isGenerateView = view === 'generate';
    
    // Lightweight fields for generate page / planner
    const generateFields = 'id,name,description,image_url,cuisine,difficulty,method,total_time_minutes,primary_protein,protein,dish_type,diet,flavor,meal_role,is_complete_meal';
    
    const selectFields = isGenerateView
      ? generateFields
      : 'id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at';
    
    let query = supabase
      .from('recipes')
      .select(selectFields)
    
    // Always filter by public
    query = query.eq('is_public', true)
    
    // Search
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Cuisine filter - support comma-separated multi-select
    if (cuisine && cuisine !== '' && typeof cuisine === 'string') {
      const cuisineValues = cuisine.split(',').map(v => v.trim()).filter(Boolean);
      if (cuisineValues.length === 1) {
        query = query.eq('cuisine', cuisineValues[0]);
      } else if (cuisineValues.length > 1) {
        query = query.in('cuisine', cuisineValues);
      }
    }
    
    // Dish type filter
    if (dish_type && dish_type !== '' && typeof dish_type === 'string') {
      query = query.eq('dish_type', dish_type)
    }
    
    // Difficulty filter - support comma-separated multi-select
    if (difficulty && difficulty !== '' && typeof difficulty === 'string') {
      const diffValues = difficulty.split(',').map(v => v.trim()).filter(Boolean);
      if (diffValues.length === 1) {
        query = query.eq('difficulty', diffValues[0]);
      } else if (diffValues.length > 1) {
        query = query.in('difficulty', diffValues);
      }
    }
    
    // Exclusions filter - exclude recipes with these proteins
    if (exclusions && typeof exclusions === 'string') {
      const exclusionList = exclusions.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      if (exclusionList.length > 0) {
        // Use not.ilike to exclude recipes containing these proteins
        query = query.not('primary_protein', 'in', `(${exclusionList.map(e => `"${e}"`).join(',')})`);
      }
    }
    
    // Method filter - support comma-separated multi-select
    if (method && method !== '' && typeof method === 'string') {
      const methodValues = method.split(',').map(v => v.trim()).filter(Boolean);
      if (methodValues.length === 1) {
        query = query.eq('method', methodValues[0]);
      } else if (methodValues.length > 1) {
        query = query.in('method', methodValues);
      }
    }
    
    
    // Flavor filter - support comma-separated multi-select (AND logic)
    if (flavor && flavor !== '' && typeof flavor === 'string') {
      const flavorValues = flavor.split(',').map(v => v.trim()).filter(Boolean);
      if (flavorValues.length > 0) {
        // Use OR to check if recipe flavor array contains ANY of the selected flavors
        // Then require ALL selected flavors (AND logic handled in client filter)
        const flavorFilters = flavorValues.map(v => `flavor.cs.{${v}}`).join(',');
        query = query.or(flavorFilters);
      }
    }
    // Protein filter - check BOTH primary_protein AND protein array
    if (protein && protein !== '' && typeof protein === 'string') {
      const proteinValues = protein.split(',').map(v => v.trim()).filter(Boolean);
      if (proteinValues.length > 0) {
        // Build OR query with proper PostgREST syntax:
        // - primary_protein.eq.value OR protein.cs.{value}
        // cs = contains (array contains element)
        const orFilters = proteinValues.map(v => 
          `primary_protein.eq.${v},protein.cs.{${v}}`
        ).join(',');
        query = query.or(orFilters);
      }
    }
    
    // Budget filter
    if (budget && budget !== '' && typeof budget === 'string') {
      query = query.eq('budget_level', budget)
    }
    
    // Complete meal filter
    if (complete && complete !== '' && typeof complete === 'string') {
      const isComplete = complete === 'true';
      query = query.eq('is_complete_meal', isComplete)
    }
    
    // Max time filter
    if (maxTime) {
      const timeNum = parseInt(maxTime)
      if (timeNum && timeNum > 0) {
        query = query.lt('cook_time_minutes', timeNum)
      }
    }
    
    // Diet filter (array contains) - AND semantics
    // Multiple diet values require recipe to match ALL selected diets
    if (diet && diet !== '' && typeof diet === 'string') {
      const dietValues = diet.split(',').map(v => v.trim()).filter(Boolean);
      if (dietValues.length > 0) {
        query = query.contains('diet', dietValues)
      }
    }
    
    // Speed filter based on total_time_minutes
    // quick = <=20, normal = 21-40, slow = >40
    if (speed && speed !== '' && typeof speed === 'string') {
      const speedValues = speed.split(',').map(v => v.trim()).filter(Boolean);
      if (speedValues.length > 0) {
        const conditions = speedValues.map(s => {
          if (s === 'quick') return 'total_time_minutes.lte.20';
          if (s === 'normal') return 'and(total_time_minutes.gte.21,total_time_minutes.lte.40)';
          if (s === 'slow') return 'total_time_minutes.gt.40';
          return null;
        }).filter(Boolean);
        
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      }
    }
    
    // Sorting
    const safeSort = typeof sort === 'string' ? sort : 'newest'
    switch (safeSort) {
      case 'quick':
        query = query.order('total_time_minutes', { ascending: true, nullsFirst: false })
        break
      case 'high_protein':
        query = query.order('protein_g', { ascending: false, nullsFirst: false })
        break
      case 'low_calorie':
      case 'calories_low':
        query = query.order('calories_per_serving', { ascending: true, nullsFirst: false })
        break
      case 'calories_high':
        query = query.order('calories_per_serving', { ascending: false, nullsFirst: false })
        break
      case 'protein_high':
        query = query.order('protein_g', { ascending: false, nullsFirst: false })
        break
      case 'time_short':
        query = query.order('total_time_minutes', { ascending: true, nullsFirst: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }
    
    // Pagination
    const limitNum = Math.min(Math.max(parseInt(limit) || 24, 1), 100)
    const pageNum = Math.max(parseInt(req.query.page) || 1, 1)
    const offsetNum = (pageNum - 1) * limitNum
    query = query.range(offsetNum, offsetNum + limitNum - 1)
    
    const queryStart = perfNow();
    // Use count: 'exact' to get total count
    const { data: recipes, error, count } = await query
    perfMeasure('api.recipes.supabaseQuery', queryStart);


    if (error) {
      if (process.env.NODE_ENV !== 'production') // Supabase error
      return res.status(500).json({ error: error.message, details: error.message })
    }
    

    // Return recipes with total count for pagination
    const recipesList = Array.isArray(recipes) ? recipes : []
    const total = count || 0;
    
    res.status(200).json({ 
      recipes: recipesList, 
      total,
      hasMore: recipesList.length === limitNum && total > offsetNum + limitNum
    })
    perfMeasure('api.recipes.total', handlerStart);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') // Fatal error
    res.status(500).json({ error: error.message || 'Unknown error' })
  }
}
