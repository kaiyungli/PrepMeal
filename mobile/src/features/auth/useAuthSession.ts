/**
 * Read the shared auth session. Pure `useContext` — no fetch, no `getSession()`.
 * Throws if used outside `<SessionProvider>` (a wiring bug, not a runtime state).
 */
import { useContext } from 'react';

import { AuthSessionContext, type AuthSessionValue } from './SessionProvider';

export function useAuthSession(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (ctx === null) {
    throw new Error('useAuthSession must be used within <SessionProvider>.');
  }
  return ctx;
}
