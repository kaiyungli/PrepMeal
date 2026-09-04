/**
 * Mobile Supabase client wrapper.
 *
 * - Reads only the public EXPO_PUBLIC_* env (via `getMobileEnv`).
 * - Configures React Native session persistence with AsyncStorage.
 * - Created lazily as a singleton so importing this module doesn't crash at
 *   bundle-eval time when env is missing — the error surfaces on first use.
 * - Drives Supabase auth token auto-refresh from the native app lifecycle, per
 *   https://supabase.com/docs/reference/javascript/auth-startautorefresh
 *   (refresh only while the app is foregrounded).
 * - No service-role key, no hard-coded credentials.
 *
 * Presentation components must not import this directly; go through a
 * feature hook / service instead.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getMobileEnv } from './env';

let client: SupabaseClient | null = null;

/**
 * Handle for the single AppState subscription that gates auth auto-refresh.
 * Module-scoped so it is registered exactly once per singleton client and can
 * be torn down by `resetSupabaseClient` (tests / hot reload).
 */
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

function handleAppStateChange(state: AppStateStatus): void {
  if (!client) return;
  // Supabase only auto-refreshes the session while the app is in the
  // foreground; pausing in the background avoids needless token churn and
  // "lock" contention with AsyncStorage.
  if (state === 'active') {
    client.auth.startAutoRefresh();
  } else {
    client.auth.stopAutoRefresh();
  }
}

function bindAuthAutoRefreshToAppState(activeClient: SupabaseClient): void {
  // Web has no foreground/background AppState model; supabase-js manages its
  // own refresh timer there. Only wire the native lifecycle bridge.
  if (Platform.OS === 'web') return;

  // Register once. If a subscription from a previous singleton survived a hot
  // reload, drop it first so listeners never stack.
  appStateSubscription?.remove();
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Seed from the current state: if we're already foregrounded, start now
  // rather than waiting for the next transition.
  if (AppState.currentState === 'active') {
    activeClient.auth.startAutoRefresh();
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = getMobileEnv();

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // No URL-based session detection on native.
      detectSessionInUrl: false,
    },
  });

  bindAuthAutoRefreshToAppState(client);

  return client;
}

/** Test/hot-reload helper — drops the memoised client and its AppState listener. */
export function resetSupabaseClient(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
  client?.auth.stopAutoRefresh();
  client = null;
}
