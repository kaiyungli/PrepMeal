/**
 * Temporary screen body shared by every top-level tab in this foundation slice.
 *
 * Real feature screens replace these later, following:
 *   route/screen -> feature component/hook -> service/client
 */
import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { colors, spacing, typography } from '@/constants/theme';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '600',
    color: colors.text,
  },
  description: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
});
