/**
 * Session groundwork for later auth integration.
 *
 * This is intentionally minimal: it exposes the current Supabase auth session
 * (if any) and keeps it in sync via `onAuthStateChange`. It does NOT provide
 * sign-in / sign-out methods or any auth UI — those arrive in a later slice.
 */
import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase';

export type SessionState = {
  session: Session | null;
  /** `true` until the initial `getSession()` call resolves. */
  loading: boolean;
  /** Populated if the client could not be created (e.g. missing env). */
  error: Error | null;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Resolve the Supabase client once, up front, turning a config error (missing
 * env) into a value instead of a throw so the hook can render an error state
 * rather than crash.
 */
function initClient(): { client: SupabaseClient | null; error: Error | null } {
  try {
    return { client: getSupabaseClient(), error: null };
  } catch (error: unknown) {
    return { client: null, error: toError(error) };
  }
}

export function useSession(): SessionState {
  const [{ client, error: clientError }] = useState(initClient);
  const [state, setState] = useState<SessionState>({
    session: null,
    loading: client !== null,
    error: clientError,
  });

  useEffect(() => {
    if (!client) return;

    let active = true;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setState({ session: data.session, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ session: null, loading: false, error: toError(error) });
        }
      });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setState({ session, loading: false, error: null });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  return state;
}
