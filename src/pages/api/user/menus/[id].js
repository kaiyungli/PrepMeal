// Get single menu plan with items
import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  const { data: { user }, error: authError } = await supabase?.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const planId = req.query.id;

  if (req.method === 'GET') {
    try {
      // Get the plan
      const { data: plan, error: planError } = await supabase
        .from('saved_menu_plans')
        .select('*')
        .eq('id', planId)
        .eq('user_id', user.id)
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
          .select('id,name,image_url,slug,cuisine,difficulty,method,total_time_minutes,calories_per_serving,protein_g')
          .in('id', recipeIds);
        
        if (!recipeError && recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {});
        }
      }
      
      // Attach recipe info to items
      const itemsWithRecipes = items.map(item => ({
        ...item,
        recipe: recipesMap[item.recipe_id] || null,
      }));
      
      return res.status(200).json({ plan, items: itemsWithRecipes });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Delete items first
      await supabase
        .from('saved_menu_plan_items')
        .delete()
        .eq('menu_plan_id', planId);
      
      // Delete the plan
      const { error } = await supabase
        .from('saved_menu_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
