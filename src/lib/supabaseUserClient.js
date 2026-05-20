/**
 * Create Supabase client with user token authorization
 */

import { createClient } from '@supabase/supabase-js';

export function createUserSupabaseClient({ supabaseUrl, anonKey, token }) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}
