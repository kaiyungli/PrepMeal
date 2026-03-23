// Save menu plan API - token-based auth only
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

  if (req.method === 'POST') {
    const { name, week_start_date, days_count, items, notes } = req.body;
    
    if (!name || !week_start_date || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'name, week_start_date, and items are required' });
    }

    try {
      // Insert parent plan
      const { data: plan, error: planError } = await supabase
        .from('saved_menu_plans')
        .insert({
          user_id: userId,
          name,
          week_start_date,
          days_count: days_count || 7,
          notes: notes || null,
        })
        .select()
        .single();
      
      if (planError) throw planError;

      // Insert items
      const itemsToInsert = items.map(item => ({
        menu_plan_id: plan.id,
        day_index: item.day_index,
        meal_type: item.meal_type,
        recipe_id: item.recipe_id,
        servings: item.servings || 1,
      }));

      const { error: itemsError } = await supabase
        .from('saved_menu_plan_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;

      return res.status(200).json({ success: true, plan_id: plan.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data: plans, error } = await supabase
        .from('saved_menu_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return res.status(200).json({ plans: plans || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
