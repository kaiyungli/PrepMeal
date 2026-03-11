/**
 * Ingredient-based recipe recommendation
 * Matches user ingredients against recipe data in memory
 */

import { normalizeIngredient, normalizeIngredients } from './ingredientNormalizer';

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
  matchRatio: number;
}

/**
 * Recommend recipes based on user ingredients
 * @param userIngredients - Array of ingredient strings
 * @param recipes - Array of Recipe objects
 * @param minThreshold - Minimum score threshold (default 0.3)
 * @returns Sorted array of recommendations
 */
export function recommendRecipes(
  userIngredients: string[],
  recipes: Recipe[],
  minThreshold: number = 0.3
): Recommendation[] {
  if (!userIngredients?.length || !recipes?.length) {
    return [];
  }

  // Normalize user ingredients
  const normalizedUser = normalizeIngredients(userIngredients);
  
  const scored = recipes.map(recipe => {
    // Use ingredients_list from API if available, otherwise build from text
    const recipeIngredients = recipe.ingredients_list || [];
    const normalizedRecipe = normalizeIngredients(recipeIngredients);
    
    // Build searchable text
    const searchText = [
      ...normalizedRecipe,
      recipe.name,
      recipe.description,
      recipe.cuisine,
      recipe.method,
      recipe.dish_type,
      recipe.primary_protein
    ].filter(Boolean).join(' ').toLowerCase();
    
    let matchCount = 0;
    let proteinMatch = false;
    const matchedIngredients: string[] = [];
    
    normalizedUser.forEach((ing, idx) => {
      if (searchText.includes(ing)) {
        matchCount++;
        // Store original user ingredient that matched
        matchedIngredients.push(userIngredients[idx]);
        if (recipe.primary_protein?.toLowerCase().includes(ing)) {
          proteinMatch = true;
        }
      }
    });
    
    // Calculate ratio based on recipe ingredients
    const totalRecipeIngredients = normalizedRecipe.length || 1;
    const matchRatio = Math.min(matchCount / totalRecipeIngredients, 1);
    
    // Base score = match ratio
    let score = matchRatio;
    
    // Bonuses
    if (proteinMatch) score += 0.2;
    if (recipe.speed === 'quick') score += 0.1;
    
    return {
      recipe,
      matchScore: score,
      matchRatio,
      matchedIngredients
    };
  });
  
  // Filter by threshold and sort
  return scored
    .filter(r => r.matchScore >= minThreshold)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Score a single recipe for the planner with pantry ingredients
 * Used by generate.js to prioritize recipes
 */
export function scoreRecipeForPlanner(
  userIngredients: string[],
  recipe: Recipe
): { score: number; matchedIngredients: string[] } {
  if (!userIngredients?.length) {
    return { score: 0, matchedIngredients: [] };
  }

  const normalizedUser = normalizeIngredients(userIngredients);
  const recipeIngredients = recipe.ingredients_list || [];
  const normalizedRecipe = normalizeIngredients(recipeIngredients);
  
  const searchText = [
    ...normalizedRecipe,
    recipe.name,
    recipe.description,
    recipe.cuisine,
    recipe.method,
    recipe.dish_type,
    recipe.primary_protein
  ].filter(Boolean).join(' ').toLowerCase();
  
  let matchCount = 0;
  const matchedIngredients: string[] = [];
  
  normalizedUser.forEach((ing, idx) => {
    if (searchText.includes(ing)) {
      matchCount++;
      matchedIngredients.push(userIngredients[idx]);
    }
  });
  
  // Bonus scoring for planner (not filtered, just preferred)
  const score = matchCount; // +1 per matched ingredient
  
  return { score, matchedIngredients };
}
