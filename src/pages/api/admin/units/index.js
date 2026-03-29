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

  // GET - List all units (optionally search + limit)
  if (method === 'GET') {
    try {
      let queryBuilder = supabaseServer
        .from('units')
        .select('id, code, name, unit_type, to_base')
        .order('unit_type', { ascending: true })
        .order('name', { ascending: true });

      // Optional search by name
      if (query?.search) {
        queryBuilder = queryBuilder.ilike('name', `%${query.search}%`);
      }
      // Optional limit
      if (query?.limit) {
        queryBuilder = queryBuilder.limit(parseInt(query.limit, 10));
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

    if (!code?.trim() || !name?.trim()) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    // Normalize code: lowercase, no spaces
    const finalCode = code.trim().toLowerCase().replace(/\s+/g, '');

    // Robust duplicate check using .limit(1) to avoid .single() errors
    const { data: existing } = await supabaseServer
      .from('units')
      .select('id')
      .eq('code', finalCode)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Unit with this code already exists' });
    }

    try {
      const { data, error } = await supabaseServer
        .from('units')
        .insert([{
          code: finalCode,
          name: name.trim(),
          unit_type: unit_type || 'other',
          to_base: to_base || 1
        }])
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

    // Normalize code for duplicate check
    const finalCode = code?.trim().toLowerCase().replace(/\s+/g, '');

    // Check for duplicate code (excluding current record)
    if (finalCode) {
      const { data: existing } = await supabaseServer
        .from('units')
        .select('id')
        .eq('code', finalCode)
        .neq('id', id)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'Unit with this code already exists' });
      }
    }

    try {
      const updateData = {};
      if (code !== undefined) updateData.code = finalCode;
      if (name !== undefined) updateData.name = name.trim();
      if (unit_type !== undefined) updateData.unit_type = unit_type;
      if (to_base !== undefined) updateData.to_base = to_base;

      const { data, error } = await supabaseServer
        .from('units')
        .update(updateData)
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