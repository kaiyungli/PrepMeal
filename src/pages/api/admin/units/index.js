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

  // GET - List all units
  if (method === 'GET') {
    try {
      let queryBuilder = supabaseServer.from('units').select('*').order('code');

      // Support optional search/limit params
      if (query?.search) {
        queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
      }
      if (query?.limit) {
        queryBuilder = queryBuilder.limit(parseInt(query.limit));
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return res.status(200).json({ units: data || [] });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Create unit
  if (method === 'POST') {
    const { code, name, unit_type, to_base } = body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    // Check for duplicate code
    const { data: existing } = await supabaseServer
      .from('units')
      .select('id')
      .eq('code', code)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Unit with this code already exists' });
    }

    try {
      const { data, error } = await supabaseServer
        .from('units')
        .insert([{ code, name, unit_type, to_base }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ unit: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Update unit
  if (method === 'PUT') {
    const id = query?.id || body?.id;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const { code, name, unit_type, to_base } = body;

    try {
      const { data, error } = await supabaseServer
        .from('units')
        .update({ code, name, unit_type, to_base })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ unit: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE - Delete unit
  if (method === 'DELETE') {
    const id = query?.id || body?.id;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    try {
      const { error } = await supabaseServer
        .from('units')
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