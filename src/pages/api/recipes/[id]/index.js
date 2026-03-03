// Detail API - fetch from Supabase
const SUPABASE_URL = 'https://hivnajhqqvaokthzhugx.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHpodWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzAzODgsImV4cCI6MjA4ODAwNjM4OH0.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.setHeader('Content-Type', 'application/json')
  
  try {
    const { id } = req.query
    
    // Fetch recipe with all fields
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    )
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return res.status(404).send('{"error":"Not found"}')
    }
    
    res.status(200).send(JSON.stringify({ recipe: data[0] }))
  } catch (error) {
    res.status(500).send('{"error":"Error"}')
  }
}
