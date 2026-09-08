/**
 * Sign-in route.
 *
 * Lives outside `(tabs)`, so `router.push('/sign-in')` from an auth-gated tab
 * stacks it over the tab bar; the native header back / swipe returns. The
 * screen itself dismisses once the session is actually signed in.
 */
import { Stack } from 'expo-router';

import { SignInScreen } from '@/features/auth';

export default function SignInRoute() {
  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: '登入', headerBackTitle: '返回' }}
      />
      <SignInScreen />
    </>
  );
}
