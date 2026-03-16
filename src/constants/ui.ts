// UI text and display policy constants

// Category display order for shopping list
export const CATEGORY_ORDER = ['肉類', '海鮮', '蛋', '豆腐', '蔬菜', '調味料', '主食', '其他'];

// Category icons
export const CATEGORY_ICONS: Record<string, string> = {
  '肉類': '🥩',
  '海鮮': '🦐',
  '蛋': '🥚',
  '豆腐': '🧈',
  '蔬菜': '🥬',
  '調味料': '🧂',
  '主食': '🍚',
  '其他': '📦'
};

// Category to Chinese label mapping (DB -> Display)
export const CATEGORY_MAP: Record<string, string> = {
  // Meat
  'meat_seafood': '肉類', 'meat': '肉類', 'beef': '肉類', 'pork': '肉類', 'chicken': '肉類', 'lamb': '肉類', 'duck': '肉類',
  // Seafood
  'seafood': '海鮮', 'fish': '海鮮', 'shrimp': '海鮮', 'prawn': '海鮮', 'crab': '海鮮', 'squid': '海鮮', 'clam': '海鮮', 'oyster': '海鮮',
  // Eggs
  'egg': '蛋', 'eggs': '蛋',
  // Tofu
  'tofu': '豆腐', 'tofu_products': '豆腐',
  // Vegetables
  'vegetables': '蔬菜', 'produce': '蔬菜', 'vegetable': '蔬菜', 'mushroom': '蔬菜', 'mushrooms': '蔬菜',
  // Condiments
  'condiments': '調味料', 'seasoning': '調味料', 'sauce': '調味料', 'spice': '調味料', 'spices': '調味料',
  // Staples
  'staple': '主食', 'grains': '主食', 'rice': '主食', 'noodles': '主食', 'pasta': '主食', 'bread': '主食',
  // Other
  'herbs': '蔬菜', 'herb': '蔬菜', 'garlic': '調味料', 'ginger': '調味料', 'onion': '蔬菜', 'scallion': '蔬菜',
  'lemon': '蔬菜', 'lime': '蔬菜'
};
