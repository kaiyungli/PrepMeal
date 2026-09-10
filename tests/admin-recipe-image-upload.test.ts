import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Regression tests for src/pages/api/admin/uploads/recipe-image.js
//
// This endpoint mints a Supabase Storage signed-upload URL for admin recipe
// images. Hardening contract:
//   * service-role client only; fail closed (500, no Storage call) when unset
//   * requireAdmin gate (401, no Storage call) for non-admin callers
//   * POST only (405)
//   * the client declares ONLY a MIME type -- it never chooses the object key
//   * declared-MIME allowlist: jpeg/png/webp/gif/avif; missing / unsupported /
//     SVG -> 400 (no Storage call)
//   * the object key is server-generated: recipe-images/<uuidv4>.<ext>
//   * createSignedUploadUrl and getPublicUrl are called with the SAME key
//   * any fileName / path the client smuggles in is ignored
//
// The handler is driven with fake req/res objects and a mocked
// `@/lib/supabaseServer` whose `.storage.from()` returns spies.

const ADMIN_SECRET = 'test-admin-secret-for-upload-regression';
const HANDLER_MODULE = '@/pages/api/admin/uploads/recipe-image.js';

const UUID_V4 =
  '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

function validAdminCookie(): string {
  const ts = Date.now().toString();
  const sig = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `admin_session=${ts}.${sig}`;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    query: {},
    body: { fileType: 'image/png' },
    headers: { cookie: validAdminCookie() },
    ...overrides,
  };
}

function makeRes() {
  const res: {
    statusCode: number | null;
    body: unknown;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  } = {
    statusCode: null,
    body: undefined,
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json.mockImplementation((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res;
}

function makeStorageMock() {
  const createSignedUploadUrl = vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://storage.test/object?token=signed' },
    error: null,
  });
  const getPublicUrl = vi.fn().mockReturnValue({
    data: { publicUrl: 'https://storage.test/public/object' },
  });
  const from = vi.fn().mockReturnValue({ createSignedUploadUrl, getPublicUrl });
  return {
    supabaseServer: { storage: { from } },
    spies: { from, createSignedUploadUrl, getPublicUrl },
  };
}

async function loadHandler() {
  const mod = await import(HANDLER_MODULE);
  return mod.default as (req: unknown, res: unknown) => Promise<unknown>;
}

beforeEach(() => {
  vi.resetModules();
  process.env.ADMIN_SECRET = ADMIN_SECRET;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.doUnmock('@/lib/supabaseServer');
  delete process.env.ADMIN_SECRET;
});

describe('admin recipe-image upload: fail closed without a service-role client', () => {
  it('returns 500 and never touches Storage when supabaseServer is not configured', async () => {
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer: null }));

    const handler = await loadHandler();
    const req = makeReq();
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(500);
    expect((res.body as { error?: string })?.error).toBe('Supabase is not configured');
  });

  it('does not import the anon client and keeps the service-role binding', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../src/pages/api/admin/uploads/recipe-image.js'),
      'utf8',
    );
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabaseClient['"]/);
    expect(src).not.toMatch(/from\s+['"]@\/lib\/supabase['"]/);
    expect(src).not.toMatch(/\|\|\s*supabase\b/);
    expect(src).toMatch(/const\s+supabase\s*=\s*supabaseServer\b/);
    expect(src).toMatch(/requireAdmin/);
  });
});

describe('admin recipe-image upload: auth + method gates', () => {
  it('returns 401 and calls no Storage method when the caller is not admin', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ headers: {} }); // no admin_session cookie
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(spies.from).not.toHaveBeenCalled();
    expect(spies.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(spies.getPublicUrl).not.toHaveBeenCalled();
  });

  it('returns 405 for a non-POST request', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ method: 'GET' });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(spies.from).not.toHaveBeenCalled();
    expect(spies.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(spies.getPublicUrl).not.toHaveBeenCalled();
  });
});

