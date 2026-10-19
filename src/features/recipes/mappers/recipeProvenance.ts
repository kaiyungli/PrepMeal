export interface RecipeProvenance {
  source_attribution: { website: string; author: string; url: string | null; note: string } | null;
  nutrition_is_estimate: boolean;
  nutrition_notes: string[];
  allergens: string[];
  allergen_note: string | null;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && Boolean(v.trim())) : [];

function safeUrl(value: unknown): string | null {
  try {
    const url = new URL(text(value));
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

// Publish only reader-facing evidence; never serialize the entire import ledger.
export function recipeProvenance(sourceData: unknown): RecipeProvenance {
  const source = record(sourceData);
  const attribution = record(source.source_attribution);
  const nutrition = record(source.nutrition);
  const url = safeUrl(attribution.original_recipe_url) || safeUrl(source.source_url);
  const website = text(attribution.website) || text(source.publisher);
  const author = text(attribution.author) || text(source.source_author);
  const note = text(attribution.adaptation_note);
  // Import notes can describe alternative products across an entire batch.
  // Do not present that free-text ledger as ingredients in this recipe.
  const hasAllergenNote = Boolean(text(source.allergen_note) || text(source.allergen_notes));
  return {
    source_attribution: url || website || author || note ? { website, author, url, note } : null,
    nutrition_is_estimate: /estimate/i.test(text(nutrition.status)),
    nutrition_notes: strings(nutrition.limitations),
    allergens: [...new Set([...strings(source.base_allergens), ...strings(source.allergens)])],
    allergen_note: hasAllergenNote ? '材料及包裝可能有其他致敏原；請核對實購包裝，選配材料另計。' : null,
  };
}
