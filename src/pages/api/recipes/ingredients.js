// API to fetch ingredients for multiple recipes
export default async function handler(req, res) {
  const { recipeIds } = req.query;
  
  if (!recipeIds) {
    return res.status(400).json({ error: 'recipeIds required' });
  }
  
  console.log("[ingredients api] recipeIds raw:", recipeIds);
  const ids = recipeIds.split(',').map(s => s.trim()).filter(Boolean);
  
  if (ids.length === 0) {
    return res.status(400).json({ error: 'invalid recipeIds' });
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing env vars' });
  }
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Simple query - fetch recipe_ingredients first
    const { data: recipeIngredients, error } = await supabase
      .from('recipe_ingredients')
      .select('id, recipe_id, quantity, ingredient_id, unit_id')
      .in('recipe_id', ids);
    
    if (error) {
      console.error('Error fetching recipe_ingredients:', error);
      return res.status(500).json({ error: error.message, ingredients: [] });
    }
    
    console.log('[ingredients api] rows:', recipeIngredients?.length);
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return res.status(200).json({ ingredients: [] });
    }
    
    // Get unique ingredient IDs
    const ingredientIds = [...new Set(recipeIngredients.map(ri => ri.ingredient_id).filter(Boolean))];
    
    if (ingredientIds.length === 0) {
      return res.status(200).json({ ingredients: [] });
    }
    
    // Fetch ingredient details
    const { data: ingredientDetails, error: ingError } = await supabase
      .from('ingredients')
      .select('id, name, display_name')
      .in('id', ingredientIds);
    
    if (ingError) {
      console.error('Error fetching ingredients:', ingError);
      return res.status(500).json({ error: ingError.message, ingredients: [] });
    }
    
    // Build lookup map
    const ingredientMap = new Map();
    if (ingredientDetails) {
      ingredientDetails.forEach(ing => {
        ingredientMap.set(ing.id, ing.display_name || ing.name || 'Unknown');
      });
    }
    
    // Map recipe_ingredients to include ingredient names
    const ingredients = recipeIngredients.map(ri => ({
      id: ri.ingredient_id,
      name: ingredientMap.get(ri.ingredient_id) || 'Unknown',
      quantity: ri.quantity
    }));
    
    return res.status(200).json({ ingredients });
  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ error: e.message, ingredients: [] });
  }
}
