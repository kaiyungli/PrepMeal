import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    console.log('[RECIPES API] Starting...')
    
    if (!supabase) {
      console.error('[RECIPES API] Supabase not configured')
      return res.status(500).json({ error: 'Supabase is not configured' })
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
    
    console.log('[RECIPES API] Params:', { cuisine, difficulty, maxTime, sort })
    
    // Build query safely
    let query = supabase
      .from('recipes')
      .select('*', { count: 'exact' })
    
    // Always filter by public
    query = query.eq('is_public', true)
    
    // Search
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Cuisine filter
    if (cuisine && cuisine !== '全部' && typeof cuisine === 'string') {
      query = query.eq('cuisine', cuisine)
    }
    
    // Difficulty filter
    if (difficulty && difficulty !== '全部' && typeof difficulty === 'string') {
      query = query.eq('difficulty', difficulty)
    }
    
    // Max time filter
    if (maxTime) {
      const timeNum = parseInt(maxTime)
      if (timeNum && timeNum > 0) {
        query = query.lt('cook_time_minutes', timeNum)
      }
    }
    
    // Sorting
    const safeSort = typeof sort === 'string' ? sort : 'newest'
    switch (safeSort) {
      case 'quick':
        query = query.order('cook_time_minutes', { ascending: true })
        break
      case 'high_protein':
        query = query.order('protein_g', { ascending: false, nullsFirst: false })
        break
      case 'low_calorie':
      case 'low_budget':
        query = query.order('calories_per_serving', { ascending: true, nullsFirst: false })
        break
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false })
    }
    
    // Pagination
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100)
    const offsetNum = Math.max(parseInt(offset) || 0, 0)
    query = query.range(offsetNum, offsetNum + limitNum - 1)
    
    console.log('[RECIPES API] Executing query...')
    const { data: recipes, error, count } = await query

    if (error) {
      console.error('[RECIPES API] Query error:', error)
      return res.status(500).json({ error: error.message, details: error.message })
    }
    
    console.log('[RECIPES API] Success, found:', recipes?.length || 0, 'recipes')

    // Return recipes (without ingredients for now - to ensure basic functionality)
    const recipesList = Array.isArray(recipes) ? recipes : []
    
    res.status(200).json({ 
      recipes: recipesList, 
      hasMore: (count || 0) > (offsetNum + recipesList.length)
    })
  } catch (error) {
    console.error('[RECIPES API] Fatal error:', error)
    res.status(500).json({ error: error.message || 'Unknown error' })
  }
}
