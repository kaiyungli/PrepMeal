/**
 * Client-side debug log endpoint
 * Temporary logging for iPad/Vercel debugging
 */
export default function handler(req, res) {
  console.log('[client-log]', req.body);
  res.status(200).json({ ok: true });
}
