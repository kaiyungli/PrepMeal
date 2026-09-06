/**
 * 食譜 feature screen.
 *
 * Owns nothing itself beyond wiring: `useRecipes` (controller) -> states ->
 * `FlatList` of `RecipeCard`. The route (`app/(tabs)/recipes.tsx`) just renders
 * this.
 *
 * States rendered: loading · error (with retry) · empty · success.
 */
import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/constants/theme';
import type { RecipeSummary } from '@/types/recipe';

import { useRecipes } from '../hooks/useRecipes';
import { encodeRecipeSeed } from '../lib/recipeSeedParam';
import { prefetchRecipeDetail } from '../services/recipeDetailPrefetch';
import { RecipeCard } from './RecipeCard';

function keyExtractor(recipe: RecipeSummary): string {
  return String(recipe.id);
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

function EmptyRecipes() {
  return (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>暫時未有食譜。</Text>
    </View>
  );
}

export function RecipeListScreen() {
  const router = useRouter();
  const { status, recipes, error, refetch } = useRecipes();

  const renderItem = useCallback(
    ({ item }: { item: RecipeSummary }) => (
      <RecipeCard
        recipe={item}
        onPress={() =>
          router.push({
            pathname: '/recipes/[id]',
            params: { id: item.slug ?? String(item.id), seed: encodeRecipeSeed(item) },
          })
        }
        onPressIn={() => prefetchRecipeDetail(item.slug ?? String(item.id))}
      />
    ),
    [router],
  );

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.heading} accessibilityRole="header">
        食譜
      </Text>

      {status === 'loading' && <LoadingState label="載入食譜中…" />}

      {status === 'error' && (
        <ErrorState message={error ?? '載入食譜時發生錯誤，請稍後再試。'} onRetry={refetch} />
      )}

      {status === 'success' && (
        <FlatList
          style={styles.list}
          data={recipes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={EmptyRecipes}
          contentContainerStyle={
            recipes.length === 0 ? styles.emptyContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.text,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
