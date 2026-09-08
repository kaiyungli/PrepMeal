/**
 * Plan shopping-list feature screen (Slice 4C). Read-only.
 *
 * Wiring only, and deliberately the SAME shape as `PlanDetailScreen`: auth
 * gate first (`useAuthSession`), then `usePlanShoppingList` (scoped to the
 * signed-in user id via the shared `authScopeKey`) -> one of loading /
 * not-found / error(+retry) / empty / success. The route
 * (`app/my-plans/[id]/shopping-list.tsx`) passes the raw `id` param and
 * renders this.
 *
 * NOT-FOUND is neutral and shared with the detail screen: an unknown id, a
 * malformed id, and a plan owned by another user all render the same
 * "搵唔到呢個餐單。" -- the screen never reveals whether the id belongs to
 * someone else. EMPTY ("冇需要購買嘅材料。") is a separate state: it only
 * shows for a plan the user demonstrably owns.
 *
 * No checkboxes, no purchased state, no editing, no export -- out of scope for
 * this slice.
 */
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/constants/theme';
import { SignedOutNotice, useAuthSession } from '@/features/auth';

import { usePlanShoppingList } from '../hooks/usePlanShoppingList';
import { authScopeKey } from '../lib/authScope';
import { ShoppingListCategorySection } from './ShoppingListCategorySection';

const GENERIC_ERROR = '載入購物清單時發生錯誤，請稍後再試。';

export function ShoppingListScreen({
  planId,
}: {
  planId: string | string[] | undefined;
}) {
  const { status: authStatus, error: authError, user } = useAuthSession();
  // Same scoping as PlanDetailScreen: an identity change drops the previous
  // user's list and refetches; a same-id token refresh does not. The RPC's
  // in-body auth.uid() check still owns access.
  const authScope = authScopeKey(authStatus, user?.id ?? null);
  const { status, categories, itemCount, error, refetch } = usePlanShoppingList(
    planId,
    { authScope },
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
        <SignedOutNotice message="登入後可查看購物清單。" />
      </ScreenContainer>
    );
  }

  if (status === 'loading') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <LoadingState label="載入購物清單中…" />
      </ScreenContainer>
    );
  }

  if (status === 'notFound') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.mutedText}>搵唔到呢個餐單。</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (status === 'error') {
    return (
      <ScreenContainer scroll={false} edges={['bottom']}>
        <ErrorState message={error ?? GENERIC_ERROR} onRetry={refetch} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['bottom']} contentStyle={styles.content}>
      <Text style={styles.title} accessibilityRole="header">
        購物清單
      </Text>

      {itemCount === 0 ? (
        <Text style={styles.mutedText}>冇需要購買嘅材料。</Text>
      ) : (
        categories.map((category) => (
          <ShoppingListCategorySection key={category.key} category={category} />
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  mutedText: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
