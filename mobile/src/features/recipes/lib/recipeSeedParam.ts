/**
 * Encode / decode a `RecipeSummary` for passing list → detail as an Expo Router
 * navigation param.
 *
 * The detail screen uses this to paint image / title / meta immediately while
 * the authoritative `get_recipe_detail_json` RPC is in flight. The payload is
 * tiny (one already-normalised summary row, ~8 short fields) so a JSON string
 * param is appropriate; anything malformed decodes to `null` and the screen
 * simply falls back to its plain loading state.
 */
import type { RecipeSummary } from '@/types/recipe';

export function encodeRecipeSeed(recipe: RecipeSummary): string {
  const seed: RecipeSummary = {
    id: recipe.id,
    slug: recipe.slug,
    name: recipe.name,
    image_url: recipe.image_url,
    cuisine: recipe.cuisine,
    difficulty: recipe.difficulty,
    total_time_minutes: recipe.total_time_minutes,
    primary_protein: recipe.primary_protein,
  };
  return JSON.stringify(seed);
}

/** Parse a seed param. Returns null for anything missing/malformed/wrong-shape. */
export function decodeRecipeSeed(
  raw: string | string[] | undefined | null,
): RecipeSummary | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const row = parsed as Record<string, unknown>;
  const id = row.id;
  const name = row.name;
  if ((typeof id !== 'string' && typeof id !== 'number') || typeof name !== 'string') {
    return null;
  }

  const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  return {
    id: id as RecipeSummary['id'],
    slug: str(row.slug),
    name,
    image_url: str(row.image_url),
    cuisine: str(row.cuisine),
    difficulty: str(row.difficulty),
    total_time_minutes: num(row.total_time_minutes),
    primary_protein: str(row.primary_protein),
  };
}
