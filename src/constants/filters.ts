// Filter option constants - UI display policy only
// Values (keys) remain English for API/logic, labels are Chinese for display

export const DIET_MODES = [
  { value: 'general', label: '一般' },
  { value: 'vegetarian', label: '素食' },
  { value: 'egg_lacto', label: '蛋奶素' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_fat', label: '低脂' },
  { value: 'light', label: '清淡' },
];

// Canonical diet values (labels defined by context)
export const DIET_VALUES = [
  { value: 'general' },
  { value: 'vegetarian' },
  { value: 'egg_lacto' },
  { value: 'high_protein' },
  { value: 'low_fat' },
  { value: 'light' },
];

export const EXCLUSIONS = [
  { value: 'beef', label: '不牛' },
  { value: 'pork', label: '不豬' },
  { value: 'chicken', label: '不雞' },
  { value: 'seafood', label: '不海鮮' },
  { value: 'eggs', label: '不蛋' },
  { value: 'dairy', label: '不奶' },
  { value: 'spicy', label: '不辣' },
];

export const CUISINES = [
  { value: 'chinese', label: '中式' },
  { value: 'japanese', label: '日式' },
  { value: 'korean', label: '韓式' },
  { value: 'western', label: '西式' },
  { value: 'taiwanese', label: '台式' },
  { value: 'se_asian', label: '東南亞' },
];

// Canonical cuisine values (labels defined by context)
export const CUISINE_VALUES = [
  { value: 'chinese' },
  { value: 'western' },
  { value: 'japanese' },
  { value: 'korean' },
  { value: 'taiwanese' },
  { value: 'se_asian' },
];

export const COOKING_CONSTRAINTS = [
  { value: 'under_15', label: '15分鐘內' },
  { value: 'under_30', label: '30分鐘內' },
  { value: 'under_45', label: '45分鐘內' },
  { value: 'easy', label: '簡易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困難' },
  { value: 'one_pot', label: '一鍋料理' },
  { value: 'air_fryer', label: '氣炸鍋' },
];

// ============================================
// GENERATE-SIDE CONSTRAINT HELPERS
// ============================================

// Time constraints for generate page (under_X format)
export const GENERATE_TIME_CONSTRAINTS = [
  { value: 'under_15', label: '15分鐘內' },
  { value: 'under_30', label: '30分鐘內' },
  { value: 'under_45', label: '45分鐘內' },
];

// Difficulty constraints for generate page
export const GENERATE_DIFFICULTY_CONSTRAINTS = [
  { value: 'easy', label: '簡易' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困難' },
];

// Equipment/method constraints for generate page
export const GENERATE_EQUIPMENT_CONSTRAINTS = [
  { value: 'one_pot', label: '一鍋料理' },
  { value: 'air_fryer', label: '氣炸鍋' },
];

export const BUDGET_OPTIONS = [
  { value: 'budget', label: '經濟' },
  { value: 'normal', label: '普通' },
  { value: 'premium', label: '高級' },
];

export const INGREDIENT_REUSE = [
  { value: 'normal', label: '普通' },
  { value: 'smart', label: '智能重用' },
];

// Homepage filter specific constants
export const DISH_TYPE = [
  { value: 'main', label: '主菜' },
  { value: 'side', label: '配菜' },
  { value: 'soup', label: '湯' },
  { value: 'staple', label: '主食' },
  { value: 'snack', label: '小食' },
];

export const COOKING_METHODS = [
  { value: 'stir_fry', label: '炒' },
  { value: 'steamed', label: '蒸' },
  { value: 'fried', label: '煎/炸' },
  { value: 'braised', label: '燜/紅燒' },
  { value: 'boiled', label: '煮/湯' },
  { value: 'baked', label: '焗' },
];

export const PROTEIN_TYPES = [
  { value: 'chicken', label: '雞' },
  { value: 'beef', label: '牛' },
  { value: 'pork', label: '豬' },
  { value: 'fish', label: '魚' },
  { value: 'shrimp', label: '蝦' },
  { value: 'tofu', label: '豆腐' },
  { value: 'egg', label: '蛋' },
  { value: 'vegetarian', label: '素' },
  { value: 'mixed', label: '混合' },
];

export const TIME_OPTIONS = [
  { value: '15', label: '15分鐘內' },
  { value: '30', label: '30分鐘內' },
  { value: '60', label: '60分鐘內' },
];

// Canonical time values (for recipe page / API)
// Generate page uses under_X format in COOKING_CONSTRAINTS
export const TIME_VALUES = [
  { value: '15' },
  { value: '30' },
  { value: '60' },
];

// Canonical difficulty values (labels defined by context)
export const DIFFICULTY_VALUES = [
  { value: 'easy' },
  { value: 'medium' },
  { value: 'hard' },
];

// ============================================
// RECIPE PAGE OPTION BUILDERS
// ============================================

// Helper to build cuisine options for recipe page (canonical + extensions)
export function buildRecipeCuisineOptions() {
  return [
    ...CUISINE_VALUES.map(c => ({
      ...c,
      label: c.value === 'chinese' ? '中式' : c.value === 'western' ? '西式' : c.value === 'japanese' ? '日式' : c.value === 'korean' ? '韓式' : c.value === 'taiwanese' ? '台式' : '東南亞'
    })),
    { value: 'thai', label: '泰式' },
    { value: 'fusion', label: '混合' },
  ];
}

// Helper to build time options for recipe page (unified: 15/30/60分鐘內)
export function buildRecipeTimeOptions() {
  return TIME_VALUES.map(t => ({
    ...t,
    label: t.value === '15' ? '15分鐘內' : t.value === '30' ? '30分鐘內' : '60分鐘內'
  }));
}

// Helper to build difficulty options for recipe page (unified with generate: 簡易/中等/困難)
export function buildRecipeDifficultyOptions() {
  return DIFFICULTY_VALUES.map(d => ({
    ...d,
    label: d.value === 'easy' ? '簡易' : d.value === 'medium' ? '中等' : '困難'
  }));
}

// Helper to build diet options for recipe page (canonical + extensions)
export function buildRecipeDietOptions() {
  return [
    ...DIET_VALUES.map(d => ({
      ...d,
      label: d.value === 'general' ? '一般' : d.value === 'vegetarian' ? '素食' : d.value === 'egg_lacto' ? '蛋奶素' : d.value === 'high_protein' ? '高蛋白' : d.value === 'low_fat' ? '低脂' : '清淡'
    })),
    { value: 'low_calorie', label: '低卡' },
    { value: 'gluten_free', label: '無麩質' },
  ];
}
