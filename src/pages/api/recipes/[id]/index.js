import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    const { id } = req.query
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, cooking_time, difficulty, cuisine, calories, description, tags, image_url, instructions')
      .eq('id', parseInt(id))
      .single()
    
    if (error) throw error
    
    res.status(200).json({ recipe: data })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(404).json({ error: err.message })
  }
}
