import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHp1Z3giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3MjQzMDM4OCwiZXhwIjoyMDg4MDA2Mzg4fQ.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'
)

export default async function handler(req, res) {
  const { method, query, body } = req;
  
  try {
    if (method === 'GET') {
      const { id } = query;
      
      if (id) {
        // Get single recipe with ingredients and steps
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (recipeError) throw recipeError;
        
        // Get ingredients
        const { data: ingredients } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', id)
          .order('id');
        
        // Get steps
        const { data: steps } = await supabase
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', id)
          .order('step_no');
        
        return res.status(200).json({ recipe: { ...recipe, ingredients: ingredients || [], steps: steps || [] } });
      } else {
        // List all recipes
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return res.status(200).json({ recipes: data || [] });
      }
    }
    
    if (method === 'POST' || method === 'PUT') {
      const recipeData = {
        name: body.name,
        slug: body.slug || body.name?.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        description: body.description || null,
        cuisine: body.cuisine || 'chinese',
        dish_type: body.dish_type || 'main',
        method: body.method || 'stir_fry',
        speed: body.speed || 'quick',
        difficulty: body.difficulty || 'easy',
        flavor: body.flavor || [],
        is_public: body.is_public ?? true,
        prep_time_minutes: body.prep_time_minutes || 10,
        cook_time_minutes: body.cook_time_minutes || 10,
        base_servings: body.base_servings || 1,
        calories_per_serving: body.calories_per_serving || null,
        protein_g: body.protein_g || null,
        carbs_g: body.carbs_g || null,
        fat_g: body.fat_g || null,
        image_url: body.image_url || null,
      };
      
      if (body.id) {
        // Update
        const { data, error } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', body.id)
          .select()
          .single();
        
        if (error) throw error;
        return res.status(200).json({ recipe: data });
      } else {
        // Create
        const { data, error } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select()
          .single();
        
        if (error) throw error;
        return res.status(201).json({ recipe: data });
      }
    }
    
    if (method === 'DELETE') {
      const { id } = query;
      
      // Delete related records first
      await supabase.from('recipe_ingredients').delete().eq('recipe_id', id).catch(() => {});
      await supabase.from('recipe_steps').delete().eq('recipe_id', id).catch(() => {});
      
      // Delete recipe
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
