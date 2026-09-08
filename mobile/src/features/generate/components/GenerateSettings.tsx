/**
 * The two Generate-preview settings: days per week and daily composition.
 *
 * Labels match the web generate page (`src/components/generate/GenerateSettings.tsx`):
 *   days         -> `${d}天`
 *   complete_meal -> 一份完整餐 · meat_veg -> 一肉一菜 · two_meat_one_veg -> 二肉一菜
 *
 * Presentation only — state lives in `useGeneratePlan`. Disabled while a plan is
 * generating so settings can't change mid-run.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

import type { CompositionMode, DaysPerWeek } from '../types.ts';
import { COMPOSITION_OPTIONS, DAYS_OPTIONS } from '../hooks/useGeneratePlan.ts';

const COMPOSITION_LABELS: Record<CompositionMode, string> = {
  complete_meal: '一份完整餐',
  meat_veg: '一肉一菜',
  two_meat_one_veg: '二肉一菜',
};

interface SegmentedProps<T extends string | number> {
  label: string;
  options: readonly T[];
  value: T;
  format: (option: T) => string;
  onChange: (option: T) => void;
  disabled?: boolean;
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  format,
  onChange,
  disabled,
}: SegmentedProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={String(option)}
              onPress={() => !disabled && !selected && onChange(option)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!disabled }}
              accessibilityLabel={format(option)}
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && !selected && styles.segmentPressed,
                disabled && styles.segmentDisabled,
              ]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                {format(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export interface GenerateSettingsProps {
  days: DaysPerWeek;
  composition: CompositionMode;
  onDaysChange: (days: DaysPerWeek) => void;
  onCompositionChange: (composition: CompositionMode) => void;
  disabled?: boolean;
}

function GenerateSettingsComponent({
  days,
  composition,
  onDaysChange,
  onCompositionChange,
  disabled,
}: GenerateSettingsProps) {
  return (
    <View style={styles.container}>
      <Segmented
        label="每週日數"
        options={DAYS_OPTIONS}
        value={days}
        format={(d) => `${d}天`}
        onChange={onDaysChange}
        disabled={disabled}
      />
      <Segmented
        label="每日餐單"
        options={COMPOSITION_OPTIONS}
        value={composition}
        format={(c) => COMPOSITION_LABELS[c]}
        onChange={onCompositionChange}
        disabled={disabled}
      />
    </View>
  );
}

export const GenerateSettings = memo(GenerateSettingsComponent);

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segment: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentPressed: {
    backgroundColor: colors.surface,
  },
  segmentDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    fontSize: typography.body,
    color: colors.text,
  },
  segmentTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
});
