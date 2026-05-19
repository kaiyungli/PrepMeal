import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get recipe ID from route params
  const recipeId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  
  if (!recipeId) {
    return res.status(400).json({ error: 'Missing recipe ID' });
  }

  try {
    // Call RPC for atomic increment
    const { error } = await supabase.rpc('increment_recipe_times_shown', {
      p_recipe_id: recipeId,
    });

    if (error) {
      // Log but don't fail - tracking shouldn't block UX
      console.error('track-view error:', error);
      return res.status(200).json({ success: true, tracked: false });
    }

    return res.status(200).json({ success: true, tracked: true });
  } catch (err) {
    console.error('track-view exception:', err);
    return res.status(200).json({ success: true, tracked: false });
  }
}
