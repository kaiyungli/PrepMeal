// Direct REST API for single recipe
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    
    // Direct REST API call
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    )
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    res.status(200).json({ recipe: data[0] })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Internal error' })
  }
}
