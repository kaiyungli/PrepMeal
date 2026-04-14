// Perf log API - receives client-side perf events
// Logs when ENABLE_PERF=true

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    
    // Whitelist safe fields
    const safe = {
      type: body.type === 'perf' ? 'perf' : null,
      traceId: typeof body.traceId === 'string' ? body.traceId : null,
      event: typeof body.event === 'string' ? body.event : null,
      stage: typeof body.stage === 'string' ? body.stage : null,
      label: typeof body.label === 'string' ? body.label : null,
      duration_ms: typeof body.duration_ms === 'number' ? body.duration_ms : null,
      path: typeof body.path === 'string' ? body.path : null,
      ts: typeof body.ts === 'string' ? body.ts : null,
      meta: typeof body.meta === 'object' ? body.meta : null
    };
    
    // Validate required
    if (!safe.stage || !safe.label) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Add received timestamp
    safe.received_at = new Date().toISOString();

    // Log if enabled
    if (process.env.ENABLE_PERF === 'true') {
      console.log('[perf-log] ' + JSON.stringify(safe));
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
}
