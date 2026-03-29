import { requireAdmin } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  // Admin auth check
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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
      return res.status(200).json({ ingredients: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Create ingredient
  if (method === 'POST') {
    const { name, slug, aliases, shopping_category, is_pantry_default } = body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Generate slug if not provided
    let finalSlug = slug;
    if (!finalSlug && name) {
      finalSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    // Check for duplicate
    if (finalSlug) {
      const { data: existing } = await supabaseServer
        .from('ingredients')
        .select('id')
        .eq('slug', finalSlug)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Ingredient with this slug already exists' });
      }
    }

    try {
      const insertData = { name, slug: finalSlug, aliases, shopping_category, is_pantry_default };
      const { data, error } = await supabaseServer
        .from('ingredients')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ ingredient: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Update ingredient
  if (method === 'PUT') {
    const id = query?.id || body?.id;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const { name, slug, aliases, shopping_category, is_pantry_default } = body;

    try {
      const updateData = { name, slug, aliases, shopping_category, is_pantry_default };
      const { data, error } = await supabaseServer
        .from('ingredients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ ingredient: data });
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