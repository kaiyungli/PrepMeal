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
 * Navigation (`onPress`) is never gated or delayed — a screen reader's
 * "activate" still navigates immediately, whether or not it also happens to
 * trigger the press-intent gate below.
 *
 * `onPressIn` (touch-down, before the press completes) is exposed separately
 * so the caller can start a recipe-detail prefetch ahead of navigation — this
 * component still has no idea THAT's what it's for, but it does gate the
 * call behind a short `PressIntentGate` (armed on press-in, cancelled on
 * press-out) so a scroll-graze — a touch-down immediately swallowed by the
 * list's scroll gesture — never fires it. See `../lib/pressIntentGate.ts`.
 *
 * The name is not line-clamped, so long Cantonese titles wrap fully instead of
 * being truncated; the row grows to fit.
 */
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import type { RecipeSummary } from '@/types/recipe';

import { cuisineLabel, difficultyLabel } from '../labels';
import { recipeThumbSources } from '../lib/recipeImageUrl';
import { PressIntentGate, PRESS_INTENT_DELAY_MS } from '../lib/pressIntentGate';
import { RecipeImage } from './RecipeImage';

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
  onPressIn,
}: {
  recipe: RecipeSummary;
  onPress?: () => void;
  /** Fires at touch-down, before `onPress`. Used to start a prefetch. */
  onPressIn?: () => void;
}) {
  const meta = buildMeta(recipe);
  const accessibilityLabel = [recipe.name, ...meta].join('，');

  const thumbSources = recipeThumbSources(recipe);

  // Lazily create one gate per card instance and clear it on unmount, so a
  // row scrolled off-screen mid-arm never fires its (now pointless) callback.
  const pressIntentGateRef = useRef<PressIntentGate | null>(null);
  if (pressIntentGateRef.current === null) {
    pressIntentGateRef.current = new PressIntentGate(PRESS_INTENT_DELAY_MS);
  }
  useEffect(() => () => pressIntentGateRef.current?.cancel(), []);

  const handlePressIn = onPressIn
    ? () => pressIntentGateRef.current?.arm(onPressIn)
    : undefined;
  const handlePressOut = onPressIn ? () => pressIntentGateRef.current?.cancel() : undefined;

  const inner = (
    <>
      <RecipeImage
        {...thumbSources}
        style={styles.thumb}
        emoji="🍽️"
        emojiSize={28}
        recyclingKey={String(recipe.slug ?? recipe.id)}
        decorative
      />

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
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
    overflow: 'hidden',
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
