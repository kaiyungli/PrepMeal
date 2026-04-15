// Shopping List Module Types

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
  categoryLabel: string;
  categoryIcon: string;
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

export interface ShoppingListViewModel {
  pantry: ShoppingListPantryItem[];
  sections: ShoppingListSection[];
  summary: ShoppingListSummary;
  isEmpty: boolean;
}
