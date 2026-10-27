export interface RecipeProvenance {
  source_attribution: { website: string; author: string; url: string | null; note: string } | null;
  data_quality_notes?: string[];
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
  const qualityNotes = strings(record(source.consistency_review).public_notes);
  const sharedPolicyPrefix = '基本版不含選配。全投入估算並非實際吃下量；骨殼去除率、油鹽吸收及酒精蒸發未實測。';
  const alternativePolicyPrefix = '基本版不含選配；依可食原料及保留情境估算，非化驗值。';
  const policy = text(nutrition.policy);
  const nutritionNotes = [...new Set([
    ...strings(nutrition.limitations).map(note => note.trim()),
    ...strings(nutrition.evidence_cautions).map(note => note.trim()),
    ...(policy.startsWith(sharedPolicyPrefix) ? [sharedPolicyPrefix] : []),
    ...(policy.startsWith(alternativePolicyPrefix) ? [alternativePolicyPrefix] : []),
  ])];
  return {
    ...(qualityNotes.length ? { data_quality_notes: qualityNotes } : {}),
    source_attribution: url || website || author || note ? { website, author, url, note } : null,
    nutrition_is_estimate: /estimate/i.test(text(nutrition.status)),
    nutrition_notes: nutritionNotes,
    allergens: [...new Set([...strings(source.base_allergens), ...strings(source.allergens)])],
    allergen_note: hasAllergenNote ? '材料及包裝可能有其他致敏原；請核對實購包裝，選配材料另計。' : null,
  };
}
