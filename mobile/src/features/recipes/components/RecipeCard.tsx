/**
 * Recipe summary card — one row in the 食譜 list.
 *
 * Presentation only: takes a normalized `RecipeSummary`, renders name + a small
 * thumbnail + a compact meta line. No Supabase here.
 *
 * When `onPress` is supplied the whole row becomes a button (role + label +
 * pressed-state feedback); navigation itself is decided by the caller
 * (`RecipeListScreen`), so this stays a generic presentation component with no
 * router import. Without `onPress` it renders as a plain, non-interactive row.
 *
 * The name is not line-clamped, so long Cantonese titles wrap fully instead of
 * being truncated; the row grows to fit.
 */
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { RecipeSummary } from '@/types/recipe';

import { cuisineLabel, difficultyLabel } from '../labels';

const THUMB_SIZE = 72;

function buildMeta(recipe: RecipeSummary): string[] {
  const parts: (string | null)[] = [
    recipe.total_time_minutes != null ? `${recipe.total_time_minutes} 分鐘` : null,
    difficultyLabel(recipe.difficulty),
    cuisineLabel(recipe.cuisine),
  ];
  return parts.filter((part): part is string => Boolean(part));
}

function RecipeCardComponent({
  recipe,
  onPress,
}: {
  recipe: RecipeSummary;
  onPress?: () => void;
}) {
  const meta = buildMeta(recipe);
  const accessibilityLabel = [recipe.name, ...meta].join('，');

  const inner = (
    <>
      {recipe.image_url ? (
        <Image
          source={{ uri: recipe.image_url }}
          style={styles.thumb}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[styles.thumb, styles.thumbFallback]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={styles.thumbFallbackText}>🍽️</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name}>{recipe.name}</Text>
        {meta.length > 0 && <Text style={styles.meta}>{meta.join(' · ')}</Text>}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.card} accessible accessibilityLabel={accessibilityLabel}>
      {inner}
    </View>
  );
}

export const RecipeCard = memo(RecipeCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  cardPressed: {
    opacity: 0.6,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: {
    fontSize: 28,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    lineHeight: typography.body + 6,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
