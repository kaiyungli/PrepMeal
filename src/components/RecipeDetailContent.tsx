interface RecipeDetailContentProps {
  recipe: {
    id?: string;
    name?: string;
    image_url?: string | null;
    cuisine?: string | null;
    method?: string | null;
    difficulty?: string | null;
    total_time_minutes?: number | null;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
    primary_protein?: string | null;
    dish_type?: string | null;
    ingredients?: any[];
    steps?: any[];
  } | null;
  isLoading?: boolean;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteClick?: () => void;
}

export default function RecipeDetailContent({
  recipe,
  isLoading,
  isFavorite,
  favoriteLoading,
  onFavoriteClick
}: RecipeDetailContentProps) {
  if (!recipe) return null;

  return (
    <div className="p-6">
      <h1>{recipe?.name || 'No name'}</h1>
      <p>ID: {recipe?.id || 'No id'}</p>
      <p>Ingredients: {Array.isArray(recipe?.ingredients) ? recipe.ingredients.length : 0}</p>
      <p>Steps: {Array.isArray(recipe?.steps) ? recipe.steps.length : 0}</p>
    </div>
  );
}
