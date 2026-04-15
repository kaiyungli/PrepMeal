// Shopping List Mappers

import type { 
  ShoppingCategoryKey, 
  ShoppingListBuyItem, 
  ShoppingListSection,
  ShoppingListResponse 
} from '../types';
import { SHOPPING_CATEGORY_ORDER, SHOPPING_CATEGORY_META, CATEGORY_LABELS, CATEGORY_ICONS } from '../constants';

// Map raw category string to canonical key
export function mapRawCategoryToKey(raw: string | null | undefined): ShoppingCategoryKey {
  if (!raw) return 'other';
  
  const normalized = raw.toLowerCase().trim();
  
  // Direct matches
  if (normalized in SHOPPING_CATEGORY_META) {
    return normalized as ShoppingCategoryKey;
  }
  
  // Aliases
  const aliases: Record<string, ShoppingCategoryKey> = {
    '肉': 'meat',
    '海鮮': 'seafood',
    '海产': 'seafood',
    '豆腐': 'tofu_egg',
    '蛋': 'tofu_egg',
    '蔬菜': 'vegetable',
    '蔬': 'vegetable',
    '主食': 'carb',
    '米': 'carb',
    '麵': 'carb',
    '調味料': 'seasoning',
    '調味': 'seasoning',
    '乳製品': 'dairy',
    '奶': 'dairy',
    '雪櫃': 'frozen',
    '雪': 'frozen',
    '儲備': 'pantry',
    '儲存': 'pantry',
    '其他': 'other',
  };
  
  if (aliases[normalized]) return aliases[normalized];
  
  return 'other';
}

// Map raw API response to canonical ViewModel
export function mapShoppingListResponseToViewModel(response: any): {
  pantry: any[];
  sections: ShoppingListSection[];
  summary: { pantryCount: number; toBuyCount: number; sectionCount: number };
  isEmpty: boolean;
} {
  const pantry = Array.isArray(response?.pantry) ? response.pantry : [];
  const toBuyRaw = Array.isArray(response?.toBuy) ? response.toBuy : [];
  
  // Map sections to canonical format with labels
  const sections: ShoppingListSection[] = toBuyRaw.map((section: any) => {
    const category = mapRawCategoryToKey(section.category);
    return {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      categoryIcon: CATEGORY_ICONS[category],
      items: Array.isArray(section.items) ? section.items : [],
    };
  });
  
  // Sort by category order
  sections.sort((a, b) => {
    const orderA = SHOPPING_CATEGORY_ORDER.indexOf(a.category);
    const orderB = SHOPPING_CATEGORY_ORDER.indexOf(b.category);
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
export function formatShoppingListCopyText(viewModel: {
  pantry: any[];
  sections: ShoppingListSection[];
}): string {
  const lines: string[] = [];
  
  if (viewModel.pantry.length > 0) {
    lines.push('🗄️ 庫存:');
    viewModel.pantry.forEach(item => {
      lines.push(`  • ${item.name}`);
    });
  }
  
  viewModel.sections.forEach(section => {
    if (section.items.length === 0) return;
    lines.push(`\n${section.categoryIcon} ${section.categoryLabel}:`);
    section.items.forEach(item => {
      const qty = item.quantity ? `${item.quantity}` : '';
      const unit = item.unit || '';
      lines.push(`  • ${item.name} ${qty} ${unit}`.trim());
    });
  });
  
  return lines.join('\n');
}
