// Delete menu plan API
import supabase from '@/lib/supabase';

export default async function handler(req, res) {
  const { data: { user }, error: authError } = await supabase?.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const planId = req.query.id;

  if (req.method === 'DELETE') {
    try {
      // Delete items first (RLS should handle this, but being explicit)
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
