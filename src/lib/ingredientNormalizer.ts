/**
 * Ingredient Normalizer v2
 * Maps ingredients to canonical form with full synonym support
 */

export const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  // Eggs
  egg: ['蛋', '雞蛋', 'egg', 'eggs'],
  
  // Tomatoes
  tomato: ['番茄', '蕃茄', 'tomato', 'tomatoes'],
  
  // Shrimp
  shrimp: ['蝦仁', '蝦', '鮮蝦', 'shrimp', 'prawn'],
  
  // Chicken
  chicken: ['雞', '雞肉', '雞脾', '雞翼', 'chicken'],
  
  // Beef
  beef: ['牛', '牛肉', 'beef'],
  
  // Pork
  pork: ['豬', '豬肉', 'pork'],
  
  // Tofu
  tofu: ['豆腐', '硬豆腐', '豆腐卜', 'tofu'],
  
  // Fish
  fish: ['魚', '魚片', 'fish'],
  
  // Vegetables
  vegetable: ['菜', '蔬菜', 'vegetable', 'vegetables'],
  choySum: ['菜心', 'choy sum'],
  broccoli: ['西蘭花', 'broccoli'],
  greenPepper: ['青椒', 'green pepper'],
  redPepper: ['紅椒', 'red pepper'],
  onion: ['洋蔥', 'onion'],
  scallion: ['蔥', 'green onion', 'scallion'],
  
  // Carbs
  rice: ['飯', 'rice'],
  riceNoodle: ['米粉', 'rice noodles'],
  noodle: ['麵', 'noodle', 'noodles'],
  pasta: ['意粉', 'pasta'],
  
  // Basic
  salt: ['鹽', 'salt'],
  oil: ['油', 'oil'],
  sugar: ['糖', 'sugar'],
  soySauce: ['醬油', '豉油', 'soy sauce'],
};

/**
 * Build reverse lookup: synonym -> canonical
 */
const SYNONYM_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, synonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
  for (const synonym of synonyms) {
    SYNONYM_TO_CANONICAL[synonym.toLowerCase()] = canonical;
  }
}

/**
 * Convert ingredient to canonical form
 */
export function normalizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase().trim();
  return SYNONYM_TO_CANONICAL[lower] || lower;
}

/**
 * Normalize all ingredients in a list
 */
export function normalizeIngredients(ingredients: string[]): string[] {
  return ingredients.map(normalizeIngredient);
}

/**
 * Get unique canonical ingredients from user input
 */
export function getCanonicalIngredients(userIngredients: string[]): string[] {
  const normalized = normalizeIngredients(userIngredients);
  return [...new Set(normalized)];
}

/**
 * Find which canonical ingredients match a recipe
 */
export function findMatchingCanonical(
  userIngredients: string[],
  recipeIngredients: string[]
): { matched: string[]; missing: string[] } {
  const userCanonical = getCanonicalIngredients(userIngredients);
  const recipeCanonical = normalizeIngredients(recipeIngredients);
  
  const matched: string[] = [];
  const missing: string[] = [];
  
  for (const rc of recipeCanonical) {
    if (userCanonical.includes(rc)) {
      matched.push(rc);
    } else {
      missing.push(rc);
    }
  }
  
  return { matched, missing };
}
