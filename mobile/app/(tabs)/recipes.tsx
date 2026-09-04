/**
 * 食譜 tab — recipe browsing.
 *
 * Thin route: delegates to the recipes feature screen, which owns data loading
 * (`useRecipes` -> `fetchRecipes` -> Supabase) and all list / loading / error /
 * empty rendering. See `src/features/recipes/`.
 */
import { RecipeListScreen } from '@/features/recipes';

export default function RecipesScreen() {
  return <RecipeListScreen />;
}
