import { serialize } from 'cookie'
import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_SECRET

function createSignedToken() {
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(timestamp)
    .digest('hex')
  return `${timestamp}.${signature}`
}

function verifyToken(token) {
  try {
    const [timestamp, signature] = token.split('.')
    const expected = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(timestamp)
      .digest('hex')
    return signature === expected
  } catch {
    return false
  }
}

export { createSignedToken, verifyToken }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { password } = req.body

  if (!ADMIN_SECRET) {
    console.error('ADMIN_SECRET not configured')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (password !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  // Create signed token
  const token = createSignedToken()

  // Set httpOnly cookie with signed token
  const cookie = serialize('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })

  res.setHeader('Set-Cookie', cookie)
  res.status(200).json({ success: true })
}
