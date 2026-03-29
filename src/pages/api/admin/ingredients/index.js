import { requireAdmin } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  // Admin auth check
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Server check
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { method, query, body } = req;

  // GET - List all ingredients
  if (method === 'GET') {
    try {
      const { data, error } = await supabaseServer
        .from('ingredients')
        .select('*')
        .order('name');

      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Create ingredient
  if (method === 'POST') {
    const { name, category, slug, shopping_category } = body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    try {
      const { data, error } = await supabaseServer
        .from('ingredients')
        .insert([{ name, category, slug, shopping_category }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Update ingredient
  if (method === 'PUT') {
    // Support id from query or body
    const id = query?.id || body?.id;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const { name, category, slug, shopping_category } = body;

    try {
      const { data, error } = await supabaseServer
        .from('ingredients')
        .update({ name, category, slug, shopping_category, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE - Delete ingredient
  if (method === 'DELETE') {
    const id = query?.id || body?.id;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    try {
      const { error } = await supabaseServer
        .from('ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}