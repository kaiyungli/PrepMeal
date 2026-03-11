import { createAdminToken, serializeAdminCookie } from '@/lib/adminAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!process.env.ADMIN_SECRET) {
    console.error('ADMIN_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (password !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  // Create signed token
  const token = createAdminToken()

  // Set httpOnly cookie
  const cookie = serializeAdminCookie(token)
  res.setHeader('Set-Cookie', cookie)
  res.status(200).json({ success: true })
}
