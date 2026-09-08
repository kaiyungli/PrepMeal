/**
 * Plan summary card — one row in the 餐單 list.
 *
 * Presentation only: takes a normalized `PlanSummary`, renders title + date
 * range + a compact meta line + an optional 2-item preview from
 * `preview_items`. No Supabase, no navigation decision here — the caller
 * (`PlansListScreen`) supplies `onPress`.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

import type { PlanSummary } from '../types';
import { mealSlotLabel } from '../labels';
import { formatPlanDateRange } from '../lib/planDates';

function buildMeta(plan: PlanSummary): string[] {
  const parts: (string | null)[] = [
    plan.item_count > 0 ? `${plan.item_count} 道菜` : null,
    plan.avg_servings != null ? `${plan.avg_servings} 人份` : null,
  ];
  return parts.filter((part): part is string => Boolean(part));
}

function previewLine(recipeName: string, mealSlot: string | null): string {
  const slot = mealSlotLabel(mealSlot);
  return slot ? `• ${recipeName}（${slot}）` : `• ${recipeName}`;
}

function PlanCardComponent({
  plan,
  onPress,
}: {
  plan: PlanSummary;
  onPress: () => void;
}) {
  const dateRange = formatPlanDateRange(plan.start_date, plan.end_date);
  const meta = buildMeta(plan);
  const preview = plan.preview_items.slice(0, 2);

  const accessibilityLabel = [plan.title, dateRange, ...meta]
    .filter(Boolean)
    .join('，');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.title}>{plan.title}</Text>

      {dateRange ? <Text style={styles.dateRange}>{dateRange}</Text> : null}

      {meta.length > 0 && <Text style={styles.meta}>{meta.join(' · ')}</Text>}

      {preview.length > 0 && (
        <View style={styles.preview}>
          {preview.map((item, index) => (
            <Text key={index} style={styles.previewItem} numberOfLines={1}>
              {previewLine(item.recipe_name, item.meal_slot)}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

export const PlanCard = memo(PlanCardComponent);

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  cardPressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
    lineHeight: typography.body + 6,
  },
  dateRange: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  meta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  preview: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  previewItem: {
    fontSize: typography.caption,
    color: colors.text,
  },
});
