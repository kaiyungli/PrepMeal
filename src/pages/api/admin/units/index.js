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

  // GET - List all units
  if (method === 'GET') {
    try {
      const { data, error } = await supabaseServer
        .from('units')
        .select('*')
        .order('code');

      if (error) throw error;
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST - Create unit
  if (method === 'POST') {
    const { code, name, type } = body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    try {
      const { data, error } = await supabaseServer
        .from('units')
        .insert([{ code, name, type }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // PUT - Update unit
  if (method === 'PUT') {
    // Support id from query or body
    const id = query?.id || body?.id;

    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const { code, name, type } = body;

    try {
      const { data, error } = await supabaseServer
        .from('units')
        .update({ code, name, type })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ data });
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