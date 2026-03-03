import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.time('API /recipes')
    
    const { limit = 20 } = req.query
    
    // Simple query - just get essential fields
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, name, cooking_time, difficulty, cuisine, calories, tags, description, image_url')
      .limit(parseInt(limit))
    
    console.timeEnd('API /recipes')
    
    if (error) {
      console.error('Supabase error:', error)
      return res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ recipes: [], source: 'error' })
    }
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ recipes: recipes || [], source: 'supabase' })
  } catch (error) {
    console.error('Error:', error)
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json({ recipes: [], source: 'error' })
  }
}
