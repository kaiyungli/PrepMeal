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
}: RecipeDetailContentProps) {
  // Safe guards - NEVER assume data exists
  const safeIngredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const safeSteps = Array.isArray(recipe?.steps) ? recipe.steps : [];

  if (!recipe) return null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-4" style={{ color: '#3A2010' }}>
        {recipe?.name || '未命名食譜'}
      </h1>

      {/* Image - safe */}
      {recipe?.image_url && (
        <img
          src={recipe.image_url}
          alt={recipe.name || 'recipe'}
          style={{ width: '100%', borderRadius: '12px', marginBottom: '16px' }}
        />
      )}

      {/* Ingredients */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#3A2010' }}>材料</h2>
        <ul className="space-y-1">
          {safeIngredients.length > 0 ? (
            safeIngredients.map((ing: any, i: number) => {
              const name = ing?.ingredient_name || ing?.name || '未知材料';
              const qty = ing?.quantity ?? '';
              const unit = ing?.unit_name || ing?.unit || '';
              return (
                <li key={i} style={{ color: '#3A2010' }}>
                  {name} {qty && String(qty)} {unit}
                </li>
              );
            })
          ) : (
            <li style={{ color: '#666' }}>無材料資料</li>
          )}
        </ul>
      </div>

      {/* Steps - CRITICAL FIX - support both string and object */}
      <div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: '#3A2010' }}>步驟</h2>
        <ol className="space-y-4">
          {safeSteps.length > 0 ? (
            safeSteps.map((step: any, i: number) => {
              // Support both string and object shapes
              const text = typeof step === 'string' ? step : step?.text || '';
              return (
                <li key={i} className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                    style={{ backgroundColor: '#9B6035', color: 'white' }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="leading-relaxed" style={{ color: '#3A2010' }}>
                      {text}
                    </p>
                  </div>
                </li>
              );
            })
          ) : (
            <li style={{ color: '#666' }}>無步驟資料</li>
          )}
        </ol>
      </div>

      {/* Nutrition - safe */}
      {recipe?.calories_per_serving && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5DCC8' }}>
          <p style={{ color: '#3A2010' }}>
            🔥 {recipe.calories_per_serving} kcal
          </p>
        </div>
      )}
    </div>
  );
}
