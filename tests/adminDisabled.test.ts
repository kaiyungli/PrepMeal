import { afterEach, describe, expect, it, vi } from 'vitest';
import { proxy, config } from '@/proxy';

afterEach(() => { vi.unstubAllEnvs(); });

describe('admin tools are switched off', () => {
  it('answers 404 for admin pages and APIs by default', () => {
    vi.stubEnv('ADMIN_ENABLED', '');
    expect(proxy().status).toBe(404);
  });

  it('lets requests through only when ADMIN_ENABLED is "true"', () => {
    vi.stubEnv('ADMIN_ENABLED', 'true');
    expect(proxy().headers.get('x-middleware-next')).toBe('1');
  });

  it('covers every admin route and nothing public', () => {
    expect(config.matcher).toEqual(['/admin', '/admin/:path*', '/api/admin/:path*', '/api/audit', '/api/audit/:path*']);
  });
});
