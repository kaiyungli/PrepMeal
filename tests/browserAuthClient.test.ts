// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

// The browser uses @supabase/auth-js on its own (not the full supabase-js).
// It must keep reading the session that supabase-js saved, so people stay
// signed in after the change.
describe('browser auth client', () => {
  it('matches the auth client supabase-js would build', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://hivnajhqqvaokthzhugx.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.resetModules();
    const { default: ours } = await import('@/lib/supabase');
    const { createClient } = await import('@supabase/supabase-js');
    const full = createClient('https://hivnajhqqvaokthzhugx.supabase.co', 'anon-key');
    const a = ours.auth as unknown as Record<string, unknown>;
    const b = full.auth as unknown as Record<string, unknown>;
    expect(a.storageKey).toBe('sb-hivnajhqqvaokthzhugx-auth-token');
    expect(a.storageKey).toBe(b.storageKey);
    expect(a.url).toBe(b.url);
    expect(a.flowType).toBe(b.flowType);
    expect(a.autoRefreshToken).toBe(b.autoRefreshToken);
    expect(a.persistSession).toBe(b.persistSession);
    expect(a.detectSessionInUrl).toBe(b.detectSessionInUrl);
    const ha = a.headers as Record<string, string>;
    expect(ha.apikey).toBe('anon-key');
    expect(ha.Authorization).toBe('Bearer anon-key');
    vi.unstubAllEnvs();
  });

  it('is never built from the full supabase-js bundle', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/supabase.ts', 'utf8');
    expect(src).not.toMatch(/@supabase\/supabase-js/);
  });
});
