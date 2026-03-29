// Perf log API - receives client-side perf events and logs them
// Logs only appear when ENABLE_PERF=true

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if perf logging is enabled
  if (process.env.ENABLE_PERF !== 'true') {
    return res.status(204).end(); // No content
  }

  try {
    const { label, duration_ms, ts, path } = req.body;
    
    // Validate payload
    if (!label || typeof duration_ms !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Log in structured format
    console.log(`[perf][client] ${label}: ${duration_ms}ms path=${path || 'unknown'}`);

    return res.status(204).end();
  } catch (error) {
    // Silent fail - don't break the client
    return res.status(204).end();
  }
}