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
 */
import { Tabs } from 'expo-router/js-tabs';

import { colors } from '@/constants/theme';

export default function TabsLayout() {
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
