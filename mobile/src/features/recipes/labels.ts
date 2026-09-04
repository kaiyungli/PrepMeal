/**
 * Tiny display-label helpers for recipe summary fields.
 *
 * This is a deliberately minimal, recipes-feature-local subset of the web
 * taxonomy (`src/constants/taxonomy.ts`). A shared web/mobile taxonomy module
 * is out of scope for this slice; an unknown value falls back to the raw
 * string so nothing is silently hidden.
 */

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '容易',
  medium: '中等',
  hard: '進階',
  // legacy / alternate values seen in existing data
  簡單: '容易',
  容易: '容易',
  中: '中等',
  中等: '中等',
  難: '進階',
  複雜: '進階',
  進階: '進階',
};

const CUISINE_LABELS: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  japanese: '日式',
  korean: '韓式',
  thai: '泰式',
  fusion: 'Fusion',
};

const PROTEIN_LABELS: Record<string, string> = {
  chicken: '雞',
  pork: '豬',
  beef: '牛',
  egg: '蛋',
  tofu: '豆腐',
  shrimp: '蝦',
  seafood: '海鮮',
  fish: '魚',
  mixed: '混合蛋白',
};

const METHOD_LABELS: Record<string, string> = {
  stir_fry: '炒',
  steamed: '蒸',
  fried: '煎',
  boiled: '煮',
  braised: '燜',
  baked: '焗',
  grilled: '燒',
};

export function difficultyLabel(value: string | null): string | null {
  if (!value) return null;
  return DIFFICULTY_LABELS[value] ?? value;
}

export function cuisineLabel(value: string | null): string | null {
  if (!value) return null;
  return CUISINE_LABELS[value] ?? value;
}

export function proteinLabel(value: string | null): string | null {
  if (!value) return null;
  return PROTEIN_LABELS[value] ?? value;
}

export function methodLabel(value: string | null): string | null {
  if (!value) return null;
  return METHOD_LABELS[value] ?? value;
}
