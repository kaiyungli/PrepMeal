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

// Internal QA status lines (source not yet verified, not test-cooked) stay in
// source_data for the editors, but are not shown on the recipe page: the About
// page already says times and nutrition are estimates, and repeating the
// review status on ~200 recipes reads as unfinished content.
const HIDDEN_NOTE_PREFIXES = ['原始食譜來源仍未核實', '本版為重新整理的家庭配方', '本頁是重新訂定的一人份參考配方'];
const TIME_NOTE_PREFIX = '備料及烹調時間按現有做法估算，未經計時試煮。';

export function readerNote(note: string): string | null {
  if (HIDDEN_NOTE_PREFIXES.some(prefix => note.startsWith(prefix))) return null;
  if (note.startsWith(TIME_NOTE_PREFIX)) {
    const rest = note.slice(TIME_NOTE_PREFIX.length).trim();
    return rest ? `時間為估算：${rest}` : null;
  }
  return note.replace('，未經實煮；', '；');
}

// Adaptation notes keep the useful "what changed from the source" detail, but
// drop the editor's not-test-cooked disclaimers in the same way as readerNote.
const SOURCE_NOTE_REWRITES: Array<[string, string]> = [
  ['；全部克重、毫升及兩人份為本版編定，並非宣稱原作者定量或試煮認可。', ''],
  ['圖片為AI生成示意，非實煮照片。', '圖片為AI生成示意圖。'],
  ['圖片為AI生成示意，未經實煮。', '圖片為AI生成示意圖。'],
  ['，因此只作靈感，未作試煮或營養證明。', '，因此只作靈感。'],
  ['；未經實煮。', '。'],
  ['；未試煮。', '。'],
  ['，未試煮。', '。'],
  ['，未經試煮。', '。'],
];

export function readerSourceNote(note: string): string {
  return SOURCE_NOTE_REWRITES.reduce((text, [from, to]) => text.split(from).join(to), note).trim();
}

// Publish only reader-facing evidence; never serialize the entire import ledger.
export function recipeProvenance(sourceData: unknown): RecipeProvenance {
  const source = record(sourceData);
  const attribution = record(source.source_attribution);
  const nutrition = record(source.nutrition);
  const url = safeUrl(attribution.original_recipe_url) || safeUrl(source.source_url);
  const website = text(attribution.website) || text(source.publisher);
  const author = text(attribution.author) || text(source.source_author);
  const note = readerSourceNote(text(attribution.adaptation_note));
  // Import notes can describe alternative products across an entire batch.
  // Do not present that free-text ledger as ingredients in this recipe.
  const hasAllergenNote = Boolean(text(source.allergen_note) || text(source.allergen_notes));
  const qualityNotes = strings(record(source.consistency_review).public_notes)
    .map(note => readerNote(note.trim()))
    .filter((note): note is string => Boolean(note));
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
