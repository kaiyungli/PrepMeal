/**
 * Recipe detail feature screen.
 *
 * Wiring only: `useRecipeDetail` (controller) -> one of loading / error(+retry) /
 * not-found / success. The route (`app/recipes/[id].tsx`) passes the raw `id`
 * param (a slug or UUID) plus an optional `seed` (`RecipeSummary` decoded from
 * the list) and renders this.
 *
 * PERCEIVED LOADING: when a `seed` is present the screen paints the hero image,
 * title and meta line immediately from that summary, with lightweight skeleton
 * blocks where description / ingredients / steps will go, then swaps in the
 * authoritative RPC payload when it arrives. The seed is never treated as a
 * complete `RecipeDetail` — only its list-level fields are shown, and any
 * authoritative section stays a skeleton until the RPC resolves. A cache hit in
 * `useRecipeDetail` skips the skeleton entirely.
 *
 * Success layout, mobile-native and deliberately plain: image (graceful
 * fallback) -> title -> compact metadata -> description (if any) -> ingredients
 * -> steps. No hero, no nutrition panel, no timers / checkboxes / cooking mode.
 * Ingredient and step order come straight from the RPC and are never re-sorted.
 */
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';
import type {
  RecipeDetail,
  RecipeDetailIngredient,
  RecipeDetailStep,
  RecipeSummary,
} from '@/types/recipe';

import { useRecipeDetail } from '../hooks/useRecipeDetail';
import { recipeHeroSources } from '../lib/recipeImageUrl';
import {
  cuisineLabel,
  difficultyLabel,
  methodLabel,
  proteinLabel,
} from '../labels';
import { RecipeImage } from './RecipeImage';

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

function buildSeedMeta(seed: RecipeSummary): string[] {
  const parts: (string | null)[] = [
    seed.total_time_minutes != null ? `${seed.total_time_minutes} 分鐘` : null,
    difficultyLabel(seed.difficulty),
    cuisineLabel(seed.cuisine),
    proteinLabel(seed.primary_protein),
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

/** A few muted bars standing in for a section that the RPC will fill in. */
function SkeletonSection({ heading, lines }: { heading: string; lines: number }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading} accessibilityRole="header">
        {heading}
      </Text>
      <View
        style={styles.skeletonGroup}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="載入中"
      >
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.skeletonBar,
              index === lines - 1 && styles.skeletonBarShort,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function RecipeHero({
  image_url,
  accessibilityLabel,
}: {
  image_url: string | null;
  accessibilityLabel: string;
}) {
  return (
    <RecipeImage
      {...recipeHeroSources({ image_url })}
      style={styles.image}
      emoji="🍳"
      emojiSize={64}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function RecipeDetailScreen({
  idOrSlug,
  seed = null,
}: {
  idOrSlug: string | undefined;
  seed?: RecipeSummary | null;
}) {
  const { status, recipe, error, refetch } = useRecipeDetail(idOrSlug, { seed });

  if (status === 'notFound') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>找不到呢個食譜。</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'error' || (status !== 'loading' && !recipe)) {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <ErrorState message={error ?? GENERIC_ERROR} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  // ---- Loading: seed-backed partial screen, or a plain spinner with no seed ----
  if (status === 'loading') {
    if (!seed) {
      return (
        <ScreenContainer scroll={false} edges={['bottom']}>
          <LoadingState label="載入食譜中…" />
        </ScreenContainer>
      );
    }

    const seedMeta = buildSeedMeta(seed);
    return (
      <ScreenContainer edges={['bottom']} contentStyle={styles.content}>
        <RecipeHero image_url={seed.image_url} accessibilityLabel={seed.name} />
        <Text style={styles.title} accessibilityRole="header">
          {seed.name}
        </Text>
        {seedMeta.length > 0 && (
          <Text style={styles.meta}>{seedMeta.join(' · ')}</Text>
        )}
        <SkeletonSection heading="簡介" lines={2} />
        <SkeletonSection heading="食材" lines={4} />
        <SkeletonSection heading="烹飪步驟" lines={3} />
      </ScreenContainer>
    );
  }

  // ---- Success: authoritative detail ----
  if (!recipe) {
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
      <RecipeHero image_url={recipe.image_url} accessibilityLabel={recipe.name} />

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
    overflow: 'hidden',
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
  skeletonGroup: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skeletonBar: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  skeletonBarShort: {
    width: '55%',
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
