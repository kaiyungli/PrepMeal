import { supabase } from '@/lib/supabaseClient'

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }
  
  const { method, query, body } = req;
  
  try {
    // GET - List all units
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('units')
        .select('id, code, name, unit_type, to_base')
        .order('unit_type', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error
          return { data: data?.sort((a, b) => a.name.localeCompare(b.name)) || [], error: null }
        })
      
      return res.status(200).json({ units: data })
    }
    
    // POST - Create new unit
    if (method === 'POST') {
      const { code, name, unit_type, to_base } = body
      
      if (!code?.trim() || !name?.trim()) {
        return res.status(400).json({ error: 'Unit code and name are required' })
      }
      
      // Check for duplicate
      const { data: existing } = await supabase
        .from('units')
        .select('id')
        .eq('code', code.toLowerCase())
        .limit(1)
      
      if (existing?.length > 0) {
        return res.status(400).json({ error: 'Unit code already exists' })
      }
      
      const { data, error } = await supabase
        .from('units')
        .insert({
          code: code.toLowerCase().trim(),
          name: name.trim(),
          unit_type: unit_type || 'other',
          to_base: to_base || 1
        })
        .select()
        .single()
      
      if (error) throw error
      
      return res.status(201).json({ unit: data })
    }
    
    // PUT - Update unit
    if (method === 'PUT') {
      const { id, code, name, unit_type, to_base } = body
      
      if (!id) {
        return res.status(400).json({ error: 'Unit ID is required' })
      }
      
      const updates = {}
      if (code !== undefined) updates.code = code.toLowerCase().trim()
      if (name !== undefined) updates.name = name.trim()
      if (unit_type !== undefined) updates.unit_type = unit_type
      if (to_base !== undefined) updates.to_base = to_base
      
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      return res.status(200).json({ unit: data })
    }
    
    // DELETE - Delete unit
    if (method === 'DELETE') {
      const { id } = query
      
      if (!id) {
        return res.status(400).json({ error: 'Unit ID is required' })
      }
      
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (error) {
    console.error('Admin units API error:', error)
    res.status(500).json({ error: error.message })
  }
}
