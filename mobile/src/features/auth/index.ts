/**
 * Auth feature — public surface.
 *
 * 4a exposes auth STATE + ACTIONS only. There is no preload seam / registry:
 * a future slice reacts to `useAuthSession().status === 'signedIn'` in its own
 * React effect.
 */
export { SessionProvider } from './SessionProvider';
export type { AuthSessionValue } from './SessionProvider';
export { useAuthSession } from './useAuthSession';
export type { AuthStatus } from './sessionStatus';
export type { SocialAuthResult } from './social/socialResult';
export type { SignUpResult, SignUpStep } from './signupFlow';
export { SignInScreen } from './components/SignInScreen';
export { SignUpScreen } from './components/SignUpScreen';
export { SignedOutNotice } from './components/SignedOutNotice';
