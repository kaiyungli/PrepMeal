/**
 * Root auth session provider — the SINGLE owner of Supabase auth state.
 *
 * CONTRACT (mobile-slice-4a-auth-design.md §3.1 / §3.1a):
 *  - Subscribes `onAuthStateChange` BEFORE the one `getSession()` call.
 *  - Calls `getSession()` exactly once per mount, tagged with the epoch captured
 *    immediately before the call. No `getUser()`, ever.
 *  - `INITIAL_SESSION` is completely inert: early `return`, no state write, no
 *    epoch bump. The authoritative initial state always comes from the single
 *    `getSession()` restore.
 *  - Real later events (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, …) go
 *    through the pure `onEvent` reducer, advance the epoch, take public state
 *    immediately, and thereby fence out any still-pending stale `getSession()`
 *    result or error.
 *  - `signInWithPassword()` / `signOut()` NEVER write provider state directly —
 *    the subsequent `SIGNED_IN` / `SIGNED_OUT` event owns that transition. Both
 *    return a user-safe `{ ok } | { ok:false, error }` result for the caller to
 *    render; a returned Supabase error is surfaced, not swallowed.
 *  - One subscription; unsubscribed on unmount; a `active` flag blocks every
 *    write after unmount.
 *  - `accessToken` is served from the cached session (mirrors web `getAccessToken`).
 *
 * Presentation reads this via `useAuthSession()`. Startup never awaits it: only
 * auth-gated surfaces (Profile now, Plans in 4b) read `status`.
 */
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase';
import { MissingEnvError } from '@/lib/env';

import { authErrorMessage } from './errorMessages';
import {
  resendResultFromResponse,
  signUpResultFromResponse,
  type SignUpResult,
} from './signupFlow';
import {
  initFence,
  isRestoreStale,
  onEvent,
  onRestore,
  onRestoreError,
  type FenceState,
} from './restoreEpoch';
import { deriveAuthStatus, type AuthStatus } from './sessionStatus';
import { signInWithAppleNative } from './social/appleAuth';
import { signInWithGoogleNative } from './social/googleAuth';
import type { SocialAuthResult } from './social/socialResult';