describe('admin recipe-image upload: declared-MIME allowlist', () => {
  const reject = async (body: unknown) => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ body });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(spies.from).not.toHaveBeenCalled();
    expect(spies.createSignedUploadUrl).not.toHaveBeenCalled();
    expect(spies.getPublicUrl).not.toHaveBeenCalled();
  };

  it('rejects a request with no fileType', async () => {
    await reject({});
  });

  it('rejects an unsupported fileType', async () => {
    await reject({ fileType: 'application/pdf' });
  });

  it('rejects SVG explicitly', async () => {
    await reject({ fileType: 'image/svg+xml' });
  });

  // A bare `MIME_EXTENSIONS[fileType]` lookup would resolve inherited
  // Object.prototype keys to a truthy function/object and slip past the guard.
  it.each([
    ['toString'],
    ['constructor'],
    ['__proto__'],
    ['valueOf'],
    ['hasOwnProperty'],
    ['isPrototypeOf'],
  ])('rejects the Object.prototype key %j as fileType', async (fileType) => {
    await reject({ fileType });
  });

  // Non-string fileType: string coercion of these could smuggle an allowed
  // value past a lookup that does not check the type first.
  it('rejects an array fileType', async () => {
    await reject({ fileType: ['image/png'] });
  });

  it('rejects an object fileType whose toString() is an allowed MIME', async () => {
    await reject({ fileType: { toString: () => 'image/png' } });
  });

  it('rejects a null fileType', async () => {
    await reject({ fileType: null });
  });

  it('rejects a numeric fileType', async () => {
    await reject({ fileType: 42 });
  });

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['image/avif', 'avif'],
  ])('accepts %s and derives a .%s key', async (fileType, ext) => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ body: { fileType } });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const key = spies.createSignedUploadUrl.mock.calls[0][0] as string;
    expect(key).toMatch(new RegExp(`^recipe-images/${UUID_V4}\\.${ext}$`));
  });
});

describe('admin recipe-image upload: server owns the object key', () => {
  it('generates a server-owned UUID path and returns the documented response shape', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ body: { fileType: 'image/png' } });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(spies.from).toHaveBeenCalledWith('recipes');
    const key = spies.createSignedUploadUrl.mock.calls[0][0] as string;
    expect(key).toMatch(new RegExp(`^recipe-images/${UUID_V4}\\.png$`));
    expect(res.body).toEqual({
      uploadUrl: 'https://storage.test/object?token=signed',
      publicUrl: 'https://storage.test/public/object',
    });
  });

  it('uses the exact same object key for createSignedUploadUrl and getPublicUrl', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({ body: { fileType: 'image/webp' } });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const signedKey = spies.createSignedUploadUrl.mock.calls[0][0];
    const publicKey = spies.getPublicUrl.mock.calls[0][0];
    expect(signedKey).toBe(publicKey);
  });

  it('mints a fresh key on every request', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();

    await handler(makeReq({ body: { fileType: 'image/png' } }), makeRes());
    await handler(makeReq({ body: { fileType: 'image/png' } }), makeRes());

    const first = spies.createSignedUploadUrl.mock.calls[0][0];
    const second = spies.createSignedUploadUrl.mock.calls[1][0];
    expect(first).not.toBe(second);
  });

  it('ignores a malicious client-supplied fileName / path and never passes it to Storage', async () => {
    const { supabaseServer, spies } = makeStorageMock();
    vi.doMock('@/lib/supabaseServer', () => ({ supabaseServer }));

    const handler = await loadHandler();
    const req = makeReq({
      body: {
        fileType: 'image/jpeg',
        fileName: '../../../../etc/passwd',
        name: 'evil.php',
        path: 'public/evil',
        objectKey: 'recipe-images/overwrite-me.jpg',
      },
    });
    const res = makeRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    const key = spies.createSignedUploadUrl.mock.calls[0][0] as string;
    expect(key).toMatch(new RegExp(`^recipe-images/${UUID_V4}\\.jpg$`));
    expect(key).not.toContain('..');
    expect(key).not.toContain('passwd');
    expect(key).not.toContain('evil');
    expect(key).not.toContain('overwrite-me');
    // Neither Storage call saw any client-controlled string.
    for (const call of [
      ...spies.createSignedUploadUrl.mock.calls,
      ...spies.getPublicUrl.mock.calls,
    ]) {
      expect(JSON.stringify(call)).not.toContain('passwd');
      expect(JSON.stringify(call)).not.toContain('evil');
      expect(JSON.stringify(call)).not.toContain('overwrite-me');
    }
  });
});

describe('RecipeForm: uses the hardened endpoint and sends no file name', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../src/components/admin/RecipeForm.js'),
    'utf8',
  );

  it('posts to /api/admin/uploads/recipe-image', () => {
    expect(src).toContain("fetch('/api/admin/uploads/recipe-image'");
    expect(src).not.toContain("/api/admin/uploads/image'");
  });

  it('sends only fileType in the upload request body (no fileName / path)', () => {
    expect(src).toContain('JSON.stringify({ fileType: file.type })');
    expect(src).not.toMatch(/fileName/);
    expect(src).not.toMatch(/body:\s*JSON\.stringify\(\{[^}]*fileName/);
  });
});
