import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { cuisine, difficulty, limit = 20 } = req.query
    
    let query = supabase
      .from('recipes')
      .select('*')
      .order('id')
      .limit(parseInt(limit))
    
    if (cuisine && cuisine !== '全部') {
      query = query.eq('cuisine', cuisine)
    }
    
    if (difficulty && difficulty !== '全部') {
      query = query.eq('difficulty', difficulty)
    }
    
    const { data: recipes, error } = await query
    
    if (error || !recipes || recipes.length === 0) {
      return res.status(200).json({
        recipes: [],
        source: 'supabase-empty'
      })
    }
    
    res.status(200).json({ recipes, source: 'supabase' })
  } catch (error) {
    console.error('Error:', error)
    res.status(200).json({ recipes: [], source: 'error' })
  }
}
