import { requireAdmin } from '@/lib/adminAuth'

export default async function handler(req, res) {
  if (requireAdmin(req)) {
    res.status(200).json({ authenticated: true })
  } else {
    res.status(401).json({ error: 'Unauthorized' })
  }
}
