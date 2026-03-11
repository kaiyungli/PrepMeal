import { parse } from 'cookie'

export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '')
  
  if (cookies.admin_session === 'authenticated') {
    res.status(200).json({ authenticated: true })
  } else {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
