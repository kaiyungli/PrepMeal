/**
 * Sign-up route.
 *
 * Lives outside `(tabs)`, mirroring `sign-in.tsx`: `router.push('/sign-up')`
 * stacks it over whatever pushed it; the native header back / swipe returns.
 * The screen dismisses itself once the session is actually signed in.
 */
import { Stack } from 'expo-router';

import { SignUpScreen } from '@/features/auth';

export default function SignUpRoute() {
  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: '註冊', headerBackTitle: '返回' }}
      />
      <SignUpScreen />
    </>
  );
}
