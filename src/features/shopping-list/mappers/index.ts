// Shopping List Mappers - Strict Type Contract for ViewModel (ASCII Only)

import type { 
  ShoppingCategoryKey, 
  ShoppingListResponse, 
  ShoppingListViewModel,
  ShoppingListSectionViewModel,
  ShoppingListItemViewModel 
} from '../types';
import { SHOPPING_CATEGORY_ORDER, SHOPPING_CATEGORY_META, CATEGORY_LABELS, CATEGORY_ICONS } from '../constants';
import { formatQuantityDisplay } from '../types';
import { GROUPED_UNIT_SEPARATOR } from '../recipeQuantities';

// One ingredient, one row: amounts in units that cannot be converted without a
// density (克 and 湯匙, 克 and 瓣) are listed together, never summed. A single
// unit keeps its own quantity and progress key unchanged.
export function groupSameIngredient(items: ShoppingListItemViewModel[]): ShoppingListItemViewModel[] {
  const groups = new Map<string, ShoppingListItemViewModel[]>();
  for (const item of items) {
    const key = item.ingredientId ? `id:${item.ingredientId}` : `name:${item.name.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.values()].map(group => {
    if (group.length === 1) return group[0];
    const parts = group.filter(item => item.quantityPending || item.quantityText);
    return {
      ingredientId: group[0].ingredientId,
      name: group[0].name,
      quantity: null,
      unit: group.map(item => item.unit || '').join(GROUPED_UNIT_SEPARATOR),
      quantityText: parts.map(item => item.quantityPending ? '（數量待補）' : item.quantityText).join(' + '),
      quantityPending: parts.length > 0 && parts.every(item => item.quantityPending),
    };
  });
}

// Map raw category string to canonical key (English aliases only)
export function mapRawCategoryToKey(raw: string | null | undefined): ShoppingCategoryKey {
  if (!raw) return 'other';
  
  const normalized = raw.toLowerCase().trim();
  
  if (normalized in SHOPPING_CATEGORY_META) {
    return normalized as ShoppingCategoryKey;
  }
  
  const aliases: Record<string, ShoppingCategoryKey> = {
    // Meat
    'meat': 'meat', 'meats': 'meat', 'meat_seafood': 'meat',
    'beef': 'meat', 'pork': 'meat', 'chicken': 'meat', 'lamb': 'meat', 'duck': 'meat', 'ham': 'meat', 'bacon': 'meat', 'sausage': 'meat',
    
    // Seafood
    'seafood': 'seafood', 'seafoods': 'seafood',
    'fish': 'seafood', 'shrimp': 'seafood', 'prawn': 'seafood', 'crab': 'seafood', 'squid': 'seafood', 'clam': 'seafood', 'oyster': 'seafood', 'mussels': 'seafood', 'scallop': 'seafood',
    
    // Tofu/Egg
    'tofu': 'tofu_egg', 'tofu_products': 'tofu_egg', 'egg': 'tofu_egg', 'eggs': 'tofu_egg',
    
    // Vegetable
    'vegetable': 'vegetable', 'vegetables': 'vegetable', 'produce': 'vegetable',
    'mushroom': 'vegetable', 'mushrooms': 'vegetable', 'herb': 'vegetable', 'herbs': 'vegetable',
    'onion': 'vegetable', 'scallion': 'vegetable', 'green_onion': 'vegetable', 'garlic': 'vegetable', 'ginger': 'vegetable',
    'lemon': 'vegetable', 'lime': 'vegetable',
    
    // Carb
    'carb': 'carb', 'staple': 'carb', 'grains': 'carb',
    'rice': 'carb', 'noodles': 'carb', 'pasta': 'carb', 'bread': 'carb', 'noodle': 'carb', 'vermicelli': 'carb',
    
    // Seasoning
    'seasoning': 'seasoning', 'seasonings': 'seasoning', 'condiments': 'seasoning', 'sauce': 'seasoning',
    'spice': 'seasoning', 'spices': 'seasoning',
    
    // Dairy
    'dairy': 'dairy', 'dairy_product': 'dairy',
    'milk': 'dairy', 'cheese': 'dairy', 'yogurt': 'dairy', 'yoghurt': 'dairy', 'butter': 'dairy', 'cream': 'dairy',
    
    // Frozen
    'frozen': 'frozen', 'frozen_food': 'frozen',
    
    // Pantry
    'pantry': 'pantry', 'pantry_item': 'pantry', 'storage': 'pantry',
    
    // Other
    'other': 'other', 'misc': 'other', 'others': 'other',
  };
  
  if (aliases[normalized]) return aliases[normalized];
  
  return 'other';
}

// Map API response to fully-prepared ViewModel
export function mapShoppingListResponseToViewModel(response: ShoppingListResponse): ShoppingListViewModel {
  const validSummary = response?.summary && 
    typeof response.summary.pantryCount === 'number' &&
    typeof response.summary.toBuyCount === 'number';
  
  const pantry = Array.isArray(response?.pantry) ? response.pantry : [];
  const toBuyRaw = Array.isArray(response?.toBuy) ? response.toBuy : [];
  
  const sections: ShoppingListSectionViewModel[] = toBuyRaw.map((section): ShoppingListSectionViewModel => {
    const category = mapRawCategoryToKey(section.category);
    const items: ShoppingListItemViewModel[] = groupSameIngredient((section.items || []).map((item): ShoppingListItemViewModel => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit || '',
      name: item.name,
      quantityText: formatQuantityDisplay(item.quantity, item.unitDisplay || item.unit || '', item.quantityPending),
      quantityPending: item.quantityPending,
    })));
    
    return {
      categoryKey: category,
      categoryLabel: CATEGORY_LABELS[category],
      categoryIcon: CATEGORY_ICONS[category],
      items,
    };
  });
  
  sections.sort((a, b) => {
    const orderA = SHOPPING_CATEGORY_ORDER.indexOf(a.categoryKey);
    const orderB = SHOPPING_CATEGORY_ORDER.indexOf(b.categoryKey);
    return orderA - orderB;
  });
  
  const toBuyCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  // Rows are counted after grouping, so the count matches what is shown.
  const summary = validSummary 
    ? { ...response.summary, toBuyCount }
    : { pantryCount: pantry.length, toBuyCount, sectionCount: sections.length };
  
  // Map byRecipe if present in response
  const byRecipe = Array.isArray(response?.byRecipe) 
    ? response.byRecipe.map((rb) => ({
        recipeId: rb.recipeId,
        recipeName: rb.recipeName || 'Unknown',
        pantry: Array.isArray(rb.pantry) ? rb.pantry : [],
        toBuy: Array.isArray(rb.toBuy) 
          ? groupSameIngredient(rb.toBuy.map((i) => ({
              ingredientId: i.ingredientId ?? null,
              name: i.name,
              quantity: i.quantity,
              unit: i.unit || '',
              quantityPending: i.quantityPending === true,
              quantityText: formatQuantityDisplay(i.quantity, i.unitDisplay || i.unit || '', i.quantityPending === true),
            })))
          : [],
      }))
    : [];

  return {
    optionalIngredients: Array.isArray(response?.optionalIngredients) ? response.optionalIngredients : [],
    dietaryNotes: Array.isArray(response?.dietaryNotes) ? response.dietaryNotes : [],
    pantry,
    sections,
    byRecipe,
    summary: {
      pantryCount: summary.pantryCount,
      toBuyCount: summary.toBuyCount,
      sectionCount: summary.sectionCount,
    },
    isEmpty: pantry.length === 0 && toBuyCount === 0,
  };
}

// Format ViewModel as copy text
export function formatShoppingListCopyText(viewModel: ShoppingListViewModel): string {
  const lines: string[] = [];
  
  if (viewModel.pantry.length > 0) {
    lines.push('Pantry:');
    viewModel.pantry.forEach(item => lines.push(`  - ${item.name}`));
  }
  
  viewModel.sections.forEach(section => {
    if (section.items.length === 0) return;
    lines.push(`\n${section.categoryIcon} ${section.categoryLabel}:`);
    section.items.forEach(item => lines.push(`  - ${item.name} ${item.quantityText}`.trim()));
  });
  
  return lines.join('\n');
}
