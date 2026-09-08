/**
 * Plan detail feature screen.
 *
 * Wiring only. Auth gate first (`useAuthSession`), then `usePlanDetail`
 * (scoped to the signed-in user id) → one of loading / not-found /
 * error(+retry) / success. The route (`app/my-plans/[id].tsx`) passes the raw
 * `id` param and renders this.
 *
 * NOT-FOUND is neutral and shared: an unknown id, a malformed id, and a plan
 * owned by another user all render the same "搵唔到呢個餐單。" — the screen
 * never reveals whether the id belongs to someone else.
 *
 * RECIPE TAP reuses the existing mobile recipe-detail flow: it pushes
 * `app/recipes/[id]` with a MINIMAL valid seed built from the plan item's
 * embedded recipe (id / slug / name / image only — every other summary field
 * null), so the detail screen paints image + title immediately and the
 * `get_recipe_detail_json` RPC fills in the rest. `onPressIn` starts the
 * shared `prefetchRecipeDetail` so the RPC overlaps the screen-push
 * transition, exactly as the 食譜 list does. No recipe normalization or
 * modal logic is duplicated here.
 */
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { SignedOutNotice, useAuthSession } from '@/features/auth';
import { encodeRecipeSeed, prefetchRecipeDetail } from '@/features/recipes';
import type { RecipeSummary } from '@/types/recipe';

import type { PlanDetail, PlanItemRecipe } from '../types';
import { usePlanDetail } from '../hooks/usePlanDetail';
import { authScopeKey } from '../lib/authScope';
import { formatPlanDateRange } from '../lib/planDates';
import { PlanDaySection } from './PlanDaySection';

const GENERIC_ERROR = '載入餐單時發生錯誤，請稍後再試。';

/** Minimal valid `RecipeSummary` seed — only the fields the plan item carries. */
function planRecipeSeed(recipe: PlanItemRecipe): RecipeSummary {
  return {
    id: recipe.id,
    slug: recipe.slug,
    name: recipe.name,
    image_url: recipe.image_url,
    cuisine: null,
    difficulty: null,
    total_time_minutes: null,
    primary_protein: null,
  };
}

function buildMeta(plan: PlanDetail): string[] {
  const parts: (string | null)[] = [
    plan.item_count > 0 ? `${plan.item_count} 道菜` : null,
    plan.avg_servings != null ? `${plan.avg_servings} 人份` : null,
    formatPlanDateRange(plan.start_date, plan.end_date),
  ];
  return parts.filter((part): part is string => Boolean(part));
}

export function PlanDetailScreen({
  planId,
}: {
  planId: string | string[] | undefined;
}) {
  const router = useRouter();
  const { status: authStatus, error: authError, user } = useAuthSession();
  // Scope plan state to the stable signed-in user id (see PlansListScreen).
  // An identity change forces usePlanDetail to drop the previous user's plan
  // and refetch; a same-id token refresh does not. RLS still owns access.
  const authScope = authScopeKey(authStatus, user?.id ?? null);
  const { status, plan, days, error, refetch } = usePlanDetail(planId, {
    authScope,
  });

  const openRecipe = useCallback(
    (recipe: PlanItemRecipe) => {
      router.push({
        pathname: '/recipes/[id]',
        params: {
          id: recipe.slug ?? recipe.id,
          seed: encodeRecipeSeed(planRecipeSeed(recipe)),
        },
      });
    },
    [router],
  );

  const prefetchRecipe = useCallback((recipe: PlanItemRecipe) => {
    prefetchRecipeDetail(recipe.slug ?? recipe.id);
  }, []);

  const openShoppingList = useCallback(
    (id: string) => {
      router.push({
        pathname: '/my-plans/[id]/shopping-list',
        params: { id },
      });
    },
    [router],
  );

  if (authStatus === 'restoring') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <LoadingState label="載入中…" />
      </ScreenContainer>
    );
  }

  if (authStatus === 'error') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <ErrorState message={authError ?? '發生錯誤，請稍後再試。'} />
      </ScreenContainer>
    );
  }

  if (authStatus === 'signedOut') {
    return (
      <ScreenContainer edges={['bottom']}>
        <SignedOutNotice message="登入後可查看餐單詳情。" />
      </ScreenContainer>
    );
  }

  if (status === 'loading') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <LoadingState label="載入餐單中…" />
      </ScreenContainer>
    );
  }

  if (status === 'notFound') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.notFoundText}>搵唔到呢個餐單。</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'error' || !plan) {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <ErrorState message={error ?? GENERIC_ERROR} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  const meta = buildMeta(plan);

  return (
    <ScreenContainer edges={['bottom']} contentStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        {plan.title}
      </Text>

      {meta.length > 0 && <Text style={styles.meta}>{meta.join(' · ')}</Text>}

      <Pressable
        onPress={() => openShoppingList(plan.id)}
        accessibilityRole="button"
        accessibilityLabel="查看購物清單"
        style={({ pressed }) => [
          styles.shoppingButton,
          pressed && styles.shoppingButtonPressed,
        ]}
      >
        <Text style={styles.shoppingButtonIcon}>🛒</Text>
        <Text style={styles.shoppingButtonLabel}>購物清單</Text>
        <Text style={styles.shoppingButtonChevron}>›</Text>
      </Pressable>

      {days.length === 0 ? (
        <Text style={styles.emptyText}>呢個餐單暫時未有餐點。</Text>
      ) : (
        days.map((day) => (
          <PlanDaySection
            key={day.date ?? 'undated'}
            day={day}
            onRecipePress={openRecipe}
            onRecipePressIn={prefetchRecipe}
          />
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
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
  shoppingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shoppingButtonPressed: {
    opacity: 0.6,
  },
  shoppingButtonIcon: {
    fontSize: typography.title,
  },
  shoppingButtonLabel: {
    flex: 1,
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  shoppingButtonChevron: {
    fontSize: typography.title,
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
