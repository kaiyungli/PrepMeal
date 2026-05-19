import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const recipeId = parseInt(id, 10);

  if (!recipeId) {
    return res.status(400).json({ error: 'Invalid recipe ID' });
  }

  // Increment times_shown
  const { data, error } = await supabase
    .from('recipes')
    .update({ times_shown: supabase.raw('COALESCE(times_shown, 0) + 1') })
    .eq('id', recipeId)
    .select()
    .single();

  if (error) {
    console.error('track-view error:', error);
    return res.status(500).json({ error: 'Failed to track view' });
  }

  return res.status(200).json({ success: true, recipeId });
}
