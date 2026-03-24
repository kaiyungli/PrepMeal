// ============================================
// TAXONOMY CONSTANTS - Single Source of Truth
// ============================================
// Centralized enum value -> Chinese label mappings
// Used throughout the app for display labels

// ============================================
// CUISINE MAP
// ============================================
export const CUISINE_MAP: Record<string, string> = {
  chinese: '中式',
  western: '西式',
  japanese: '日式',
  korean: '韓式',
  thai: '泰式',
  fusion: 'Fusion',
  // Legacy/alt values
  中式: '中式',
  西式: '西式',
  日式: '日式',
  韓式: '韓式',
  泰式: '泰式',
};

export const CUISINE_OPTIONS = Object.entries(CUISINE_MAP)
  .filter(([key]) => !key.includes('中式') && !key.includes('西式') && !key.includes('日式') && !key.includes('韓式') && !key.includes('泰式'))
  .map(([value, label]) => ({ value, label }));

// ============================================
// DISH TYPE MAP
// ============================================
export const DISH_TYPE_MAP: Record<string, string> = {
  main: '主菜',
  side: '配菜',
  staple: '主食',
  soup: '湯',
  // Legacy/alt values
  主菜: '主菜',
  配菜: '配菜',
  主食: '主食',
  湯: '湯',
};

export const DISH_TYPE_OPTIONS = Object.entries(DISH_TYPE_MAP)
  .filter(([key]) => !key.includes('主') && !key.includes('配') && !key.includes('湯'))
  .map(([value, label]) => ({ value, label }));

// ============================================
// PROTEIN MAP
// ============================================
export const PROTEIN_MAP: Record<string, string> = {
  chicken: '雞',
  pork: '豬',
  beef: '牛',
  egg: '蛋',
  tofu: '豆腐',
  shrimp: '蝦',
  fish: '魚',
  mixed: '混合蛋白',
  // Legacy/alt values
  雞: '雞',
  豬: '豬',
  牛: '牛',
  蛋: '蛋',
  豆腐: '豆腐',
  蝦: '蝦',
  魚: '魚',
};

export const PROTEIN_OPTIONS = Object.entries(PROTEIN_MAP)
  .filter(([key]) => key.length <= 6 && !key.includes('混合'))
  .map(([value, label]) => ({ value, label }));

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

export const METHOD_OPTIONS = Object.entries(METHOD_MAP)
  .filter(([key]) => !key.includes('蒸') && !key.includes('煎') && !key.includes('煮') && !key.includes('焗') && !key.includes('燒') && key.length <= 6)
  .map(([value, label]) => ({ value, label }));

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

export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_MAP)
  .filter(([key]) => !key.includes('容易') && !key.includes('中等') && !key.includes('進階') && !key.includes('簡單') && !key.includes('複雜') && !key.includes('難'))
  .map(([value, label]) => ({ value, label }));

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

export const DIET_OPTIONS = Object.entries(DIET_MAP)
  .filter(([key]) => !key.includes('普通') && !key.includes('素食') && !key.includes('高蛋白') && !key.includes('低'))
  .map(([value, label]) => ({ value, label }));

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
