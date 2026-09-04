/**
 * Recipe detail route.
 *
 * Lives outside `(tabs)`, so `router.push` from the 食譜 list pushes it onto the
 * root stack — over the tab bar — and the native header back button / swipe
 * returns to the list.
 *
 * Thin: reads the `id` param (a recipe slug or UUID — resolved by the
 * `get_recipe_detail_json` RPC) and hands it to the feature screen, which owns
 * the fetch and every loading / error / not-found / success state.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { RecipeDetailScreen } from '@/features/recipes';

export default function RecipeDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: '', headerBackTitle: '返回' }}
      />
      <RecipeDetailScreen idOrSlug={id} />
    </>
  );
}
