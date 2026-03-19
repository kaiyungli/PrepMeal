// API to fetch ingredients for multiple recipes
export default async function handler(req, res) {
  const { recipeIds } = req.query;
  
  if (!recipeIds) {
    return res.status(400).json({ error: 'recipeIds required' });
  }
  
  const ids = recipeIds.split(',').map(Number).filter(n => !isNaN(n));
  
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
    // Fetch recipe_ingredients with ingredient and unit info
    const { data: recipeIngredients, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        quantity,
        unit:units!inner(
          code,
          name
        ),
        ingredient:ingredients!inner(
          id,
          name,
          display_name
        )
      `)
      .in('recipe_id', ids);
    
    if (error) {
      console.error('Error fetching ingredients:', error);
      return res.status(500).json({ error: error.message });
    }
    
    // Format the response
    const ingredients = recipeIngredients.map(ri => ({
      id: ri.ingredient?.id,
      name: ri.ingredient?.display_name || ri.ingredient?.name || 'Unknown',
      quantity: ri.quantity,
      unit_name: ri.unit?.name || ''
    }));
    
    return res.status(200).json({ ingredients });
  } catch (e) {
    console.error('API error:', e);
    return res.status(500).json({ error: e.message });
  }
}
