import { supabase } from '@/lib/supabaseClient'
import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'

const isAdmin = (req) => requireAdmin(req)

// Use service role client for admin operations (bypasses RLS)
const db = supabaseServer || supabase
const usingServiceRole = !!supabaseServer

export default async function handler(req, res) {
  const { method, query, body } = req;
  
  // Log request
  console.log(`[ADMIN RECIPES] ${method} ${JSON.stringify(query)}`)
  
  // Check DB connection
  if (!db) {
    console.error('[ADMIN RECIPES] FATAL: Supabase not configured')
    return res.status(500).json({ error: 'Supabase is not configured', hint: 'Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY' })
  }
  
  // Check auth
  if (!isAdmin(req)) {
    console.log('[ADMIN RECIPES] Unauthorized access attempt')
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    // GET - List or get single recipe
    if (method === 'GET') {
      const { id, slug } = query;
      
      // Get single recipe by ID or slug
      if (id || slug) {
        console.log(`[ADMIN RECIPES] Fetching single recipe: ${id || slug}`)
        let q = db.from('recipes').select('*');
        if (id) q = q.eq('id', id);
        else if (slug) q = q.eq('slug', slug);
        
        const { data: recipe, error: recipeError } = await q.single();
        
        if (recipeError) {
          console.error('[ADMIN RECIPES] Error fetching recipe:', recipeError);
          return res.status(500).json({ error: recipeError.message, details: recipeError });
        }
        
        const rid = recipe.id;
        
        // Get ingredients
        const { data: ingredients, error: ingError } = await db
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', rid);
        
              if (ingError) {
          console.error('[ADMIN RECIPES] Error fetching ingredients:', ingError);
          return res.status(500).json({ error: ingError.message, details: ingError });
        }
        
        // Get steps
        const { data: steps, error: stepError } = await db
          .from('recipe_steps')
          .select('*')
          .eq('recipe_id', rid)
          .order('step_no');
        
        if (stepError) {
          console.error('[ADMIN RECIPES] Error fetching steps:', stepError);
          return res.status(500).json({ error: stepError.message, details: stepError });
        }
        
        return res.status(200).json({ 
          recipe: { ...recipe, ingredients: ingredients || [], steps: steps || [] } 
        });
      }
      
      // List all recipes
      console.log('[ADMIN RECIPES] Fetching all recipes')
      
      const { data: recipes, error: listError } = await db
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (listError) {
        console.error('[ADMIN RECIPES] Error listing recipes:', listError);
        return res.status(500).json({ error: listError.message, details: listError });
      }
      
      console.log(`[ADMIN RECIPES] Found ${recipes?.length || 0} recipes`)
      
      // Get all ingredients
      const { data: allIngredients, error: allIngError } = await db
        .from('recipe_ingredients')
        .select('*');
      
      if (allIngError) {
        console.error('[ADMIN RECIPES] Error fetching all ingredients:', allIngError);
        return res.status(500).json({ error: allIngError.message, details: allIngError });
      }
      
      // Get all steps
      const { data: allSteps, error: allStepError } = await db
        .from('recipe_steps')
        .select('*');
      
      if (allStepError) {
        console.error('[ADMIN RECIPES] Error fetching all steps:', allStepError);
        return res.status(500).json({ error: allStepError.message, details: allStepError });
      }
      
      // Attach to each recipe
      const recipesWithData = (recipes || []).map(r => ({
        ...r,
        ingredients: (allIngredients || []).filter(i => i.recipe_id === r.id),
        steps: (allSteps || []).filter(s => s.recipe_id === r.id).sort((a, b) => a.step_no - b.step_no)
      }));
      
      return res.status(200).json({ recipes: recipesWithData });
    }
    
    // POST - Create new recipe
    if (method === 'POST') {
      console.log('[ADMIN RECIPES] Creating recipe via RPC:', body.name)

      const { data, error } = await db.rpc('admin_create_recipe_atomic', {
        p_name: body.name,
        p_slug: body.slug,
        p_description: body.description,
        p_cuisine: body.cuisine,
        p_dish_type: body.dish_type,
        p_difficulty: body.difficulty,
        p_prep_time_minutes: body.prep_time,
        p_cook_time_minutes: body.cook_time,
        p_base_servings: body.servings,
        p_image_url: body.image_url,
        p_calories_per_serving: body.calories_per_serving,
        p_is_public: body.is_public,
        p_method: body.method,
        p_speed: body.speed,
        p_servings_unit: body.servings_unit,
        p_meal_role: body.meal_role || null,
        p_is_complete_meal: body.is_complete_meal,
        p_primary_protein: body.primary_protein || null,
        p_budget_level: body.budget_level || null,
        p_reuse_group: body.reuse_group || null,
        p_ingredients: body.ingredients || [],
        p_steps: body.steps || []
      });

      if (error) {
        console.error('[ADMIN RECIPES] RPC error:', error);
        return res.status(500).json({ error: 'Failed to create recipe: ' + error.message, details: error });
      }

      if (!data) {
        return res.status(500).json({ error: 'No data returned from RPC' });
      }

      console.log('[ADMIN RECIPES] Recipe created successfully via RPC');

      return res.status(201).json({ 
        recipe: { 
          ...data.recipe, 
          ingredients: data.ingredients || [], 
          steps: data.steps || [] 
        } 
      });
    }
    
    // PUT - Update recipe
    if (method === 'PUT') {
      const { id } = query;
      if (!id) return res.status(400).json({ error: 'Recipe ID is required' });
      
      console.log('[ADMIN RECIPES] Updating recipe atomically:', id);
      
      const { data, error } = await db.rpc('admin_update_recipe_atomic', {
        p_recipe_id: id,
        p_name: body.name,
        p_slug: body.slug,
        p_description: body.description,
        p_cuisine: body.cuisine,
        p_dish_type: body.dish_type,
        p_difficulty: body.difficulty,
        p_prep_time_minutes: body.prep_time,
        p_cook_time_minutes: body.cook_time,
        p_base_servings: body.servings,
        p_image_url: body.image_url,
        p_calories_per_serving: body.calories_per_serving,
        p_is_public: body.is_public,
        p_method: body.method,
        p_speed: body.speed,
        p_servings_unit: body.servings_unit,
        p_meal_role: body.meal_role || null,
        p_is_complete_meal: body.is_complete_meal,
        p_primary_protein: body.primary_protein || null,
        p_budget_level: body.budget_level || null,
        p_reuse_group: body.reuse_group || null,
        p_ingredients: body.ingredients || [],
        p_steps: body.steps || []
      });
      
      if (error) {
        console.error('[ADMIN RECIPES] RPC error:', error);
        return res.status(500).json({ error: 'Failed to update recipe: ' + error.message, details: error });
      }
      
      if (!data) {
        return res.status(500).json({ error: 'No data returned from RPC' });
      }
      
      console.log('[ADMIN RECIPES] Recipe updated atomically:', id);
      return res.status(200).json({ 
        recipe: { 
          ...data.recipe, 
          ingredients: data.ingredients || [], 
          steps: data.steps || [] 
        } 
      });
    }
    
    // DELETE - Delete recipe
    if (method === 'DELETE') {
      const { id } = query;
      if (!id) return res.status(400).json({ error: 'Recipe ID is required' });
      
      console.log('[ADMIN RECIPES] Deleting recipe atomically:', id);
      
      const { data, error } = await db.rpc('admin_delete_recipe_atomic', { p_recipe_id: id });
      
      if (error) {
        console.error('[ADMIN RECIPES] RPC error:', error);
        return res.status(500).json({ error: 'Failed to delete recipe: ' + error.message, details: error });
      }
      
      if (!data?.success) {
        return res.status(500).json({ error: 'Delete did not complete successfully' });
      }
      
      console.log('[ADMIN RECIPES] Recipe deleted atomically:', id, 'rows:', data.deleted_rows);
      return res.status(200).json({ success: true, deletedId: id });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (err) {
    console.error('[ADMIN RECIPES] FATAL ERROR:', err);
    return res.status(500).json({ 
      error: err?.message || 'Unknown server error', 
      details: err?.toString() 
    });
  }
}
