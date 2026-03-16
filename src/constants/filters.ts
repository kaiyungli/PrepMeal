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

export const BUDGET_OPTIONS = [
  { value: 'budget', label: '經濟' },
  { value: 'normal', label: '普通' },
  { value: 'premium', label: '高級' },
];

export const INGREDIENT_REUSE = [
  { value: 'normal', label: '普通' },
  { value: 'smart', label: '智能重用' },
];
