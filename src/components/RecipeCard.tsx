import Image from 'next/image'

interface RecipeCardProps {
  recipe: {
    id?: string | number;
    name?: string;
    image_url?: string | null;
    slug?: string;
    cuisine?: string;
    difficulty?: string;
    method?: string;
    cooking_time?: number | string;
    calories_per_serving?: number | string;
    protein?: string | string[] | number;
    carbs_g?: number;
    fat_g?: number;
    diet?: string[];
    [key: string]: any;
  };
  onClick?: () => void;
  onFavorite?: () => void;
  className?: string;
  imageHeightClass?: string;
}

// Label mappings
const cuisineLabels: Record<string, string> = {
  chinese: '中式', western: '西式', japanese: '日式', korean: '韓式', taiwanese: '台式', se_asian: '東南亞'
}
const difficultyLabels: Record<string, string> = { easy: '簡易', medium: '中等', hard: '困難' }
const methodLabels: Record<string, string> = { stir_fry: '炒', steamed: '蒸', boiled: '煮', baked: '焗', fried: '煎' }

export default function RecipeCard({ recipe, onClick, onFavorite, className = '', imageHeightClass = 'h-48' }: RecipeCardProps) {
  // Safely extract recipe fields
  const recipeName = recipe?.name || '無名食譜'
  const recipeImage = recipe?.image_url || null
  const recipeCuisine = recipe?.cuisine || ''
  const recipeDifficulty = recipe?.difficulty || ''
  const recipeMethod = recipe?.method || ''
  const recipeTime = recipe?.cooking_time || 30
  const recipeCalories = recipe?.calories_per_serving || 0
  const recipeProtein = typeof recipe?.protein === 'string' ? recipe.protein : (Array.isArray(recipe?.protein) ? recipe.protein[0] : '')
  const recipeDiet = Array.isArray(recipe?.diet) ? recipe.diet : []
  
  const tags = [...(recipeProtein ? [recipeProtein] : []), ...recipeDiet].slice(0, 3)
  
  return (
    <div onClick={() => { if (onClick) onClick(); }} className={`cursor-pointer bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all ${className}`}>
      {/* Image */}
      <div className={`relative ${imageHeightClass}`}>
        {recipeImage ? (
          <Image src={recipeImage} alt={recipeName} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200">
            <span className="text-5xl">🍳</span>
          </div>
        )}
        {onFavorite && (
          <button onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="absolute top-3 right-3 bg-white/95 border-2 border-red-400 rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10 hover:scale-105 transition-transform">
            <span className="text-xl">❤️</span>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 text-[#3A2010]">{recipeName}</h3>
        
        {/* Info row */}
        <div className="text-sm text-gray-500 mb-2">
          {recipeTime}分鐘 · {recipeCalories}卡路里
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          {recipeCuisine && (
            <span className="text-xs px-2 py-1 bg-[#C8D49A] text-[#3A2010] rounded">{cuisineLabels[recipeCuisine] || recipeCuisine}</span>
          )}
          {recipeDifficulty && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{difficultyLabels[recipeDifficulty] || recipeDifficulty}</span>
          )}
          {recipeMethod && (
            <span className="text-xs px-2 py-1 bg-teal-500 text-white rounded">{methodLabels[recipeMethod] || recipeMethod}</span>
          )}
          {tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">{tag}</span>
          ))}
        </div>
        
        {/* Match info (if exists) */}
        {recipe?.matchScore !== undefined && recipe.matchScore > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-green-600 font-medium">匹配度 {Math.round(recipe.matchScore * 100)}%</span>
            {recipe?.matchedIngredients?.length > 0 && (
              <div className="text-xs text-gray-500">匹配食材：{recipe.matchedIngredients.join('、')}</div>
            )}
            {recipe?.missingIngredients?.length > 0 && (
              <div className="text-xs text-red-500">缺少食材：{recipe.missingIngredients.slice(0, 3).join('、')}{recipe.missingIngredients.length > 3 ? '...' : ''}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
