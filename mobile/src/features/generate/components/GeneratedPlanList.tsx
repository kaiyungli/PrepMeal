/**
 * The generated 7-day plan as a `SectionList` (one section per day).
 *
 * Navigation reuses the existing recipe-detail route exactly as the 食譜 list
 * does: `router.push('/recipes/[id]', { id: slug ?? id, seed })` +
 * `prefetchRecipeDetail` on press-in.
 *
 * A day with no recipe (insufficient pool for that slot/role) renders a muted
 * placeholder line rather than vanishing, so the preview stays honest about
 * under-fill.
 */
import { useCallback, type ReactElement } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { encodeRecipeSeed } from '@/features/recipes';
import { prefetchRecipeDetail } from '@/features/recipes';

import type { GenerateRecipe, PlanDaySection } from '../types.ts';
import { GeneratedRecipeRow } from './GeneratedRecipeRow.tsx';

function keyExtractor(recipe: GenerateRecipe, index: number): string {
  return `${String(recipe.id)}:${index}`;
}

export interface GeneratedPlanListProps {
  sections: PlanDaySection[];
  /** Rendered above the list (e.g. the Regenerate button + summary). */
  header?: ReactElement | null;
}

export function GeneratedPlanList({ sections, header }: GeneratedPlanListProps) {
  const router = useRouter();

  const renderItem = useCallback(
    ({ item }: { item: GenerateRecipe }) => {
      const idOrSlug = item.slug ?? String(item.id);
      return (
        <GeneratedRecipeRow
          recipe={item}
          onPress={() =>
            router.push({
              pathname: '/recipes/[id]',
              params: { id: idOrSlug, seed: encodeRecipeSeed(item) },
            })
          }
          onPressIn={() => prefetchRecipeDetail(idOrSlug)}
        />
      );
    },
    [router],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: PlanDaySection }) => (
      <View style={[styles.dayHeader, section.isWeekend && styles.dayHeaderWeekend]}>
        <Text style={styles.dayTitle}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: PlanDaySection }) =>
      section.data.length === 0 ? (
        <Text style={styles.emptyDay}>未能安排菜式</Text>
      ) : null,
    [],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={ItemSeparator}
      SectionSeparatorComponent={SectionSeparator}
    />
  );
}

function ItemSeparator() {
  return <View style={styles.itemSeparator} />;
}
function SectionSeparator() {
  return <View style={styles.sectionSeparator} />;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xl,
    gap: 0,
  },
  dayHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  dayHeaderWeekend: {
    backgroundColor: colors.border,
  },
  dayTitle: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDay: {
    fontSize: typography.caption,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  itemSeparator: {
    height: spacing.sm,
  },
  sectionSeparator: {
    height: spacing.md,
  },
});
