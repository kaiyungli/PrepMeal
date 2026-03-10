import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
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
      res.status(500).json({ error: err.message })
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
      res.status(500).json({ error: err.message })
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
