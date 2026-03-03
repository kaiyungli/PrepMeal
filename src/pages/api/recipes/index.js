import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const limit = parseInt(req.query.limit) || 10
    
    // Only fetch minimal fields - no joins
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, cooking_time, cuisine, calories, tags, description, image_url')
      .limit(limit)
    
    if (error) {
      console.error('Supabase error:', error)
      return res.status(200).json({ recipes: data || [] })
    }
    
    res.status(200).json({ recipes: data || [] })
  } catch (error) {
    console.error('Error:', error)
    res.status(200).json({ recipes: [] })
  }
}
