/**
 * Root layout: app-wide providers + a headerless stack.
 *
 * The tab bar (`app/(tabs)`) is the real home surface, so the root stack keeps
 * its own header hidden. Providers live here because screen components
 * (via `ScreenContainer`) rely on safe-area context.
 *
 * `SessionProvider` owns the single Supabase auth restore + subscription for the
 * whole app (see `src/features/auth`). It renders its children immediately and
 * never blocks first paint — only auth-gated surfaces read its `status`.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '@/features/auth';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
