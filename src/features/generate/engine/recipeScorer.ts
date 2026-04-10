/**
 * Recipe Scorer - Pure scoring logic for recipe replacement
 * 
 * Used by recipeReplacer to score candidates for diversity.
 */
export interface ScoredRecipe {
  recipe: any;
  score: number;
}

/**
 * Score a candidate recipe based on plan context for diversity
 * @param candidate - Recipe to score
 * @param existingRecipes - All recipes currently in plan
 * @returns Scored recipe with deterministic score
 */
export function scoreRecipeForReplacement(candidate: any, existingRecipes: any[]): ScoredRecipe {
  let score = 5; // base score
  
  // Repeat penalty - avoid recipes already in plan
  if (existingRecipes.some(pr => pr.id === candidate.id)) {
    score -= 100;
  }
  
  // Protein diversity
  const protein = candidate.primary_protein || candidate.protein?.[0];
  const recentProteins = existingRecipes
    .slice(-3)
    .map(pr => pr.primary_protein || pr.protein?.[0])
    .filter(Boolean);
  
  if (protein && recentProteins.length > 0) {
    if (!recentProteins.includes(protein)) {
      score += 2;
    } else {
      score -= 1;
    }
  }
  
  // Method diversity
  const method = candidate.method;
  const recentMethods = existingRecipes
    .slice(-2)
    .map(pr => pr.method)
    .filter(Boolean);
  
  if (method && recentMethods.length > 0) {
    if (!recentMethods.includes(method)) {
      score += 1;
    } else {
      score -= 1;
    }
  }
  
  return { recipe: candidate, score };
}

/**
 * Score multiple candidates and return sorted by score (highest first)
 * @param candidates - Recipes to score
 * @param existingRecipes - Recipes already in plan
 * @returns Sorted array of scored recipes
 */
export function scoreCandidates(candidates: any[], existingRecipes: any[]): ScoredRecipe[] {
  const scored = candidates
    .map(candidate => scoreRecipeForReplacement(candidate, existingRecipes));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored;
}
