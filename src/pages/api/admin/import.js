// Deprecated - redirect to /api/admin/recipes/import
export default async function handler(req, res) {
  // Forward to new endpoint
  const { method, body } = req
  
  const newReq = {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }
  
  // Since we can't easily forward within Next.js API, just return a message
  res.status(410).json({ 
    error: 'This endpoint is deprecated. Use /api/admin/recipes/import instead.',
    deprecated: true
  })
}
