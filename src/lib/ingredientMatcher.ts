/**
 * Ingredient-based recipe recommendation
 * Matches user ingredients against recipe data in memory
 */

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
}

export interface Recommendation {
  recipe: Recipe;
  matchScore: number;
  matchedIngredients: string[];
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

  const ingredients = userIngredients.map(i => i.toLowerCase().trim()).filter(Boolean);
  
  const scored = recipes.map(recipe => {
    // Build searchable text
    const searchText = [
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
    
    ingredients.forEach(ing => {
      if (searchText.includes(ing)) {
        matchCount++;
        matchedIngredients.push(ing);
        if (recipe.primary_protein?.toLowerCase().includes(ing)) {
          proteinMatch = true;
        }
      }
    });
    
    // Calculate score
    let score = matchCount / Math.max(ingredients.length, 1);
    
    // Bonuses
    if (proteinMatch) score += 1;
    if (recipe.speed === 'quick') score += 0.5;
    
    return {
      recipe,
      matchScore: score,
      matchedIngredients
    };
  });
  
  // Filter by threshold and sort
  return scored
    .filter(r => r.matchScore >= minThreshold)
    .sort((a, b) => b.matchScore - a.matchScore);
}
