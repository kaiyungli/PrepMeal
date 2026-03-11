import { supabase } from '@/lib/supabaseClient'
import { ensureSupabase } from '@/lib/ensureSupabase'

export default async function handler(req, res) {
  if (!ensureSupabase(res, supabase)) {
    return
  }

  if (req.method === 'POST') {
    try {
      const { name, menu_data } = req.body
      
      const { data, error } = await supabase
        .from('menus')
        .insert([{ name, menu_data }])
        .select()
      
      if (error) throw error
      
      res.status(200).json({ success: true, data })
    } catch (err) {
      res.status(500).json({ error: 'Failed to save menu' })
    }
  } else if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      res.status(200).json(data)
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch menus' })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
