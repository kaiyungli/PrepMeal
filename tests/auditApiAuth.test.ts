import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));

import handler from '@/pages/api/audit/index';

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('/api/audit access', () => {
  it('rejects a visitor without an admin session before touching the database', async () => {
    mocks.requireAdmin.mockReturnValue(false);
    const res = response();
    await handler({ headers: {}, query: {} } as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('still runs for an admin session', async () => {
    mocks.requireAdmin.mockReturnValue(true);
    const chain = { select: vi.fn(() => chain), limit: vi.fn(async () => ({ data: [] })) };
    mocks.from.mockReturnValue(chain);
    const res = response();
    await handler({ headers: { cookie: 'admin=ok' }, query: { type: 'missing-steps' } } as never, res as never);
    expect(res.statusCode).toBe(200);
    expect(mocks.from).toHaveBeenCalled();
  });
});