export interface AuthSessionValue {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  accessToken: string | null;
  /** User-safe message; non-null only when `status === 'error'`. */
  error: string | null;
  /** `true` when the error is missing Supabase configuration. */
  isConfigError: boolean;
  /**
   * Start a password sign-in. Resolves `{ ok:true }` or `{ ok:false, error }`
   * for the caller to render. Does NOT mutate provider state — the `SIGNED_IN`
   * event does. A resolved `{ ok:true }` does NOT mean `status` is `'signedIn'`
   * yet; callers must wait for `status`.
   */
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Sign out. Resolves `{ ok:true }` or `{ ok:false, error }` — a Supabase
   * `signOut()` error (or a thrown one) is surfaced, never swallowed. Does NOT
   * mutate provider state: on success the `SIGNED_OUT` event owns the
   * `→ signedOut` transition.
   */
  signOut: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Start a native "Sign in with Apple" → Supabase id-token exchange. Thin
   * wrapper over `social/appleAuth`; does NOT mutate provider state — the
   * `SIGNED_IN` event owns the `→ signedIn` transition. Resolves:
   *  - `{ status:'ok' }`        — token accepted; wait for `status`;
   *  - `{ status:'cancelled' }` — user backed out; surface nothing;
   *  - `{ status:'error', message }` — user-safe zh-HK message to render.
   */
  signInWithApple: () => Promise<SocialAuthResult>;
  /**
   * Start a native "Sign in with Google" (Original API) → Supabase id-token
   * exchange. Same contract as `signInWithApple`. `signInWithGoogle()`
   * short-circuits to `{ status:'error' }` when the Google env/config is
   * absent — callers keep the button hidden until then anyway.
   */
  signInWithGoogle: () => Promise<SocialAuthResult>;
  /**
   * Create an account with email + password (`supabase.auth.signUp`). Render-only
   * result (see `signupFlow.ts`) — ANTI-ENUMERATION: on `session: null` it always
   * resolves `{ ok:true, next:'otp', notice }` with the SAME neutral copy whether
   * or not the address already exists; `user.identities` is never inspected.
   * Never mutates provider state — a resulting session arrives via `SIGNED_IN`.
   */
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  /**
   * Verify the 6-digit e-mail OTP (`verifyOtp({ type:'email' })`). On success the
   * client emits `SIGNED_IN`, which owns the `→ signedIn` transition; this
   * resolves `{ ok:true }` and callers wait for `status`. Never `type:'signup'`.
   */
  confirmEmailOtp: (
    email: string,
    token: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  /**
   * Resend the sign-up OTP (`resend({ type:'signup' })`). Render-only result
   * (see `signupFlow.ts`) — ANTI-ENUMERATION: a successful resend AND every
   * account-state error (no such user / already confirmed / no pending signup)
   * both resolve `{ ok:true }`, so callers show the SAME neutral copy. Only
   * operational failures (rate limit / network / service) stay `{ ok:false }`.
   * Never mutates provider state.
   */
  resendSignupOtp: (
    email: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export const AuthSessionContext = createContext<AuthSessionValue | null>(null);

const CONFIG_ERROR_MESSAGE = '應用程式尚未完成設定，暫時無法登入。';
const GENERIC_ERROR_MESSAGE = '登入時發生錯誤，請稍後再試。';

interface ProviderState {
  fence: FenceState;
  /** Provider-layer error string, paired with `fence.isError`. */
  errorMessage: string | null;
  isConfigError: boolean;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // The fence is the source of truth for ordering; it is mutated outside React
  // (in the auth callback / promise handlers) so there are no stale-closure
  // races on `epoch`. `state` mirrors it for rendering.
  const fenceRef = useRef<FenceState>(initFence());
  const [state, setState] = useState<ProviderState>({
    fence: fenceRef.current,
    errorMessage: null,
    isConfigError: false,
  });

  useEffect(() => {
    let active = true;

    const commit = (
      next: FenceState,
      opts?: { errorMessage: string | null; isConfigError: boolean },
    ) => {
      if (!active) return;
      fenceRef.current = next;
      setState({
        fence: next,
        errorMessage: opts?.errorMessage ?? null,
        isConfigError: opts?.isConfigError ?? false,
      });
    };

    // ── Config-error path: no client → no subscription, no getSession() ──
    let client: ReturnType<typeof getSupabaseClient>;
    try {
      client = getSupabaseClient();
    } catch (err) {
      const isConfig = err instanceof MissingEnvError;
      // Settle the fence as an error via the restore path at epoch 0.
      commit(onRestoreError(fenceRef.current, fenceRef.current.epoch), {
        errorMessage: isConfig ? CONFIG_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE,
        isConfigError: isConfig,
      });
      return;
    }

    // ── 1) SUBSCRIBE FIRST ──
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
      if (!active) return;
      // INITIAL_SESSION is completely inert: no state, no epoch bump.
      if (event === 'INITIAL_SESSION') return;
      const before = fenceRef.current;
      const next = onEvent(before, session ?? null, event);
      if (next === before) return; // non-superseding (defensive) — nothing to do
      commit(next);
    });

    // ── 2) THEN getSession() exactly once, epoch-tagged ──
    const issuedAtEpoch = fenceRef.current.epoch;
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (isRestoreStale(fenceRef.current, issuedAtEpoch)) return;
        if (error) {
          commit(onRestoreError(fenceRef.current, issuedAtEpoch), {
            errorMessage: GENERIC_ERROR_MESSAGE,
            isConfigError: false,
          });
          return;
        }
        const session = data.session ?? null;
        commit(onRestore(fenceRef.current, session, issuedAtEpoch));
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isRestoreStale(fenceRef.current, issuedAtEpoch)) return;
        const isConfig = err instanceof MissingEnvError;
        commit(onRestoreError(fenceRef.current, issuedAtEpoch), {
          errorMessage: isConfig ? CONFIG_ERROR_MESSAGE : GENERIC_ERROR_MESSAGE,
          isConfigError: isConfig,
        });
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Actions never touch provider state — the auth-event stream does. Stable
  // identities (they only use the singleton client).
  const signInWithPassword = useCallback<
    AuthSessionValue['signInWithPassword']
  >(async (email, password) => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: authErrorMessage(error) };
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  }, []);

