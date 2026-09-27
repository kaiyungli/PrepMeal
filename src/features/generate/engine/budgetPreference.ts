export type BudgetLevel = 'budget' | 'normal' | 'premium';

type BudgetRecipe = { budget_level?: string | null };

export function matchesBudgetPreference(recipe: BudgetRecipe, budget?: string): boolean {
  return (budget === 'budget' || budget === 'premium') && recipe.budget_level === budget;
}

// Prefer labelled recipes without making an incomplete catalogue unusable.
export function preferBudgetRecipes<T extends BudgetRecipe>(recipes: T[], budget?: string): T[] {
  if (budget !== 'budget' && budget !== 'premium') return recipes;
  const matches = recipes.filter(recipe => matchesBudgetPreference(recipe, budget));
  return matches.length ? matches : recipes;
}
