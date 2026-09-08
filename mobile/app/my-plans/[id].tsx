/**
 * Plan detail route.
 *
 * Lives outside `(tabs)`, so `router.push` from the 餐單 list pushes it onto
 * the root stack — over the tab bar — and the native header back button /
 * swipe returns to the list (same pattern as `app/recipes/[id].tsx`).
 *
 * Thin: reads the `id` param and hands it to the feature screen, which owns
 * the auth gate, the fetch, and every loading / not-found / error / success
 * state. A malformed or missing id resolves to the neutral not-found state
 * inside the feature.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { PlanDetailScreen } from '@/features/plans';

export default function PlanDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: '', headerBackTitle: '返回' }}
      />
      <PlanDetailScreen planId={id} />
    </>
  );
}
