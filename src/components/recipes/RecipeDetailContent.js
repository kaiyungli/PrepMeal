/**
 * RecipeDetailContent - Shared recipe detail UI
 * 
 * Used by both:
 * - /recipes/[id] page (SSR)
 * - RecipeDetailModal (client fetch)
 * 
 * Props:
 * - recipe: object - recipe data with ingredients, steps
 */
const DIFFICULTY = { easy: '易', medium: '中', hard: '難' };
const SPEED = { quick: '快', normal: '中', slow: '慢' };
const METHOD = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒' };

export default function RecipeDetailContent({ recipe }) {
  if (!recipe) return null;
  
  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];
  
  return (
    <div className="p-4 md:p-6">
      {/* Image */}
      {recipe.image_url && (
        <div className="relative w-full h-48 md:h-64 mb-4 md:mb-6 rounded-xl overflow-hidden">
          <img 
            src={recipe.image_url} 
            alt={recipe.name || '食譜'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      {/* Title */}
      <h1 className="text-xl md:text-2xl font-bold text-[#3A2010] mb-2 md:mb-3">
        {recipe.name || '未知食譜'}
      </h1>
      
      {/* Meta Tags */}
      <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
        {recipe.difficulty && (
          <span className="px-2 md:px-3 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
            {DIFFICULTY[recipe.difficulty] || recipe.difficulty}
          </span>
        )}
        {recipe.speed && (
          <span className="px-2 md:px-3 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
            {SPEED[recipe.speed] || recipe.speed}
          </span>
        )}
        {recipe.method && (
          <span className="px-2 md:px-3 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
            {METHOD[recipe.method] || recipe.method}
          </span>
        )}
        {recipe.total_time_minutes && (
          <span className="px-2 md:px-3 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
            {recipe.total_time_minutes}分鐘
          </span>
        )}
        {recipe.calories_per_serving && (
          <span className="px-2 md:px-3 py-1 bg-[#F0E8D8] text-[#AA7A50] text-sm rounded">
            {recipe.calories_per_serving}卡
          </span>
        )}
      </div>
      
      {/* Description */}
      {recipe.description && (
        <p className="text-[#AA7A50] text-sm mb-4 md:mb-6">{recipe.description}</p>
      )}
      
      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="mb-4 md:mb-6">
          <h3 className="font-semibold text-[#3A2010] mb-2 md:mb-3">食材</h3>
          <div className="bg-[#FEFCF8] rounded-lg p-3 md:p-4">
            <div className="space-y-1">
              {ingredients.map((ing, idx) => {
                const name = ing?.display_name || ing?.name || '未知';
                const qty = ing?.quantity ?? '';
                const unit = ing?.unit?.name || ing?.unit || '';
                return (
                  <div key={idx} className="flex justify-between py-1.5 md:py-2 border-b border-[#DDD0B0] last:border-b-0">
                    <span className="text-[#3A2010]">{name}</span>
                    <span className="text-[#AA7A50] text-sm">{qty} {unit}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Steps */}
      {steps.length > 0 && (
        <div>
          <h3 className="font-semibold text-[#3A2010] mb-2 md:mb-3">步驟</h3>
          <div className="space-y-3 md:space-y-4">
            {steps.map((step, idx) => {
              // Handle both string and object step formats
              const stepText = typeof step === 'string' 
                ? step 
                : step?.text || step?.instruction || step?.description || '';
              const stepNum = step?.step_no || idx + 1;
              
              return (
                <div key={idx} className="flex gap-3 md:gap-4">
                  <span className="flex-shrink-0 w-6 md:w-8 h-6 md:h-8 bg-[#9B6035] text-white rounded-full flex items-center justify-center text-sm md:text-base font-bold">
                    {stepNum}
                  </span>
                  <p className="text-[#3A2010] text-sm md:text-base leading-relaxed">{stepText}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
