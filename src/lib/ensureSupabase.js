export function ensureSupabase(res, client) {
  if (client) {
    return true
  }

  res.status(500).json({ error: 'Supabase is not configured' })
  return false
}
