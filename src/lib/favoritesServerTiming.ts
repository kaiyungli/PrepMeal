const STAGES = new Set(['auth', 'auth_jwks', 'auth_get_user', 'db_request', 'response_prepare']);
export function createFavoritesServerTiming(req: { headers?: Record<string, unknown> }, res: { json: (body: unknown) => unknown; setHeader?: (name: string, value: string) => unknown }) {
  const enabled = req.headers?.['x-prepmeal-favorites-perf'] === '1';
  const started = enabled ? performance.now() : 0;
  const stages = new Map<string, number>();
  function record(stage: string, start: number) {
    if (enabled && STAGES.has(stage)) stages.set(stage, (stages.get(stage) || 0) + performance.now() - start);
  }
  if (enabled) {
    const original = res.json.bind(res);
    res.json = body => {
      try {
        const values = [...stages, ['handler', performance.now() - started] as [string, number]];
        res.setHeader?.('Server-Timing', values.map(([stage, duration]) => `${stage};dur=${duration.toFixed(2)}`).join(', '));
      } catch { /* Optional diagnostics never change an API response. */ }
      return original(body);
    };
  }
  return {
    async measure<T>(stage: string, work: () => PromiseLike<T> | T): Promise<T> {
      const start = enabled ? performance.now() : 0;
      try { return await work(); } finally { record(stage, start); }
    },
    prepare<T>(work: () => T): T {
      const start = enabled ? performance.now() : 0;
      try { return work(); } finally { record('response_prepare', start); }
    },
  };
}
