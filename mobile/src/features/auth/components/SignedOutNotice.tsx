/**
 * Signed-out placeholder for an auth-gated surface.
 *
 * Deliberately CONTEXT-FREE: the caller supplies its own `message` (account
 * copy for Profile, plan copy for Plans in 4b, …) and may override the action
 * label / handler. Default action routes to the sign-in screen.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function SignedOutNotice({
  message,
  actionLabel = '登入',
  onAction,
}: {
  /** Context-specific explanation of what signing in unlocks. */
  message: string;
  actionLabel?: string;
  /** Defaults to navigating to `/sign-in`. */
  onAction?: () => void;
}) {
  const router = useRouter();
  const handlePress = onAction ?? (() => router.push('/sign-in'));

  return (
    <View style={styles.wrap}>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        hitSlop={spacing.sm}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  action: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: '600',
  },
});
