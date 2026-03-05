import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHpodWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzAzODgsImV4cCI6MjA4ODAwNjM4OH0.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'
)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    const { id } = req.query;
    
    let query = supabase
      .from('recipes')
      .select('id, name, description, image_url, cuisine, dish_type, method, speed, difficulty, protein, diet, flavor, base_servings, calories_per_serving, protein_g, carbs_g, fat_g, slug, is_public');
    
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      query = query.limit(100);
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    res.status(200).json({ recipes: data || [] })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(200).json({ recipes: [], error: err.message })
  }
}
