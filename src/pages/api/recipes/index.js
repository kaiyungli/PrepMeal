import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      query = query.range(offset, offset + limit - 1);
    }
    
    const { data: recipes, error } = await query
    
    if (error) throw error
    
    // Only fetch ingredients and steps when fetching a single recipe
    if (id && recipes && recipes.length > 0) {
      const recipe = recipes[0];
      const { data: ingredients } = await supabase.from('recipe_ingredients').select('*').eq('recipe_id', id);
      const { data: steps } = await supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_no');
      recipe.ingredients = ingredients || [];
      recipe.steps = steps || [];
      return res.status(200).json({ recipes: [recipe] });
    }
    
    res.status(200).json({ recipes: recipes || [] })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(200).json({ recipes: [], error: err.message })
  }
}
