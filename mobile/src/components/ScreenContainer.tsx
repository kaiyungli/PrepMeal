/**
 * Reusable screen shell: safe-area aware, mobile-first, neutral background.
 *
 * Every route screen should render its content inside this so padding and
 * safe-area handling stay consistent. Intentionally simple — not a design
 * system.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type ScreenContainerProps = {
  children: ReactNode;
  /** Wrap content in a vertical ScrollView. Default: true. */
  scroll?: boolean;
  /** Which edges get safe-area insets. Default: top + bottom. */
  edges?: Edge[];
  contentStyle?: ViewStyle;
};

export function ScreenContainer({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  contentStyle,
}: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
});
