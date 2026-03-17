import { supabase } from '@/lib/supabaseClient'
import { requireAdmin } from '@/lib/adminAuth'

const isAdmin = (req) => requireAdmin(req)

// Use anon client - works for authenticated admin users
const db = supabase

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
      console.log('[ADMIN RECIPES] Creating recipe:', body.name)
      
      // Map form fields to DB column names
      const recipeData = {
        name: body.name,
        slug: body.slug,
        description: body.description,
        cuisine: body.cuisine,
        dish_type: body.dish_type,
        difficulty: body.difficulty,
        prep_time_minutes: body.prep_time,
        cook_time_minutes: body.cook_time,
        base_servings: body.servings,
        image_url: body.image_url,
        calories_per_serving: body.calories_per_serving,
        is_public: body.is_public,
        tags: body.tags,
      };
      
      const { data: recipe, error: recipeError } = await db
        .from('recipes')
        .insert(recipeData)
        .select()
        .single();
      
      if (recipeError) {
        console.error('[ADMIN RECIPES] Error creating recipe:', recipeError);
        return res.status(500).json({ error: recipeError.message, details: recipeError });
      }
      
      const rid = recipe.id;
      
      // Insert ingredients
      if (body.ingredients?.length > 0) {
        const ingredientData = body.ingredients.map(i => ({
          recipe_id: rid,
          ingredient_id: i.ingredient_id,
          quantity: i.quantity,
          unit_id: i.unit_id,
          is_optional: i.is_optional || false,
          notes: i.notes || null,
          group_key: i.group_key || null,
        }));
        
        const { error: ingError } = await db
          .from('recipe_ingredients')
          .insert(ingredientData);
        
        if (ingError) {
          console.error('[ADMIN RECIPES] Error inserting ingredients:', ingError);
          // Rollback: delete recipe
          await db.from('recipes').delete().eq('id', rid);
          return res.status(500).json({ error: ingError.message, details: ingError });
        }
      }
      
      // Insert steps
      if (body.steps?.length > 0) {
        const stepData = body.steps.map(s => ({
          recipe_id: rid,
          step_no: s.step_no,
          text: s.text,
          time_seconds: s.time_seconds || null,
        }));
        
        const { error: stepError } = await db
          .from('recipe_steps')
          .insert(stepData);
        
        if (stepError) {
          console.error('[ADMIN RECIPES] Error inserting steps:', stepError);
          // Rollback
          await db.from('recipe_ingredients').delete().eq('recipe_id', rid);
          await db.from('recipes').delete().eq('id', rid);
          return res.status(500).json({ error: stepError.message, details: stepError });
        }
      }
      
      // Fetch created recipe with data
      const { data: createdRecipe } = await db
        .from('recipes')
        .select('*')
        .eq('id', rid)
        .single();
      
      const { data: ingredients } = await db
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', rid);
      
      const { data: steps } = await db
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', rid)
        .order('step_no');
      
      console.log('[ADMIN RECIPES] Recipe created successfully:', rid)
      
      return res.status(201).json({ 
        recipe: { ...createdRecipe, ingredients: ingredients || [], steps: steps || [] } 
      });
    }
    
    // PUT - Update recipe
    if (method === 'PUT') {
      const { id } = query;
      console.log('[ADMIN RECIPES] Updating recipe:', id)
      
      // Map form fields to DB column names
      const recipeData = {
        name: body.name,
        slug: body.slug,
        description: body.description,
        cuisine: body.cuisine,
        dish_type: body.dish_type,
        difficulty: body.difficulty,
        prep_time_minutes: body.prep_time,
        cook_time_minutes: body.cook_time,
        base_servings: body.servings,
        image_url: body.image_url,
        calories_per_serving: body.calories_per_serving,
        is_public: body.is_public,
        tags: body.tags,
      };
      
      const { error: recipeError } = await db
        .from('recipes')
        .update(recipeData)
        .eq('id', id);
      
      if (recipeError) {
        console.error('[ADMIN RECIPES] Error updating recipe:', recipeError);
        return res.status(500).json({ error: recipeError.message, details: recipeError });
      }
      
      // Delete existing ingredients
      await db.from('recipe_ingredients').delete().eq('recipe_id', id);
      
      // Insert new ingredients
      if (body.ingredients?.length > 0) {
        const ingredientData = body.ingredients.map(i => ({
          recipe_id: id,
          ingredient_id: i.ingredient_id,
          quantity: i.quantity,
          unit_id: i.unit_id,
          is_optional: i.is_optional || false,
          notes: i.notes || null,
          group_key: i.group_key || null,
        }));
        
        const { error: ingError } = await db
          .from('recipe_ingredients')
          .insert(ingredientData);
        
        if (ingError) {
          console.error('[ADMIN RECIPES] Error updating ingredients:', ingError);
          return res.status(500).json({ error: ingError.message, details: ingError });
        }
      }
      
      // Delete existing steps
      await db.from('recipe_steps').delete().eq('recipe_id', id);
      
      // Insert new steps
      if (body.steps?.length > 0) {
        const stepData = body.steps.map(s => ({
          recipe_id: id,
          step_no: s.step_no,
          text: s.text,
          time_seconds: s.time_seconds || null,
        }));
        
        const { error: stepError } = await db
          .from('recipe_steps')
          .insert(stepData);
        
        if (stepError) {
          console.error('[ADMIN RECIPES] Error updating steps:', stepError);
          return res.status(500).json({ error: stepError.message, details: stepError });
        }
      }
      
      // Fetch updated recipe
      const { data: updatedRecipe } = await db
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      
      const { data: ingredients } = await db
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id);
      
      const { data: steps } = await db
        .from('recipe_steps')
        .select('*')
        .eq('recipe_id', id)
        .order('step_no');
      
      console.log('[ADMIN RECIPES] Recipe updated successfully:', id)
      
      return res.status(200).json({ 
        recipe: { ...updatedRecipe, ingredients: ingredients || [], steps: steps || [] } 
      });
    }
    
    // DELETE - Delete recipe
    if (method === 'DELETE') {
      const { id } = query;
      console.log('[ADMIN RECIPES] Deleting recipe:', id)
      
      // Cascade delete in order
      await db.from('recipe_ingredients').delete().eq('recipe_id', id);
      await db.from('recipe_steps').delete().eq('recipe_id', id);
      await db.from('recipe_equipment').delete().eq('recipe_id', id);
      await db.from('menu_plan_items').delete().eq('recipe_id', id);
      
      const { error } = await db
        .from('recipes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('[ADMIN RECIPES] Error deleting recipe:', error);
        return res.status(500).json({ error: error.message, details: error });
      }
      
      console.log('[ADMIN RECIPES] Recipe deleted successfully:', id)
      
      return res.status(200).json({ success: true });
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
