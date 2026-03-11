/**
 * Ingredient Normalizer
 * Maps Cantonese/Traditional Chinese ingredients to English for matching
 */

export const ingredientMappings: Record<string, string[]> = {
  // Eggs
  '蛋': ['egg', 'eggs'],
  '雞蛋': ['egg', 'eggs'],
  
  // Tomatoes
  '番茄': ['tomato', 'tomatoes'],
  '蕃茄': ['tomato', 'tomatoes'],
  
  // Shrimp
  '蝦仁': ['shrimp', 'prawn'],
  '蝦': ['shrimp', 'prawn'],
  '鮮蝦': ['shrimp', 'prawn'],
  
  // Chicken
  '雞': ['chicken'],
  '雞肉': ['chicken'],
  '雞脾': ['chicken'],
  '雞翼': ['chicken wings'],
  
  // Beef
  '牛': ['beef'],
  '牛肉': ['beef'],
  
  // Pork
  '豬': ['pork'],
  '豬肉': ['pork'],
  
  // Tofu
  '豆腐': ['tofu'],
  '硬豆腐': ['tofu'],
  '豆腐卜': ['tofu'],
  
  // Fish
  '魚': ['fish'],
  '魚片': ['fish'],
  
  // Vegetables
  '菜': ['vegetable', 'vegetables'],
  '菜心': ['choy sum'],
  '西蘭花': ['broccoli'],
  '青椒': ['green pepper'],
  '紅椒': ['red pepper'],
  '洋蔥': ['onion'],
  '蔥': ['green onion', 'scallion'],
  
  // Carbs
  '飯': ['rice'],
  '米粉': ['rice noodles'],
  '麵': ['noodle', 'noodles'],
  '意粉': ['pasta'],
  
  // Basic
  '鹽': ['salt'],
  '油': ['oil'],
  '糖': ['sugar'],
  '醬油': ['soy sauce'],
  '豉油': ['soy sauce'],
};

/**
 * Normalize a single ingredient to its canonical form
 */
export function normalizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase().trim();
  
  // Check mappings
  for (const [cantonese, english] of Object.entries(ingredientMappings)) {
    if (lower.includes(cantonese) || cantonese.includes(lower)) {
      return english[0]; // Return first English form
    }
  }
  
  return lower;
}

/**
 * Normalize all ingredients in a list
 */
export function normalizeIngredients(ingredients: string[]): string[] {
  return ingredients.map(normalizeIngredient);
}

/**
 * Check if any normalized ingredients match
 */
export function findMatchingIngredients(
  userIngredients: string[],
  recipeIngredients: string[]
): string[] {
  const normalizedUser = normalizeIngredients(userIngredients);
  const normalizedRecipe = normalizeIngredients(recipeIngredients);
  
  const matches: string[] = [];
  
  normalizedUser.forEach((userIng, idx) => {
    if (normalizedRecipe.some(recipeIng => 
      recipeIng.includes(userIng) || userIng.includes(recipeIng)
    )) {
      // Return original user ingredient
      matches.push(userIngredients[idx]);
    }
  });
  
  return matches;
}
