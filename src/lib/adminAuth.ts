import { parse, serialize } from 'cookie'
import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

// Create signed admin token
export function createAdminToken() {
  const timestamp = Date.now().toString()
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(timestamp)
    .digest('hex')
  return `${timestamp}.${signature}`
}

// Verify admin token
export function verifyAdminToken(token: string | undefined) {
  if (!token || !ADMIN_SECRET) return false
  
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

// Check if request is admin (for API routes)
export function requireAdmin(req: { headers: { cookie?: string } }) {
  const cookies = parse(req.headers.cookie || '')
  const token = cookies.admin_session
  return token && verifyAdminToken(token)
}

// Serialize admin cookie
export function serializeAdminCookie(token: string) {
  return serialize('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

// Clear admin cookie
export function clearAdminCookie() {
  return serialize('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
}
