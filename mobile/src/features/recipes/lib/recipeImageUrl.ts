/**
 * Recipe image URL derivation + a pure fallback state machine.
 *
 * The backend stores only the ORIGINAL image at `recipes.image_url`
 * (`…/storage/v1/object/public/recipes/<base>.<ext>`). A dev/ops script
 * (`mobile/scripts/generate-image-variants.mjs`) pre-generates two WebP
 * derivatives alongside it, at deterministic paths:
 *
 *   thumb   …/storage/v1/object/public/recipes/variants/thumb/<base>.webp   (240×240 cover)
 *   detail  …/storage/v1/object/public/recipes/variants/detail/<base>.webp  (w=900)
 *
 * The app derives those URLs by string transform — no DB column, no lookup,
 * no manifest. If a variant object does not exist yet, the component's load
 * error handler walks the fallback chain (variant → original → emoji) via the
 * pure helpers at the bottom of this file.
 *
 * Anything that is not a recognisably Supabase `recipes`-bucket public URL
 * (null, a bare filename, an unrelated CDN, an already-derived `variants/` URL)
 * yields `null` for both variants, and callers fall straight back to the
 * original `image_url` (or the emoji placeholder when that is null too).
 */
import type { RecipeSummary } from '@/types/recipe';

const OBJECT_PUBLIC_PREFIX = '/storage/v1/object/public/recipes/';

const VARIANT_PREFIX = {
  thumb: 'variants/thumb/',
  detail: 'variants/detail/',
} as const;

export type RecipeImageVariant = keyof typeof VARIANT_PREFIX;

export interface RecipeVariantUrls {
  /** 240×240 cover WebP for list rows, or null when it cannot be derived. */
  thumb: string | null;
  /** ~900px-wide WebP for the detail hero, or null when it cannot be derived. */
  detail: string | null;
}

/**
 * Split a Supabase public `recipes` object URL into `{ origin, base }`, where
 * `base` is the object path inside the bucket without its file extension.
 * Returns null unless the URL is an `http(s)` Supabase `recipes`-bucket public
 * object URL that is NOT already a derived `variants/…` path.
 */
function parseRecipeObjectUrl(
  imageUrl: string | null | undefined,
): { origin: string; base: string } | null {
  if (typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (trimmed === '' || !/^https?:\/\//i.test(trimmed)) return null;

  const markerIndex = trimmed.indexOf(OBJECT_PUBLIC_PREFIX);
  if (markerIndex === -1) return null;

  const origin = trimmed.slice(0, markerIndex);
  const afterMarker = trimmed.slice(markerIndex + OBJECT_PUBLIC_PREFIX.length);

  // Drop any query string / fragment, then strip a single trailing extension.
  const objectPath = afterMarker.replace(/[?#].*$/, '');
  if (objectPath === '' || objectPath.endsWith('/')) return null;

  const base = objectPath.replace(/\.[^./]+$/, '');
  if (base === '' || base.startsWith('variants/')) return null;

  return { origin, base };
}

/** Build one variant URL from an original `image_url`, or null if underivable. */
export function recipeVariantUrl(
  imageUrl: string | null | undefined,
  variant: RecipeImageVariant,
): string | null {
  const parsed = parseRecipeObjectUrl(imageUrl);
  if (!parsed) return null;
  return `${parsed.origin}${OBJECT_PUBLIC_PREFIX}${VARIANT_PREFIX[variant]}${parsed.base}.webp`;
}

/** Both derived variant URLs for an original `image_url`. */
export function deriveRecipeVariantUrls(
  imageUrl: string | null | undefined,
): RecipeVariantUrls {
  return {
    thumb: recipeVariantUrl(imageUrl, 'thumb'),
    detail: recipeVariantUrl(imageUrl, 'detail'),
  };
}

// ---------------------------------------------------------------------------
// Pure fallback state machine: variant → original → emoji, strictly one-way.
// ---------------------------------------------------------------------------

/**
 * Which image source a recipe image component should currently attempt.
 * `emoji` is the terminal state — the local placeholder, no network.
 */
export type RecipeImagePhase = 'variant' | 'original' | 'emoji';

export interface RecipeImageSources {
  /** Derived variant URL for the desired size, or null if underivable. */
  variantUri: string | null;
  /** The authoritative original `image_url`, or null when the recipe has none. */
  originalUri: string | null;
}

/**
 * The first phase to render for a recipe:
 *  - no original at all            → `emoji` immediately (never hits the network)
 *  - original present, no variant  → `original`
 *  - original + variant present    → `variant`
 */
export function initialRecipeImagePhase({
  variantUri,
  originalUri,
}: RecipeImageSources): RecipeImagePhase {
  if (!originalUri) return 'emoji';
  if (!variantUri) return 'original';
  return 'variant';
}

/**
 * Advance the state machine after a load error in `current`. Strictly one-way
 * (`variant → original → emoji`); `emoji` is terminal, so repeated errors can
 * never loop back to a network source. A missing original short-circuits
 * `variant → emoji`.
 */
export function nextRecipeImagePhase(
  current: RecipeImagePhase,
  { originalUri }: Pick<RecipeImageSources, 'originalUri'>,
): RecipeImagePhase {
  if (current === 'variant') return originalUri ? 'original' : 'emoji';
  return 'emoji';
}

/** The URI to load for a phase, or null for the emoji placeholder. */
export function recipeImageUriForPhase(
  phase: RecipeImagePhase,
  { variantUri, originalUri }: RecipeImageSources,
): string | null {
  if (phase === 'variant') return variantUri;
  if (phase === 'original') return originalUri;
  return null;
}

// ---------------------------------------------------------------------------
// Convenience for the two call sites.
// ---------------------------------------------------------------------------

/** Sources for a list-row thumbnail built from a summary/detail-shaped object. */
export function recipeThumbSources(recipe: {
  image_url: string | null;
}): RecipeImageSources {
  return {
    variantUri: recipeVariantUrl(recipe.image_url, 'thumb'),
    originalUri: recipe.image_url ?? null,
  };
}

/** Sources for the detail hero built from a summary/detail-shaped object. */
export function recipeHeroSources(recipe: {
  image_url: string | null;
}): RecipeImageSources {
  return {
    variantUri: recipeVariantUrl(recipe.image_url, 'detail'),
    originalUri: recipe.image_url ?? null,
  };
}

export type { RecipeSummary };
