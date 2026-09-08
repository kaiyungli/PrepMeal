/**
 * One day's block in the plan detail screen: a date heading + its meal rows,
 * already grouped and ordered by `mapPlanItemsByDay` (this component does no
 * sorting).
 *
 * Each row with a resolvable recipe is a button; tapping it reuses the
 * EXISTING recipe-detail flow (`app/recipes/[id]` → `RecipeDetailScreen`) via
 * the caller's `onRecipePress` — no second recipe-detail implementation here.
 * A row whose recipe could not be resolved (deleted, or not publicly visible)
 * renders muted and non-interactive, mirroring the web `PlanRecipeCard`
 * fallback.
 *
 * The thumbnail reuses `RecipeImage` / `recipeThumbSources` from the recipes
 * feature so the variant → original → emoji fallback behaves identically to
 * the 食譜 list.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { RecipeImage, recipeThumbSources } from '@/features/recipes';

import type { PlanDay, PlanItem, PlanItemRecipe } from '../types';
import { mealSlotLabel } from '../labels';
import { formatPlanDayHeading } from '../lib/planDates';

const THUMB_SIZE = 56;

function metaLine(item: PlanItem): string | null {
  const parts = [
    mealSlotLabel(item.meal_slot),
    item.servings != null ? `${item.servings} 人份` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : null;
}

function PlanItemRow({
  item,
  onRecipePress,
  onRecipePressIn,
}: {
  item: PlanItem;
  onRecipePress: (recipe: PlanItemRecipe) => void;
  onRecipePressIn: (recipe: PlanItemRecipe) => void;
}) {
  const { recipe } = item;
  const meta = metaLine(item);

  if (!recipe) {
    return (
      <View
        style={[styles.row, styles.rowDisabled]}
        accessible
        accessibilityLabel={['未知食譜', meta].filter(Boolean).join('，')}
      >
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbEmoji}>🍽️</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>未知食譜</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          <Text style={styles.meta}>食譜資料不完整</Text>
        </View>
      </View>
    );
  }

  const accessibilityLabel = [recipe.name, meta].filter(Boolean).join('，');

  return (
    <Pressable
      onPress={() => onRecipePress(recipe)}
      onPressIn={() => onRecipePressIn(recipe)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
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
        <Text style={styles.name}>{recipe.name}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

export function PlanDaySection({
  day,
  onRecipePress,
  onRecipePressIn,
}: {
  day: PlanDay;
  onRecipePress: (recipe: PlanItemRecipe) => void;
  onRecipePressIn: (recipe: PlanItemRecipe) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.dayHeading} accessibilityRole="header">
        {formatPlanDayHeading(day.date)}
      </Text>
      {day.items.map((item) => (
        <PlanItemRow
          key={item.id}
          item={item}
          onRecipePress={onRecipePress}
          onRecipePressIn={onRecipePressIn}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  dayHeading: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 24,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
