/**
 * Shopping Category Constants
 * 
 * Single source of truth for shopping list category mapping.
 * Canonical keys: meat_seafood, vegetable, tofu_egg, dairy, carb, seasoning, frozen, pantry, other
 */

// Display labels for canonical keys (used in UI)
export const CATEGORY_LABELS = {
  meat_seafood: '肉類',
  seafood: '海鮮',
  tofu_egg: '豆腐/蛋',
  dairy: '乳製品',
  vegetable: '蔬菜',
  carb: '主食',
  seasoning: '調味料',
  frozen: '雪櫃',
  pantry: '儲備',
  other: '其他'
};

// Icon mapping
export const CATEGORY_ICONS = {
  meat_seafood: '🥩',
  seafood: '🦐',
  tofu_egg: '🥚',
  dairy: '🧈',
  vegetable: '🥬',
  carb: '🍚',
  seasoning: '🧂',
  frozen: '🧊',
  pantry: '📦',
  other: '📦'
};

// Display order for UI
export const CATEGORY_ORDER = [
  'meat_seafood',
  'seafood', 
  'tofu_egg',
  'dairy',
  'vegetable',
  'carb',
  'seasoning',
  'frozen',
  'pantry',
  'other'
];

/**
 * Normalize DB/shopping_category value to canonical key
 * @param {string} category - Raw category from DB
 * @returns {string} - Canonical key
 */
export function normalizeCategory(category) {
  if (!category) return 'other';
  
  const lower = category.toLowerCase().trim();
  
  // Map to canonical keys
  const keyMap = {
    // Meat/Seafood
    'meat': 'meat_seafood',
    'meats': 'meat_seafood',
    'beef': 'meat_seafood',
    'pork': 'meat_seafood',
    'chicken': 'meat_seafood',
    'lamb': 'meat_seafood',
    'duck': 'meat_seafood',
    'meat_seafood': 'meat_seafood',
    'seafood': 'seafood',
    'fish': 'seafood',
    'shrimp': 'seafood',
    'prawn': 'seafood',
    'crab': 'seafood',
    'squid': 'seafood',
    'clam': 'seafood',
    'oyster': 'seafood',
    // Tofu/Egg
    'tofu': 'tofu_egg',
    'tofu_products': 'tofu_egg',
    'egg': 'tofu_egg',
    'eggs': 'tofu_egg',
    // Dairy
    'dairy': 'dairy',
    'milk': 'dairy',
    'cheese': 'dairy',
    'yogurt': 'dairy',
    // Vegetables
    'vegetable': 'vegetable',
    'vegetables': 'vegetable',
    'produce': 'vegetable',
    'mushroom': 'vegetable',
    'mushrooms': 'vegetable',
    'herb': 'vegetable',
    'herbs': 'vegetable',
    'garlic': 'vegetable',
    'ginger': 'vegetable',
    'onion': 'vegetable',
    'scallion': 'vegetable',
    // Carbs
    'carb': 'carb',
    'grains': 'carb',
    'staple': 'carb',
    'rice': 'carb',
    'noodles': 'carb',
    'pasta': 'carb',
    'bread': 'carb',
    // Seasoning
    'seasoning': 'seasoning',
    'condiments': 'seasoning',
    'sauce': 'seasoning',
    'spice': 'seasoning',
    'spices': 'seasoning',
    // Frozen
    'frozen': 'frozen',
    // Pantry
    'pantry': 'pantry',
  };
  
  return keyMap[lower] || 'other';
}

/**
 * Get display label for canonical key
 * @param {string} key - Canonical category key
 * @returns {string} - Display label
 */
export function getCategoryLabel(key) {
  return CATEGORY_LABELS[key] || CATEGORY_LABELS.other;
}

/**
 * Get icon for canonical key
 * @param {string} key - Canonical category key
 * @returns {string} - Emoji icon
 */
export function getCategoryIcon(key) {
  return CATEGORY_ICONS[key] || CATEGORY_ICONS.other;
}
