// Get single menu plan with items - token-based auth only
import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  let userId = null;

  // Only accept Authorization header (token-based auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    } catch (err) {
      console.error('Token verification error:', err);
    }
  }

  // No token = no access
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - please log in' });
  }

  const planId = req.query.id;

  if (req.method === 'GET') {
    try {
      // Get the plan
      const { data: plan, error: planError } = await supabase
        .from('saved_menu_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', userId)
        .single();
      
      if (planError || !plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      
      // Get items with recipe details
      const { data: items, error: itemsError } = await supabase
        .from('saved_menu_plan_items')
        .select('*')
        .eq('menu_plan_id', planId);
      
      if (itemsError) throw itemsError;
      
      // Get recipe details
      const recipeIds = items.map(i => i.recipe_id).filter(Boolean);
      let recipesMap = {};
      
      if (recipeIds.length > 0) {
        const { data: recipes, error: recipeError } = await supabase
          .from('recipes')
          .select('id, name, image_url, total_time_minutes, difficulty, method')
          .in('id', recipeIds);
        
        if (!recipeError && recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }
      }
      
      // Attach recipe details to items
      const itemsWithRecipes = items.map(item => ({
        ...item,
        recipe: item.recipe_id ? recipesMap[item.recipe_id] : null,
      }));
      
      return res.status(200).json({ ...plan, items: itemsWithRecipes });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
