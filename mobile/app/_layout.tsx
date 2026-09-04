/**
 * Root layout: app-wide providers + a headerless stack.
 *
 * The tab bar (`app/(tabs)`) is the real home surface, so the root stack keeps
 * its own header hidden. Providers live here because screen components
 * (via `ScreenContainer`) rely on safe-area context.
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
