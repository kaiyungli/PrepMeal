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
  recipeId?: string | null;
  recipeName?: string | null;
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

export interface ShoppingListRecipeGroup {
  recipeId: string | null;
  recipeName: string;
  pantry: {
    ingredientId?: string | null;
    name: string;
  }[];
  toBuy: {
    ingredientId?: string | null;
    name: string;
    quantity: number | null;
    unit: string;
    quantityPending?: boolean;
  }[];
}

export interface ShoppingListResponse {
  pantry: ShoppingListPantryItem[];
  toBuy: ShoppingListSection[];
  byRecipe: ShoppingListRecipeGroup[];
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

export interface ShoppingListRecipeGroupViewModel {
  recipeId: string | null;
  recipeName: string;
  pantry: { name: string }[];
  toBuy: { name: string; quantityText: string }[];
}

export interface ShoppingListViewModel {
  pantry: ShoppingListPantryItem[];
  sections: ShoppingListSectionViewModel[];
  byRecipe: ShoppingListRecipeGroupViewModel[];
  summary: ShoppingListSummary;
  isEmpty: boolean;
}

// ===== Helper Functions =====

export function createEmptyViewModel(): ShoppingListViewModel {
  return {
    pantry: [],
    sections: [],
    byRecipe: [],
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
  
  // Round to max 2 decimal places, remove trailing zeros
  let rounded = Math.round(quantity * 100) / 100;
  
  // Format: remove .0, keep up to 2 decimals
  let qtyStr: string;
  if (Number.isInteger(rounded)) {
    qtyStr = String(rounded);
  } else {
    // Remove trailing zeros after decimal
    qtyStr = rounded.toFixed(2).replace(/\.?0+$/, '');
  }
  
  return unit ? `${qtyStr} ${unit}` : qtyStr;
}
