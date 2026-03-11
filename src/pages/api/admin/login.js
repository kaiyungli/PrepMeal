import { serialize } from 'cookie'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  // Check against server-side environment variable
  const adminSecret = process.env.ADMIN_SECRET
  
  if (!adminSecret) {
    console.error('ADMIN_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (password !== adminSecret) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  // Set httpOnly cookie
  const cookie = serialize('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  res.setHeader('Set-Cookie', cookie)
  res.status(200).json({ success: true })
}
