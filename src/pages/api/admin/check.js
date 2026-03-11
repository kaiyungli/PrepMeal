import { parse } from 'cookie'
import crypto from 'crypto'

const ADMIN_SECRET = process.env.ADMIN_SECRET

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

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '')
  const token = cookies.admin_session

  if (!token || !verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  res.status(200).json({ authenticated: true })
}
