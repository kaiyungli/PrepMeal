/**
 * Simple centered error message. Foundation primitive — pairs with
 * `LoadingState` and is expanded (retry action, etc.) in a later slice.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export function ErrorState({
  message = '發生錯誤，請稍後再試。',
}: {
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  message: {
    color: colors.danger,
    fontSize: typography.body,
    textAlign: 'center',
  },
});
