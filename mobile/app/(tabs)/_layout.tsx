/**
 * Future top-level navigation for the mobile app.
 *
 * Four tabs only:
 *   今日 (today) · 食譜 (recipes) · 餐單 (plans) · 我的 (profile)
 *
 * The shopping list is intentionally NOT a fifth tab — it will be reached from
 * an individual meal plan in a later slice.
 *
 * Screens are placeholders for this foundation slice.
 *
 * PRELOAD: the tab shell is the earliest place guaranteed to run on every
 * normal launch (`/` redirects to `/today`, which mounts this navigator) and
 * always before `useRecipes` can mount. On commit it fires a one-shot
 * `preloadRecipeSummaries()` so the 食譜 list is already in session memory when
 * the user first opens that tab. Fire-and-forget: never awaited, never blocks
 * startup; a failure just leaves the cache empty and the 食譜 tab falls back to
 * its blocking load. A deep link to `app/recipes/[id]` does NOT mount this
 * layout, so deep-link launches are unaffected.
 */
import { useEffect } from 'react';
import { Tabs } from 'expo-router/js-tabs';

import { colors } from '@/constants/theme';
import { preloadRecipeSummaries } from '@/features/recipes';

export default function TabsLayout() {
  useEffect(() => {
    preloadRecipeSummaries().catch(() => {
      // Swallowed on purpose — the summary cache keeps its last good list and
      // `useRecipes` surfaces a genuine cold-load failure with its own error
      // state + retry.
    });
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="today" options={{ title: '今日' }} />
      <Tabs.Screen name="recipes" options={{ title: '食譜' }} />
      <Tabs.Screen name="plans" options={{ title: '餐單' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}
