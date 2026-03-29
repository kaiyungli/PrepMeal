import { requireAdmin } from '@/lib/adminAuth';
import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabaseServer) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  const { method, query, body } = req;

  // GET - List all ingredients (optionally search + limit)
  if (method === 'GET') {
    try {
      let queryBuilder = supabaseServer
        .from('ingredients')
        .select('id, name, slug, aliases, shopping_category, is_pantry_default')
        .order('name', { ascending: true });

      // Optional search by name or slug
      if (query?.search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`);
      }
      // Optional limit
      if (query?.limit) {
        queryBuilder = queryBuilder.limit(parseInt(query.limit, 10));
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return res.status(200).json({ ingredients: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Create ingredient
  if (method === 'POST') {
    const { name, slug, aliases, shopping_category, is_pantry_default } = body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Normalize slug: lowercase, replace spaces with underscores, keep letters/numbers/Chinese/underscore
    const input = (slug || name).trim();
    const finalSlug = input.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, '');

    // Robust duplicate check using .limit(1) to avoid .single() errors
    const { data: existing } = await supabaseServer
      .from('ingredients')
      .select('id')
      .eq('slug', finalSlug)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Ingredient with this slug already exists' });
    }

    try {
      const { data, error } = await supabaseServer
        .from('ingredients')
        .insert([{
          name: name.trim(),
          slug: finalSlug,
          aliases: aliases || [],
          shopping_category: shopping_category,
          is_pantry_default: is_pantry_default || false
        }])
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

    // Normalize slug for duplicate check
    const rawSlug = (slug || name)?.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fff]/g, '');

    // Check for duplicate slug (excluding current record)
    if (rawSlug) {
      const { data: existing } = await supabaseServer
        .from('ingredients')
        .select('id')
        .eq('slug', rawSlug)
        .neq('id', id)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Ingredient with this slug already exists' });
      }
    }

    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (slug !== undefined) updateData.slug = rawSlug;
      if (aliases !== undefined) updateData.aliases = aliases;
      if (shopping_category !== undefined) updateData.shopping_category = shopping_category;
      if (is_pantry_default !== undefined) updateData.is_pantry_default = is_pantry_default;

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