import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'

const supabase = supabaseServer

const isAdmin = (req) => requireAdmin(req)

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase is not configured' })
  }

  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const { method, query, body } = req;
  
  try {
    // GET - List all ingredients or search
    if (method === 'GET') {
      const { search, limit = 50 } = query;
      
      let queryBuilder = supabase
        .from('ingredients')
        .select('id, name, slug, aliases, shopping_category, is_pantry_default')
        .order('name')
      
      if (search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
      }
      
      if (limit) {
        queryBuilder = queryBuilder.limit(parseInt(limit))
      }
      
      const { data, error } = await queryBuilder
      if (error) throw error
      
      return res.status(200).json({ ingredients: data || [] })
    }
    
    // POST - Create new ingredient
    if (method === 'POST') {
      const { name, slug, aliases, shopping_category, is_pantry_default } = body
      
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Ingredient name is required' })
      }
      
      // Generate slug from name if not provided
      const finalSlug = slug?.trim() || name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '')
      
      // Check for duplicate
      const { data: existing } = await supabase
        .from('ingredients')
        .select('id')
        .or(`slug.eq.${finalSlug},name.ieq.${name}`)
        .limit(1)
      
      if (existing?.length > 0) {
        return res.status(400).json({ error: 'Ingredient already exists' })
      }
      
      const { data, error } = await supabase
        .from('ingredients')
        .insert({
          name: name.trim(),
          slug: finalSlug,
          aliases: aliases || [],
          shopping_category: shopping_category || '其他',
          is_pantry_default: is_pantry_default || false
        })
        .select()
        .single()
      
      if (error) throw error
      
      return res.status(201).json({ ingredient: data })
    }
    
    // PUT - Update ingredient
    if (method === 'PUT') {
      const { id, name, slug, aliases, shopping_category, is_pantry_default } = body
      
      if (!id) {
        return res.status(400).json({ error: 'Ingredient ID is required' })
      }
      
      const updates = {}
      if (name !== undefined) updates.name = name.trim()
      if (slug !== undefined) updates.slug = slug.trim()
      if (aliases !== undefined) updates.aliases = aliases
      if (shopping_category !== undefined) updates.shopping_category = shopping_category
      if (is_pantry_default !== undefined) updates.is_pantry_default = is_pantry_default
      
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      return res.status(200).json({ ingredient: data })
    }
    
    // DELETE - Delete ingredient
    if (method === 'DELETE') {
      const { id } = query
      
      if (!id) {
        return res.status(400).json({ error: 'Ingredient ID is required' })
      }
      
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
    
  } catch (error) {
    console.error('Admin ingredients API error:', error)
    res.status(500).json({ error: error.message })
  }
}
