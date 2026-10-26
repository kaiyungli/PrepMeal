import { createClient } from '@supabase/supabase-js'
import { clearRecoverySession, recordRecoveryEvent } from '@/features/auth/recoverySession';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Throw error if env missing - don't silent fail
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// A fresh link must earn its own SDK recovery event; an invalid link must not
// inherit an earlier recovery handoff for an already logged-in account.
if (typeof window !== 'undefined' && /(?:access_token|refresh_token|error)=/.test(window.location.hash)) {
  clearRecoverySession();
}

// Browser client with OAuth-compatible auth config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Register before URL initialization completes; component effects can miss the
// initial recovery event. Callback is synchronous and never calls auth methods.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    recordRecoveryEvent(event, session?.user.id);
  });
}
