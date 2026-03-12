/**
 * Ingredient-based recipe recommendation
 * Matches user ingredients against recipe data in memory
 */

import { normalizeIngredient, normalizeIngredients, getCanonicalIngredients, findMatchingCanonical } from './ingredientNormalizer';

export interface Recipe {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  description?: string;
  cuisine?: string;
  dish_type?: string;
  method?: string;
  speed?: string;
  primary_protein?: string;
  prep_time_minutes?: number;
  ingredients_list?: string[];
}

export interface Recommendation {
  recipe: Recipe;
  matchScore: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  matchRatio: number;
}

/**
 * Recommend recipes based on user ingredients
 */
export function recommendRecipes(
  userIngredients: string[],
  recipes: Recipe[],
  minThreshold: number = 0.3
): Recommendation[] {
  if (!userIngredients?.length || !recipes?.length) {
    console.log('[MATCHER] Empty input - userIngredients:', userIngredients?.length, 'recipes:', recipes?.length);
    return [];
  }

  console.log('[MATCHER] Input ingredients:', userIngredients);
  console.log('[MATCHER] First recipe:', recipes[0]?.name, 'ingredients_list:', recipes[0]?.ingredients_list);

  const scored = recipes.map(recipe => {
    // Get recipe ingredients (from API or build from text)
    const recipeIngredients = recipe.ingredients_list || [];
    
    // Find matches using canonical forms
    const { matched, missing } = findMatchingCanonical(userIngredients, recipeIngredients);
    
    // Also check text fields for fallback
    const searchText = [
      recipe.name,
      recipe.description,
      recipe.cuisine,
      recipe.method,
      recipe.dish_type,
      recipe.primary_protein
    ].filter(Boolean).join(' ').toLowerCase();
    
    let textMatchCount = 0;
    const normalizedUser = normalizeIngredients(userIngredients);
    
    // Check both normalized AND original user ingredients against search text
    normalizedUser.forEach(ing => {
      if (searchText.includes(ing)) {
        textMatchCount++;
      }
    });
    
    // Also check original Chinese input against recipe text
    userIngredients.forEach(ing => {
      if (searchText.includes(ing.toLowerCase())) {
        textMatchCount++;
      }
    });
    
    // Combine canonical matches + text matches
    const totalMatchCount = matched.length + textMatchCount;
    const totalRecipeIngredients = recipeIngredients.length || 1;
    const matchRatio = Math.min(totalMatchCount / totalRecipeIngredients, 1);
    
    // Calculate score with bonuses
    let score = matchRatio;
    if (matched.length > 0) score += 0.2;
    if (recipe.speed === 'quick') score += 0.1;
    // Penalty for missing ingredients
    if (missing.length > 0) score -= 0.1 * missing.length;
    
    // Get display names for matched
    const matchedDisplay = matched.length > 0 ? matched : (textMatchCount > 0 ? normalizedUser.slice(0, textMatchCount) : []);
    
    return {
      recipe,
      matchScore: score,
      matchRatio,
      matchedIngredients: matchedDisplay,
      missingIngredients: missing
    };
  });
  
  // Filter by threshold and sort
  return scored
    .filter(r => r.matchScore >= minThreshold)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Score a single recipe for the planner with pantry ingredients
 */
export function scoreRecipeForPlanner(
  userIngredients: string[],
  recipe: Recipe
): { score: number; matchedIngredients: string[]; missingIngredients: string[] } {
  if (!userIngredients?.length) {
    return { score: 0, matchedIngredients: [], missingIngredients: [] };
  }

  const recipeIngredients = recipe.ingredients_list || [];
  const { matched, missing } = findMatchingCanonical(userIngredients, recipeIngredients);
  
  // Also check text fields
  const searchText = [
    recipe.name,
    recipe.description,
    recipe.cuisine,
    recipe.method,
    recipe.dish_type,
    recipe.primary_protein
  ].filter(Boolean).join(' ').toLowerCase();
  
  const normalizedUser = normalizeIngredients(userIngredients);
  let textMatches = 0;
  
  normalizedUser.forEach(ing => {
    if (searchText.includes(ing)) {
      textMatches++;
    }
  });
  
  const totalMatches = matched.length + textMatches;
  const score = totalMatches; // +1 per match
  
  return { 
    score, 
    matchedIngredients: matched,
    missingIngredients: missing
  };
}

/**
 * Simple score function for testing
 * Returns a score between 0 and 1 based on ingredient match ratio
 */
export function scoreRecipe(pantryIngredients: string[], recipeIngredients: string[]): number {
  if (!pantryIngredients?.length || !recipeIngredients?.length) return 0;
  
  const normalizedPantry = normalizeIngredients(pantryIngredients);
  const normalizedRecipe = normalizeIngredients(recipeIngredients);
  
  let matchCount = 0;
  normalizedPantry.forEach(ing => {
    if (normalizedRecipe.includes(ing)) matchCount++;
  });
  
  return matchCount / Math.max(normalizedRecipe.length, 1);
}
