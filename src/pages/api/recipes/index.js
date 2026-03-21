import { supabase } from '@/lib/supabaseClient'

// Recommended indexes for this query (see docs/db-indexes.md):
// - idx_recipes_is_public ON recipes(is_public)
// - idx_recipes_cuisine ON recipes(cuisine)  
// - idx_recipes_difficulty ON recipes(difficulty)
// - idx_recipes_primary_protein ON recipes(primary_protein)
// - idx_recipes_cook_time ON recipes(cook_time_minutes)
// - idx_recipes_created_at ON recipes(created_at DESC)

export default async function handler(req, res) {
  
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    
    if (!supabase) {
      console.error('[API] Supabase not configured')
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
      budget,
      complete,
      exclusions,
      sort = 'newest',
      limit = 100, 
      offset = 0 
    } = req.query;
    
    
    // Build query safely - select only fields needed for recipe cards
    let query = supabase
      .from('recipes')
      .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,cook_time_minutes,prep_time_minutes,calories_per_serving,protein_g,carbs_g,fat_g,primary_protein,protein,dish_type,diet,description,is_public,created_at', { count: 'exact' })
    
    // Always filter by public
    query = query.eq('is_public', true)
    
    // Search
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Cuisine filter
    if (cuisine && cuisine !== '' && typeof cuisine === 'string') {
      query = query.eq('cuisine', cuisine)
    }
    
    // Dish type filter
    if (dish_type && dish_type !== '' && typeof dish_type === 'string') {
      query = query.eq('dish_type', dish_type)
    }
    
    // Difficulty filter
    if (difficulty && difficulty !== '' && typeof difficulty === 'string') {
      query = query.eq('difficulty', difficulty)
    }
    
    // Exclusions filter - exclude recipes with these proteins
    if (exclusions && typeof exclusions === 'string') {
      const exclusionList = exclusions.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      if (exclusionList.length > 0) {
        // Use not.ilike to exclude recipes containing these proteins
        query = query.not('primary_protein', 'in', `(${exclusionList.map(e => `"${e}"`).join(',')})`);
      }
    }
    
    // Method filter
    if (method && method !== '' && typeof method === 'string') {
      query = query.eq('method', method)
    }
    
    // Protein filter (primary_protein)
    if (protein && protein !== '' && typeof protein === 'string') {
      query = query.eq('primary_protein', protein)
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
    
    // Diet filter (array contains)
    if (diet && diet !== '' && typeof diet === 'string') {
      // Diet is an array column, use contains
      const dietValues = diet.split(',');
      query = query.contains('diet', dietValues)
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
    const limitNum = Math.min(Math.max(parseInt(limit) || 100, 1), 100)
    const offsetNum = Math.max(parseInt(offset) || 0, 0)
    query = query.range(offsetNum, offsetNum + limitNum - 1)
    
    const { data: recipes, error } = await query


    if (error) {
      console.error('[API] Supabase error:', error)
      return res.status(500).json({ error: error.message, details: error.message })
    }
    

    // Return recipes
    const recipesList = Array.isArray(recipes) ? recipes : []
    
    res.status(200).json({ 
      recipes: recipesList, 
      hasMore: (recipesList.length) > offsetNum + limitNum
    })
  } catch (error) {
    console.error('[API] Fatal error:', error)
    res.status(500).json({ error: error.message || 'Unknown error' })
  }
}
