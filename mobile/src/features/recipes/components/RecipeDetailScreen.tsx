/**
 * Recipe detail feature screen.
 *
 * Wiring only: `useRecipeDetail` (controller) -> one of loading / error(+retry) /
 * not-found / success. The route (`app/recipes/[id].tsx`) passes the raw `id`
 * param (a slug or UUID) and renders this.
 *
 * Success layout, mobile-native and deliberately plain: image (graceful
 * fallback) -> title -> compact metadata -> description (if any) -> ingredients
 * -> steps. No hero, no nutrition panel, no timers / checkboxes / cooking mode.
 * Ingredient and step order come straight from the RPC and are never re-sorted.
 */
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type {
  RecipeDetail,
  RecipeDetailIngredient,
  RecipeDetailStep,
} from '@/types/recipe';

import { useRecipeDetail } from '../hooks/useRecipeDetail';
import {
  cuisineLabel,
  difficultyLabel,
  methodLabel,
  proteinLabel,
} from '../labels';

const GENERIC_ERROR = '載入食譜時發生錯誤，請稍後再試。';

function buildMeta(recipe: RecipeDetail): string[] {
  const parts: (string | null)[] = [
    recipe.total_time_minutes != null
      ? `${recipe.total_time_minutes} 分鐘`
      : null,
    difficultyLabel(recipe.difficulty),
    methodLabel(recipe.method),
    cuisineLabel(recipe.cuisine),
    proteinLabel(recipe.primary_protein),
  ];
  return parts.filter((part): part is string => Boolean(part));
}

function formatQuantity(ingredient: RecipeDetailIngredient): string | null {
  const unitName = ingredient.unit?.name ?? null;
  if (ingredient.quantity == null) return unitName;
  return unitName ? `${ingredient.quantity} ${unitName}` : `${ingredient.quantity}`;
}

function IngredientRow({ ingredient }: { ingredient: RecipeDetailIngredient }) {
  const label = ingredient.name || ingredient.slug || '—';
  const quantity = formatQuantity(ingredient);
  return (
    <View style={styles.ingredientRow}>
      <Text style={styles.ingredientName}>{label}</Text>
      {quantity ? <Text style={styles.ingredientQty}>{quantity}</Text> : null}
    </View>
  );
}

function StepRow({
  step,
  displayNo,
}: {
  step: RecipeDetailStep;
  displayNo: number;
}) {
  const minutes =
    step.time_seconds != null && step.time_seconds > 0
      ? Math.round(step.time_seconds / 60)
      : null;
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{displayNo}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={styles.body}>{step.text}</Text>
        {minutes ? (
          <Text style={styles.stepTime}>⏱ 約 {minutes} 分鐘</Text>
        ) : null}
      </View>
    </View>
  );
}

export function RecipeDetailScreen({
  idOrSlug,
}: {
  idOrSlug: string | undefined;
}) {
  const { status, recipe, error, refetch } = useRecipeDetail(idOrSlug);

  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    // Clear a stale load failure when the recipe (its image URL) changes, so
    // navigating between recipes never carries a previous failure forward.
    setImageFailed(false);
  }, [recipe?.image_url]);

  if (status === 'loading') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <LoadingState label="載入食譜中…" />
      </ScreenContainer>
    );
  }

  if (status === 'notFound') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>找不到呢個食譜。</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'error' || !recipe) {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <ErrorState message={error ?? GENERIC_ERROR} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const meta = buildMeta(recipe);
  const steps = recipe.steps.filter((step) => step.text.trim() !== '');

  return (
    <ScreenContainer edges={['bottom']} contentStyle={styles.content}>
      {recipe.image_url && !imageFailed ? (
        <Image
          source={{ uri: recipe.image_url }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View
          style={[styles.image, styles.imageFallback]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Text style={styles.imageFallbackText}>🍳</Text>
        </View>
      )}

      <Text style={styles.title} accessibilityRole="header">
        {recipe.name}
      </Text>

      {meta.length > 0 && <Text style={styles.meta}>{meta.join(' · ')}</Text>}

      {recipe.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading} accessibilityRole="header">
            簡介
          </Text>
          <Text style={styles.body}>{recipe.description}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionHeading} accessibilityRole="header">
          食材
        </Text>
        {recipe.ingredients.length > 0 ? (
          recipe.ingredients.map((ingredient, index) => (
            <IngredientRow
              key={`${ingredient.id || ingredient.slug || 'ingredient'}-${index}`}
              ingredient={ingredient}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>暫無食材資料</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading} accessibilityRole="header">
          烹飪步驟
        </Text>
        {steps.length > 0 ? (
          steps.map((step, index) => (
            <StepRow
              key={`${step.step_no}-${index}`}
              step={step}
              displayNo={step.step_no > 0 ? step.step_no : index + 1}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>暫無步驟資料</Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 64,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: typography.body + 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingredientName: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
  },
  ingredientQty: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.background,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  stepBody: {
    flex: 1,
    gap: spacing.xs,
  },
  stepTime: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notFoundText: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
});
