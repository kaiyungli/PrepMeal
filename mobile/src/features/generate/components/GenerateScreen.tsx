/**
 * 今日 tab — Generate preview.
 *
 * Flow: load the lean candidate pool -> pick days + composition -> tap 生成 ->
 * the vendored web planner runs client-side -> a 7-day preview. Regenerate
 * re-runs for a fresh random draw. Tapping a recipe opens the existing
 * recipe-detail route. No filters / pantry / locks / replace / save in 4D-B.
 *
 * States: recipe loading · fetch error (+retry) · no recipes · ready ·
 * generating · generated · under-filled ("empty" plan).
 */
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';

import { useGenerateRecipes } from '../hooks/useGenerateRecipes.ts';
import { useGeneratePlan } from '../hooks/useGeneratePlan.ts';
import { GenerateSettings } from './GenerateSettings.tsx';
import { GeneratedPlanList } from './GeneratedPlanList.tsx';

export function GenerateScreen() {
  const recipes = useGenerateRecipes();
  const plan = useGeneratePlan();

  const poolReady = recipes.status === 'success' && recipes.recipes.length > 0;
  const generating = plan.status === 'generating';
  const hasResult = plan.status === 'generated' || plan.status === 'empty';

  const onGenerate = useCallback(() => {
    if (poolReady) plan.generate(recipes.recipes);
  }, [poolReady, plan, recipes.recipes]);

  const controls = (
    <View style={styles.controls}>
      <GenerateSettings
        days={plan.days}
        composition={plan.composition}
        onDaysChange={plan.setDays}
        onCompositionChange={plan.setComposition}
        disabled={generating}
      />
      <Pressable
        onPress={onGenerate}
        disabled={!poolReady || generating}
        accessibilityRole="button"
        accessibilityState={{ disabled: !poolReady || generating }}
        accessibilityLabel={hasResult ? '重新生成' : '生成餐單'}
        style={({ pressed }) => [
          styles.cta,
          (!poolReady || generating) && styles.ctaDisabled,
          pressed && poolReady && !generating && styles.ctaPressed,
        ]}
      >
        {generating ? (
          <View style={styles.ctaBusy}>
            <ActivityIndicator color={colors.background} />
            <Text style={styles.ctaText}>生成中…</Text>
          </View>
        ) : (
          <Text style={styles.ctaText}>{hasResult ? '重新生成' : '生成餐單'}</Text>
        )}
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.heading} accessibilityRole="header">
        一週餐單
      </Text>

      {recipes.status === 'loading' && <LoadingState label="載入食譜中…" />}

      {recipes.status === 'error' && (
        <ErrorState
          message={recipes.error ?? '載入食譜時發生錯誤，請稍後再試。'}
          onRetry={recipes.refetch}
        />
      )}

      {recipes.status === 'success' && recipes.recipes.length === 0 && (
        <ErrorState message="暫時未有可用食譜，無法生成餐單。" onRetry={recipes.refetch} />
      )}

      {poolReady && !hasResult && (
        <View style={styles.body}>
          {controls}
          {plan.status === 'idle' && (
            <Text style={styles.hint}>揀好日數同餐單，就可以生成一週晚餐。</Text>
          )}
        </View>
      )}

      {poolReady && hasResult && (
        <GeneratedPlanList
          sections={plan.sections}
          header={
            <View style={styles.resultHeader}>
              {controls}
              {plan.status === 'empty' && (
                <Text style={styles.hint}>
                  可用食譜不足以填滿整週，已盡量安排。可調整設定再試。
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    gap: spacing.md,
  },
  controls: {
    gap: spacing.md,
  },
  resultHeader: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '700',
  },
  hint: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
