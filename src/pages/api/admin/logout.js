import { clearAdminCookie } from '@/lib/adminAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Clear admin cookie
  const cookie = clearAdminCookie()
  res.setHeader('Set-Cookie', cookie)
  res.status(200).json({ success: true })
}
