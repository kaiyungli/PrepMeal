/**
 * One category block in the plan shopping-list screen: an icon + label
 * heading, then its ingredient lines (name on the left, pre-formatted
 * quantity on the right).
 *
 * Pure presentation. Ordering, labels, icons and the quantity text are all
 * decided upstream in `../lib/shoppingListModel.ts` (ported verbatim from the
 * web) -- this component does no sorting, formatting, or normalization.
 */
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

import type { ShoppingListCategory } from '../lib/shoppingListModel';

export function ShoppingListCategorySection({
  category,
}: {
  category: ShoppingListCategory;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">
        {category.icon} {category.label}
      </Text>
      <View style={styles.card}>
        {category.items.map((line, index) => (
          <View
            key={line.ingredientId ?? `${category.key}:${line.name}:${index}`}
            style={[styles.row, index > 0 && styles.rowDivider]}
            accessible
            accessibilityLabel={
              line.quantityText
                ? `${line.name}，${line.quantityText}`
                : line.name
            }
          >
            <Text style={styles.name}>{line.name}</Text>
            {line.quantityText ? (
              <Text style={styles.qty}>{line.quantityText}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  name: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
  },
  qty: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
});
