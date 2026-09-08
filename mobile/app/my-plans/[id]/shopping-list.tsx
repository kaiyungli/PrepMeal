/**
 * Plan shopping-list route (Slice 4C).
 *
 * Sibling of `app/my-plans/[id].tsx`: `router.push` from the plan detail
 * screen pushes it onto the root stack -- over the tab bar -- and the native
 * header back button / swipe returns to the detail screen.
 *
 * Thin: reads the `id` param and hands it to the feature screen, which owns
 * the auth gate, the RPC call, and every loading / not-found / error / empty /
 * success state. A malformed or missing id resolves to the neutral not-found
 * state inside the feature.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { ShoppingListScreen } from '@/features/plans';

export default function PlanShoppingListRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '購物清單',
          headerBackTitle: '返回',
        }}
      />
      <ShoppingListScreen planId={id} />
    </>
  );
}