  const signOut = useCallback<AuthSessionValue['signOut']>(async () => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) return { ok: false, error: authErrorMessage(error) };
      // Success: do NOT touch provider state — the SIGNED_OUT event drives the
      // `→ signedOut` transition.
      return { ok: true };
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) };
    }
  }, []);

  // Native social sign-in: thin pass-throughs. The helper performs the native
  // flow + `supabase.auth.signInWithIdToken`; the subsequent SIGNED_IN event —
  // never these functions — writes provider state.
  const signInWithApple = useCallback<AuthSessionValue['signInWithApple']>(
    () => signInWithAppleNative(),
    [],
  );

  const signInWithGoogle = useCallback<AuthSessionValue['signInWithGoogle']>(
    () => signInWithGoogleNative(),
    [],
  );

  // Email sign-up. Adapter only: the anti-enumeration decision + neutral copy
  // live in the pure `signupFlow.ts`; a resulting session is delivered by the
  // SIGNED_IN event, never written here.
  const signUpWithEmail = useCallback<AuthSessionValue['signUpWithEmail']>(
    async (email, password) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({ email, password });
        // Only `hasSession` + the raw error cross the boundary — never
        // `data.user` / `identities`. `signupFlow` folds account-existence
        // errors into the same neutral OTP result as a normal session:null.
        return signUpResultFromResponse({
          hasSession: data.session != null,
          error: error ?? null,
          mapMessage: authErrorMessage,
        });
      } catch (err) {
        return signUpResultFromResponse({
          hasSession: false,
          error: err,
          mapMessage: authErrorMessage,
        });
      }
    },
    [],
  );

  const confirmEmailOtp = useCallback<AuthSessionValue['confirmEmailOtp']>(
    async (email, token) => {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });
        if (error) return { ok: false, error: authErrorMessage(error) };
        // Success: the SIGNED_IN event owns the `→ signedIn` transition.
        return { ok: true };
      } catch (err) {
        return { ok: false, error: authErrorMessage(err) };
      }
    },
    [],
  );

  const resendSignupOtp = useCallback<AuthSessionValue['resendSignupOtp']>(
    async (email) => {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.resend({ type: 'signup', email });
        // ANTI-ENUMERATION: account-state errors (no such user / already
        // confirmed / no pending signup) fold into the SAME `{ ok:true }` as a
        // successful resend; only operational failures stay errors.
        return resendResultFromResponse({
          error: error ?? null,
          mapMessage: authErrorMessage,
        });
      } catch (err) {
        return resendResultFromResponse({ error: err, mapMessage: authErrorMessage });
      }
    },
    [],
  );

  const value = useMemo<AuthSessionValue>(() => {
    const { fence, errorMessage, isConfigError } = state;
    const status = deriveAuthStatus(fence);
    const session = (fence.session as Session | null) ?? null;
    return {
      status,
      session,
      user: session?.user ?? null,
      accessToken: session?.access_token ?? null,
      error: status === 'error' ? errorMessage ?? GENERIC_ERROR_MESSAGE : null,
      isConfigError: status === 'error' ? isConfigError : false,
      signInWithPassword,
      signOut,
      signInWithApple,
      signInWithGoogle,
      signUpWithEmail,
      confirmEmailOtp,
      resendSignupOtp,
    };
  }, [
    state,
    signInWithPassword,
    signOut,
    signInWithApple,
    signInWithGoogle,
    signUpWithEmail,
    confirmEmailOtp,
    resendSignupOtp,
  ]);

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
}
