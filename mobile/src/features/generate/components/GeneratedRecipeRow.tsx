/**
 * One recipe row inside a generated day.
 *
 * Modelled on `@/features/recipes` `RecipeCard` (thumb + name + meta line) with
 * one addition: a meal-role badge (完整餐 / 主菜 / 配菜 / 湯), the same label the
 * web plan grid shows. Tapping navigates to the existing recipe-detail route
 * with the same seed + prefetch as the 食譜 list — `GenerateRecipe extends
 * RecipeSummary`, so no adapter is needed.
 *
 * Presentation only: the caller supplies `onPress` / `onPressIn`.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { RecipeImage } from '@/features/recipes';
import { recipeThumbSources } from '@/features/recipes';
import { cuisineLabel, difficultyLabel } from '@/features/recipes/labels';

import type { GenerateRecipe } from '../types.ts';
import { mealRoleLabel } from '../lib/mealRoleLabel.ts';

const THUMB_SIZE = 64;

function metaLine(recipe: GenerateRecipe): string {
  return [
    recipe.total_time_minutes != null ? `${recipe.total_time_minutes} 分鐘` : null,
    difficultyLabel(recipe.difficulty),
    cuisineLabel(recipe.cuisine),
  ]
    .filter((p): p is string => Boolean(p))
    .join(' · ');
}

export interface GeneratedRecipeRowProps {
  recipe: GenerateRecipe;
  onPress: () => void;
  onPressIn?: () => void;
}

function GeneratedRecipeRowComponent({ recipe, onPress, onPressIn }: GeneratedRecipeRowProps) {
  const meta = metaLine(recipe);
  const badge = mealRoleLabel(recipe);
  const a11y = [recipe.name, badge, meta].filter(Boolean).join('，');

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <RecipeImage
        {...recipeThumbSources(recipe)}
        style={styles.thumb}
        emoji="🍽️"
        emojiSize={24}
        recyclingKey={String(recipe.slug ?? recipe.id)}
        decorative
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>
            {recipe.name}
          </Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {meta.length > 0 && <Text style={styles.meta}>{meta}</Text>}
      </View>
    </Pressable>
  );
}

export const GeneratedRecipeRow = memo(GeneratedRecipeRowComponent);

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
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    lineHeight: typography.body + 6,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  badgeText: {
    fontSize: typography.caption - 1,
    color: colors.textMuted,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
