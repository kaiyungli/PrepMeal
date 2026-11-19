/**
 * Browser auth client.
 *
 * The browser only ever uses Supabase for sign-in / sessions (all data goes
 * through our own /api routes), so it loads @supabase/auth-js on its own
 * instead of the full supabase-js bundle (database, storage, realtime,
 * functions). That keeps ~115 KB of unused JavaScript off every page.
 *
 * Built exactly like supabase-js builds its `auth` client (same URL, headers,
 * defaults and storage key), so existing signed-in sessions keep working.
 */
import { AuthClient } from '@supabase/auth-js';
import { beginRecoveryAttempt, recordRecoveryEvent } from '@/features/auth/recoverySession';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const baseUrl = new URL(supabaseUrl.endsWith('/') ? supabaseUrl : `${supabaseUrl}/`);

// Clear a previous UI handoff before the SDK handles a fresh link.
if (typeof window !== 'undefined') {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (['access_token', 'refresh_token', 'error', 'error_code', 'type'].some(key => hash.has(key))
    || ['code', 'token_hash', 'error', 'error_code'].some(key => url.searchParams.has(key))) {
    beginRecoveryAttempt(url.searchParams.get('flow') === 'recovery');
  }
}

const auth = new AuthClient({
  url: new URL('auth/v1', baseUrl).href,
  headers: {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  },
  // Same key supabase-js uses, so sessions saved before this change still load.
  storageKey: `sb-${baseUrl.hostname.split('.')[0]}-auth-token`,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit',
});

// Register synchronously before URL initialization can emit recovery.
if (typeof window !== 'undefined') {
  auth.onAuthStateChange((event, session) => recordRecoveryEvent(event, session?.user.id));
}

export const supabase = { auth };
export default supabase;
