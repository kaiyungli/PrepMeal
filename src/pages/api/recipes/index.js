// Fetch from Supabase database
const SUPABASE_URL = 'https://hivnajhqqvaokthzhugx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHpodWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzAzODgsImV4cCI6MjA4ODAwNjM4OH0.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.setHeader('Content-Type', 'application/json')
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recipes?select=id,name,cooking_time,difficulty,cuisine,calories,description,tags,image_url,instructions&limit=10`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    )
    
    const data = await response.json()
    res.status(200).send(JSON.stringify({ recipes: data }))
  } catch (error) {
    console.error('Error:', error)
    res.status(200).send(JSON.stringify({ recipes: [], error: 'Failed to fetch' }))
  }
}
