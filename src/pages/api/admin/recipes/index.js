import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHpodWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzAzODgsImV4cCI6MjA4ODAwNjM4OH0.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'
)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=0, stale-while-revalidate=0')
  
  const { method } = req
  
  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) throw error
      return res.status(200).json({ recipes: data || [] })
    }
    
    if (method === 'POST') {
      const recipe = req.body
      const { data, error } = await supabase
        .from('recipes')
        .insert([recipe])
        .select()
      
      if (error) throw error
      return res.status(201).json({ recipe: data[0] })
    }
    
    if (method === 'PUT') {
      const { id, ...updates } = req.body
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return res.status(200).json({ recipe: data[0] })
    }
    
    if (method === 'DELETE') {
      const { id } = req.query
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return res.status(200).json({ success: true })
    }
    
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('API error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
