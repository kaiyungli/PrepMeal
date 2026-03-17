import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  console.log('[API] ====== START ======');
  console.log('[API] req.query:', req.query);
  
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    console.log('[API] Starting...')
    
    if (!supabase) {
      console.error('[API] Supabase not configured')
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
    
    console.log('[API] Parsed params:', { cuisine, difficulty, maxTime, sort });
    
    // Build query safely
    let query = supabase
      .from('recipes')
      .select('*', { count: 'exact' })
    
    // Always filter by public
    query = query.eq('is_public', true)
    
    // Search
    if (search && typeof search === 'string') {
      console.log('[API] Adding search:', search);
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }
    
    // Cuisine filter
    if (cuisine && cuisine !== '' && typeof cuisine === 'string') {
      console.log('[API] Adding cuisine:', cuisine);
      query = query.eq('cuisine', cuisine)
    }
    
    // Difficulty filter
    if (difficulty && difficulty !== '' && typeof difficulty === 'string') {
      console.log('[API] Adding difficulty:', difficulty);
      query = query.eq('difficulty', difficulty)
    }
    
    // Max time filter
    if (maxTime) {
      const timeNum = parseInt(maxTime)
      if (timeNum && timeNum > 0) {
        console.log('[API] Adding maxTime:', timeNum);
        query = query.lt('cook_time_minutes', timeNum)
      }
    }
    
    // Sorting
    const safeSort = typeof sort === 'string' ? sort : 'newest'
    console.log('[API] Sorting by:', safeSort);
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
    
    console.log('[API] Executing query...');
    const { data: recipes, error } = await query

    console.log('[API] Query result:', { error: error?.message, count: recipes?.length });

    if (error) {
      console.error('[API] Supabase error:', error)
      return res.status(500).json({ error: error.message, details: error.message })
    }
    
    console.log('[API] First recipe:', recipes?.[0]?.name);

    // Return recipes (without ingredients for now - to ensure basic functionality)
    const recipesList = Array.isArray(recipes) ? recipes : []
    console.log('[API] Final response count:', recipesList.length);
    console.log('[API] ====== END ======');
    
    res.status(200).json({ 
      recipes: recipesList, 
      hasMore: (recipesList.length) > offsetNum + limitNum
    })
  } catch (error) {
    console.error('[API] Fatal error:', error)
    console.log('[API] ====== ERROR ======');
    res.status(500).json({ error: error.message || 'Unknown error' })
  }
}
