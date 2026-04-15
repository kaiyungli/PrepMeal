// Shopping List Mappers - Strict Type Contract

import type { 
  ShoppingCategoryKey, 
  ShoppingListResponse, 
  ShoppingListViewModel,
  ShoppingListSectionViewModel 
} from '../types';
import { SHOPPING_CATEGORY_ORDER, SHOPPING_CATEGORY_META, CATEGORY_LABELS, CATEGORY_ICONS } from '../constants';

// Map raw category string to canonical key - Comprehensive coverage
export function mapRawCategoryToKey(raw: string | null | undefined): ShoppingCategoryKey {
  if (!raw) return 'other';
  
  const normalized = raw.toLowerCase().trim();
  
  // Direct canonical matches
  if (normalized in SHOPPING_CATEGORY_META) {
    return normalized as ShoppingCategoryKey;
  }
  
  // Comprehensive alias map
  const aliases: Record<string, ShoppingCategoryKey> = {
    // Meat
    'meat': 'meat', 'meats': 'meat', 'meat_seafood': 'meat',
    'beef': 'meat', 'pork': 'meat', 'chicken': 'meat', 'lamb': 'meat', 'duck': 'meat',
    '牛肉': 'meat', '豬': 'meat', '豬肉': 'meat', '雞': 'meat', '羊肉': 'meat', '鴨': 'meat',
    
    // Seafood
    'seafood': 'seafood', 'seafoods': 'seafood',
    'fish': 'seafood', 'shrimp': 'seafood', 'prawn': 'seafood', 'crab': 'seafood', 'squid': 'seafood', 'clam': 'seafood', 'oyster': 'seafood',
    '海鮮': 'seafood', '海产': 'seafood', '魚': 'seafood', '蝦': 'seafood', '蟹': 'seafood', '魷魚': 'seafood', '蜆': 'seafood', '蠔': 'seafood',
    
    // Tofu/Egg
    'tofu': 'tofu_egg', 'tofu_products': 'tofu_egg', 'egg': 'tofu_egg', 'eggs': 'tofu_egg',
    '豆腐': 'tofu_egg', '豆腐製品': 'tofu_egg', '蛋': 'tofu_egg', '雞蛋': 'tofu_egg',
    
    // Vegetable
    'vegetable': 'vegetable', 'vegetables': 'vegetable', 'produce': 'vegetable',
    'mushroom': 'vegetable', 'mushrooms': 'vegetable', 'herb': 'vegetable', 'herbs': 'vegetable',
    'onion': 'vegetable', 'scallion': 'vegetable', 'green_onion': 'vegetable',
    '蔬菜': 'vegetable', '蔬': 'vegetable', '菇': 'vegetable', '香草': 'vegetable', '洋蔥': 'vegetable', '蔥': 'vegetable',
    
    // Carb
    'carb': 'carb', 'staple': 'carb', 'grains': 'carb',
    'rice': 'carb', 'noodles': 'carb', 'pasta': 'carb', 'bread': 'carb', 'noodle': 'carb',
    '主食': 'carb', '米': 'carb', '麵': 'carb', '意粉': 'carb', '麵包': 'carb', '粉': 'carb',
    
    // Seasoning
    'seasoning': 'seasoning', 'seasonings': 'seasoning', 'condiments': 'seasoning', 'sauce': 'seasoning',
    'spice': 'seasoning', 'spices': 'seasoning',
    '調味料': 'seasoning', '調味': 'seasoning', '醬': 'seasoning', '醬汁': 'seasoning', '香料': 'seasoning',
    
    // Dairy
    'dairy': 'dairy', 'dairy_product': 'dairy',
    'milk': 'dairy', 'cheese': 'dairy', 'yogurt': 'dairy', 'yoghurt': 'dairy',
    '乳製品': 'dairy', '奶': 'dairy', '芝士': 'dairy', '乳酪': 'dairy',
    
    // Frozen
    'frozen': 'frozen', 'frozen_food': 'frozen',
    '雪櫃': 'frozen', '雪': 'frozen', '冰鮮': 'frozen',
    
    // Pantry
    'pantry': 'pantry', 'pantry_item': 'pantry', 'storage': 'pantry',
    '儲備': 'pantry', '儲存': 'pantry', '乾貨': 'pantry',
    
    // Other
    'other': 'other', 'misc': 'other', 'others': 'other',
    '其他': 'other', '雜': 'other',
  };
  
  if (aliases[normalized]) return aliases[normalized];
  
  return 'other';
}

// Map API response to ViewModel
export function mapShoppingListResponseToViewModel(
  response: ShoppingListResponse
): ShoppingListViewModel {
  const pantry = Array.isArray(response?.pantry) ? response.pantry : [];
  const toBuyRaw = Array.isArray(response?.toBuy) ? response.toBuy : [];
  
  // Map sections to view model with UI fields
  const sections: ShoppingListSectionViewModel[] = toBuyRaw.map((section) => {
    const category = mapRawCategoryToKey(section.category);
    return {
      categoryKey: category,
      categoryLabel: CATEGORY_LABELS[category],
      categoryIcon: CATEGORY_ICONS[category],
      items: Array.isArray(section.items) ? section.items : [],
    };
  });
  
  // Sort by category order
  sections.sort((a, b) => {
    const orderA = SHOPPING_CATEGORY_ORDER.indexOf(a.categoryKey);
    const orderB = SHOPPING_CATEGORY_ORDER.indexOf(b.categoryKey);
    return orderA - orderB;
  });
  
  const toBuyCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  
  return {
    pantry,
    sections,
    summary: {
      pantryCount: pantry.length,
      toBuyCount,
      sectionCount: sections.length,
    },
    isEmpty: pantry.length === 0 && toBuyCount === 0,
  };
}

// Format shopping list as copy text
export function formatShoppingListCopyText(
  viewModel: ShoppingListViewModel
): string {
  const lines: string[] = [];
  
  // Pantry section
  if (viewModel.pantry.length > 0) {
    lines.push('🗄️ 庫存:');
    viewModel.pantry.forEach(item => {
      lines.push(`  • ${item.name}`);
    });
  }
  
  // Buy sections
  viewModel.sections.forEach(section => {
    if (section.items.length === 0) return;
    lines.push(`\n${section.categoryIcon} ${section.categoryLabel}:`);
    section.items.forEach(item => {
      const qty = item.quantity !== null && item.quantity !== 0 
        ? String(item.quantity) 
        : (item.quantityPending ? '適量' : '');
      const unit = item.unit || '';
      lines.push(`  • ${item.name} ${qty} ${unit}`.trim());
    });
  });
  
  return lines.join('\n');
}
