// Shopping List Module Types - Strict Contract

// ===== API/Data Model =====

export type ShoppingCategoryKey = 
  | 'meat' 
  | 'seafood' 
  | 'tofu_egg' 
  | 'vegetable' 
  | 'carb' 
  | 'seasoning' 
  | 'dairy' 
  | 'frozen' 
  | 'pantry' 
  | 'other';

export interface ShoppingListPantryItem {
  ingredientId: string | null;
  name: string;
  normalizedName: string;
  category: ShoppingCategoryKey;
}

export interface ShoppingListBuyItem {
  ingredientId: string | null;
  name: string;
  normalizedName: string;
  quantity: number | null;
  unit: string;
  category: ShoppingCategoryKey;
  source: 'recipe_ingredients' | 'ingredients_list';
  quantityPending: boolean;
}

export interface ShoppingListSection {
  category: ShoppingCategoryKey;
  items: ShoppingListBuyItem[];
}

export interface ShoppingListSummary {
  pantryCount: number;
  toBuyCount: number;
  sectionCount: number;
}

export interface ShoppingListResponse {
  pantry: ShoppingListPantryItem[];
  toBuy: ShoppingListSection[];
  summary: ShoppingListSummary;
}

// ===== UI/View Model =====

export interface ShoppingListItemViewModel {
  ingredientId: string | null;
  name: string;
  quantityText: string;
  quantityPending: boolean;
}

export interface ShoppingListSectionViewModel {
  categoryKey: ShoppingCategoryKey;
  categoryLabel: string;
  categoryIcon: string;
  items: ShoppingListItemViewModel[];
}

export interface ShoppingListViewModel {
  pantry: ShoppingListPantryItem[];
  sections: ShoppingListSectionViewModel[];
  summary: ShoppingListSummary;
  isEmpty: boolean;
}

// ===== Helper Functions =====

export function createEmptyViewModel(): ShoppingListViewModel {
  return {
    pantry: [],
    sections: [],
    summary: { pantryCount: 0, toBuyCount: 0, sectionCount: 0 },
    isEmpty: true,
  };
}

// Single source of truth for quantity display
export function formatQuantityDisplay(
  quantity: number | null, 
  unit: string, 
  quantityPending: boolean
): string {
  if (quantityPending) {
    return '（數量待補）';
  }
  if (quantity === null || quantity === 0) {
    return '';
  }
  const qtyStr = String(quantity);
  return unit ? `${qtyStr} ${unit}` : qtyStr;
}
