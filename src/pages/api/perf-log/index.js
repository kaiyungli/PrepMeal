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
    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    
    // Whitelist safe fields
    const safe = {
      type: body.type === 'perf' ? 'perf' : undefined,
      traceId: typeof body.traceId === 'string' ? body.traceId : null,
      event: typeof body.event === 'string' ? body.event : null,
      stage: typeof body.stage === 'string' ? body.stage : undefined,
      label: typeof body.label === 'string' ? body.label : undefined,
      duration_ms: typeof body.duration_ms === 'number' ? body.duration_ms : undefined,
      path: typeof body.path === 'string' ? body.path : null,
      ts: typeof body.ts === 'string' ? body.ts : undefined,
      meta: typeof body.meta === 'object' ? body.meta : null
    };
    
    // Validate required
    if (!safe.stage || !safe.label) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Add received timestamp
    safe.received_at = new Date().toISOString();

    // Log in structured format
    console.log('[perf-log] ' + JSON.stringify(safe));

    return res.status(204).end();
  } catch (error) {
    return res.status(204).end();
  }
}
