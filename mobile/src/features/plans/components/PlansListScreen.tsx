/**
 * 餐單 feature screen — the signed-in "my plans" list.
 *
 * Wiring only. Auth gate first (`useAuthSession`), then the data controller
 * (`useMyPlans`, scoped to the signed-in user id) → states → `FlatList` of
 * `PlanCard`. The route (`app/(tabs)/plans.tsx`) just renders this.
 *
 * States: auth restoring · auth error · signed out (CTA) · loading · error
 * (retry) · empty · success (with pull-to-refresh).
 */
import { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/constants/theme';
import { SignedOutNotice, useAuthSession } from '@/features/auth';

import type { PlanSummary } from '../types';
import { useMyPlans } from '../hooks/useMyPlans';
import { authScopeKey } from '../lib/authScope';
import { PlanCard } from './PlanCard';

function keyExtractor(plan: PlanSummary): string {
  return plan.id;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

function Heading() {
  return (
    <Text style={styles.heading} accessibilityRole="header">
      餐單
    </Text>
  );
}

export function PlansListScreen() {
  const router = useRouter();
  const { status: authStatus, error: authError, user } = useAuthSession();
  // Scope plan state to the stable signed-in user id. An identity change
  // (A → B) flips this key and forces useMyPlans to drop A's list and refetch;
  // a token refresh for the same id leaves it untouched. RLS is still the
  // ownership boundary — this key only invalidates in-memory client state.
  const authScope = authScopeKey(authStatus, user?.id ?? null);
  const { status, plans, error, refreshing, refetch } = useMyPlans({ authScope });

  const renderItem = useCallback(
    ({ item }: { item: PlanSummary }) => (
      <PlanCard
        plan={item}
        onPress={() =>
          router.push({ pathname: '/my-plans/[id]', params: { id: item.id } })
        }
      />
    ),
    [router],
  );

  if (authStatus === 'restoring') {
    return (
      <ScreenContainer scroll={false}>
        <Heading />
        <LoadingState label="載入中…" />
      </ScreenContainer>
    );
  }

  if (authStatus === 'error') {
    return (
      <ScreenContainer scroll={false}>
        <Heading />
        <ErrorState message={authError ?? '發生錯誤，請稍後再試。'} />
      </ScreenContainer>
    );
  }

  if (authStatus === 'signedOut') {
    return (
      <ScreenContainer>
        <Heading />
        <SignedOutNotice message="登入後可查看你已儲存的餐單。" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <Heading />

      {(status === 'idle' || status === 'loading') && (
        <LoadingState label="載入餐單中…" />
      )}

      {status === 'error' && (
        <ErrorState
          message={error ?? '載入餐單時發生錯誤，請稍後再試。'}
          onRetry={refetch}
        />
      )}

      {status === 'success' && (
        <FlatList
          style={styles.list}
          data={plans}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>你仲未有已儲存嘅餐單。</Text>
            </View>
          }
          contentContainerStyle={
            plans.length === 0 ? styles.emptyContent : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor={colors.textMuted}
            />
          }
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
    gap: spacing.sm,
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
