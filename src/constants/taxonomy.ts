// ============================================
// TAXONOMY CONSTANTS - Single Source of Truth
// ============================================
// Centralized enum value -> Chinese label mappings
// Used throughout the app for display labels

// ============================================
// CUISINE MAP
// ============================================
// Only primary values - no legacy duplicates
export const CUISINE_MAP: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  japanese: '日式',
  korean: '韓式',
  thai: '泰式',
  fusion: 'Fusion',
};

// Use primary keys only - no duplicates
export const CUISINE_OPTIONS = Object.keys(CUISINE_MAP)
  .filter(key => !key.includes('中') && !key.includes('西') && !key.includes('日') && !key.includes('韓') && !key.includes('泰'))
  .map(value => ({ value, label: CUISINE_MAP[value] }));

// ============================================
// DISH TYPE MAP
// ============================================
// Only primary values - no legacy duplicates
export const DISH_TYPE_MAP: Record<string, string> = {
  main: '主菜',
  side: '配菜',
  staple: '主食',
  soup: '湯',
};

// Use primary keys only - no duplicates
export const DISH_TYPE_OPTIONS = Object.keys(DISH_TYPE_MAP)
  .map(value => ({ value, label: DISH_TYPE_MAP[value] }));

// ============================================
// PROTEIN MAP
// ============================================
// Only primary values - no legacy duplicates
export const PROTEIN_MAP: Record<string, string> = {
  chicken: '雞',
  pork: '豬',
  beef: '牛',
  egg: '蛋',
  tofu: '豆腐',
  shrimp: '蝦',
  fish: '魚',
  mixed: '混合蛋白',
};

// Use primary keys only - no duplicates
export const PROTEIN_OPTIONS = Object.keys(PROTEIN_MAP)
  .filter(key => key.length <= 10)
  .map(value => ({ value, label: PROTEIN_MAP[value] }));

// ============================================
// METHOD MAP
// ============================================
export const METHOD_MAP: Record<string, string> = {
  stir_fry: '炒',
  steamed: '蒸',
  fried: '煎',
  boiled: '煮',
  braised: '燜',
  baked: '焗',
  // Aliases
  stir: '炒',
  steam: '蒸',
  boil: '煮',
  bake: '焗',
  grill: '燒',
  // Legacy/alt values
  炒: '炒',
  蒸: '蒸',
  煎: '煎',
  煮: '煮',
  焗: '焗',
  炆: '燜',
  燒: '燒',
};

// Only canonical method values for UI - no aliases
export const METHOD_OPTIONS = [
  { value: 'stir_fry', label: '炒' },
  { value: 'steamed', label: '蒸' },
  { value: 'fried', label: '煎' },
  { value: 'boiled', label: '煮' },
  { value: 'braised', label: '燜' },
  { value: 'baked', label: '焗' },
];

// ============================================
// SPEED MAP
// ============================================
export const SPEED_MAP: Record<string, string> = {
  quick: '快',
  normal: '一般',
  slow: '慢',
  // Legacy/alt values
  快: '快',
  中: '一般',
  慢: '慢',
};

export const SPEED_OPTIONS = Object.entries(SPEED_MAP)
  .filter(([key]) => !key.includes('快') && !key.includes('慢') && !key.includes('中'))
  .map(([value, label]) => ({ value, label }));

// ============================================
// DIFFICULTY MAP
// ============================================
export const DIFFICULTY_MAP: Record<string, string> = {
  easy: '容易',
  medium: '中等',
  hard: '進階',
  // Legacy/alt values
  簡單: '容易',
  容易: '容易',
  中: '中等',
  中等: '中等',
  難: '進階',
  複雜: '進階',
  進階: '進階',
};

export const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '容易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '進階' },
];

// ============================================
// DIET MAP
// ============================================
export const DIET_MAP: Record<string, string> = {
  general: '普通',
  vegetarian: '素食',
  egg_lacto: '蛋奶素',
  high_protein: '高蛋白',
  low_fat: '低脂',
  low_calorie: '低卡',
  light: '清淡',
  gluten_free: '無麩質',
  // Legacy/alt values
  普通: '普通',
  素食: '素食',
  高蛋白: '高蛋白',
  低卡: '低卡',
  低脂: '低脂',
  清淡: '清淡',
};

export const DIET_OPTIONS = [
  { value: 'general', label: '普通' },
  { value: 'vegetarian', label: '素食' },
  { value: 'egg_lacto', label: '蛋奶素' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_fat', label: '低脂' },
  { value: 'low_calorie', label: '低卡' },
];

// ============================================
// FLAVOR MAP
// ============================================
export const FLAVOR_MAP: Record<string, string> = {
  salty: '鹹',
  sweet: '甜',
  sour: '酸',
  spicy: '辣',
  // Legacy/alt values
  鹹: '鹹',
  甜: '甜',
  酸: '酸',
  辣: '辣',
  // Remove old values - use only these 4
  savory: '鹹',
  umami: '鹹',
  tangy: '酸',
  garlicky: '鹹',
  creamy: '甜',
  buttery: '甜',
  sesame: '鹹',
  peppery: '辣',
};

export const FLAVOR_OPTIONS = [
  { value: 'salty', label: '鹹' },
  { value: 'sweet', label: '甜' },
  { value: 'sour', label: '酸' },
  { value: 'spicy', label: '辣' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert a map to options array (value + label)
 */
export function mapToOptions(map: Record<string, string>): Array<{ value: string; label: string }> {
  return Object.entries(map)
    .filter(([_, label]) => label) // Filter out empty labels
    .map(([value, label]) => ({ value, label }));
}

/**
 * Get single label from map
 * @param map - The label map
 * @param value - The enum value
 * @param fallback - Fallback if not found (default: empty string)
 */
export function getLabel(map: Record<string, string>, value: string | undefined, fallback = ''): string {
  if (!value) return fallback;
  return map[value] || fallback;
}

/**
 * Get multiple labels from map
 * @param map - The label map  
 * @param values - Array of enum values
 * @param fallback - Fallback if not found (default: empty string)
 */
export function getLabels(map: Record<string, string>, values: string[] | undefined, fallback = ''): string[] {
  if (!values || !Array.isArray(values)) return [];
  return values.map(v => map[v] || fallback);
}
