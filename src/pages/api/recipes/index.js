// Direct REST API - faster than client
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300')
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const limit = parseInt(req.query.limit) || 10
    
    // Direct REST API call - faster than client
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?select=id,name,cooking_time,cuisine,calories,tags,description,image_url&limit=${limit}`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    )
    
    const data = await response.json()
    
    res.status(200).json({ recipes: data || [] })
  } catch (error) {
    console.error('Error:', error)
    res.status(200).json({ recipes: [] })
  }
}
