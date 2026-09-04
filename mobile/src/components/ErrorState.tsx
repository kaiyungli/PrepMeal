/**
 * Simple centered error message, optionally with a retry button.
 *
 * Pairs with `LoadingState`. `onRetry` is optional and backward-compatible —
 * when omitted the component renders exactly as before (message only).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function ErrorState({
  message = '發生錯誤，請稍後再試。',
  onRetry,
  retryLabel = '重試',
}: {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  message: {
    color: colors.danger,
    fontSize: typography.body,
    textAlign: 'center',
  },
  retry: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryPressed: {
    opacity: 0.6,
  },
  retryText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
