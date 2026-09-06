/**
 * Recipe image with a strict three-level fallback:
 *
 *   derived variant  →  original image_url  →  emoji placeholder
 *
 * One-way only (see `nextRecipeImagePhase`): a load error advances the phase and
 * never loops back to a network source. A recipe with no original `image_url`
 * renders the emoji immediately and issues no network request at all.
 *
 * Rendering uses `expo-image` (memory + disk cache, off-thread decode,
 * downsampling to the target box) for the two places recipe images appear:
 * the list thumbnail (`RecipeCard`) and the detail hero (`RecipeDetailScreen`).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';

import { colors } from '@/constants/theme';
import {
  initialRecipeImagePhase,
  nextRecipeImagePhase,
  recipeImageUriForPhase,
  type RecipeImagePhase,
  type RecipeImageSources,
} from '../lib/recipeImageUrl';

const TRANSITION_MS = 120;

export interface RecipeImageProps extends RecipeImageSources {
  /** Box style — must carry concrete width/height so layout is stable. */
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Emoji shown as the terminal fallback. */
  emoji: string;
  /** Font size for the emoji fallback. */
  emojiSize: number;
  /**
   * Stable identity for `expo-image` view recycling in a list. Pass the recipe
   * id/slug for `RecipeCard`; omit for the single detail hero.
   */
  recyclingKey?: string;
  accessibilityLabel?: string;
  /** Hide from a11y tree (list rows already label the whole row). */
  decorative?: boolean;
}

export function RecipeImage({
  variantUri,
  originalUri,
  style,
  contentFit = 'cover',
  emoji,
  emojiSize,
  recyclingKey,
  accessibilityLabel,
  decorative = false,
}: RecipeImageProps) {
  const sources = useMemo<RecipeImageSources>(
    () => ({ variantUri, originalUri }),
    [variantUri, originalUri],
  );

  // Re-seed the state machine whenever the underlying recipe image changes.
  const seedPhase = initialRecipeImagePhase(sources);
  const [phase, setPhase] = useState<RecipeImagePhase>(seedPhase);
  const [phaseFor, setPhaseFor] = useState<string>(`${variantUri}|${originalUri}`);

  const currentKey = `${variantUri}|${originalUri}`;
  if (currentKey !== phaseFor) {
    setPhaseFor(currentKey);
    setPhase(seedPhase);
  }

  const handleError = useCallback(() => {
    setPhase((prev) => nextRecipeImagePhase(prev, { originalUri }));
  }, [originalUri]);

  const uri = recipeImageUriForPhase(phase, sources);

  if (uri === null) {
    return (
      <View
        style={[style as StyleProp<ViewStyle>, styles.fallback]}
        accessibilityElementsHidden={decorative}
        importantForAccessibility={decorative ? 'no' : 'auto'}
      >
        <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
      </View>
    );
  }

  return (
    <Image
      // Force a fresh mount when the source URI changes so `onError` always maps
      // to the URI actually being shown.
      key={uri}
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={TRANSITION_MS}
      recyclingKey={recyclingKey}
      onError={handleError}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
});
