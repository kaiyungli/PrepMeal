import Image from 'next/image'
import Link from 'next/link'

/**
 * RecipeCard - displays a single recipe card
 * 
 * DATA PROPS:
 *   recipe: Object              - recipe data (many optional fields)
 *   recipe.id                   - recipe ID
 *   recipe.name                 - recipe name
 *   recipe.image_url           - optional image
 *   recipe.cuisine             - cuisine type
 *   recipe.difficulty          - easy/medium/hard
 *   recipe.method              - cooking method
 *   recipe.total_time_minutes  - total time
 *   recipe.calories_per_serving - calories
 *   recipe.protein_g           - protein grams
 *   recipe.primary_protein     - main protein type
 *   recipe.dish_type          - main/side/soup/etc
 *   recipe.diet               - dietary tags array
 * 
 * OPTIONAL PROPS:
 *   onClick?: () => void       - click handler
 *   onFavorite?: () => void   - favorite button handler
 *   className?: string         - additional CSS classes
 */
interface RecipeCardProps {
  recipe: {
    id?: string | number;
    name?: string;
    image_url?: string | null;
    slug?: string;
    cuisine?: string;
    difficulty?: string;
    method?: string;
    total_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    prep_time_minutes?: number | null;
    calories_per_serving?: number | null;
    protein_g?: number | null;
    primary_protein?: string;
    dish_type?: string;
    diet?: string[];
  };
  onClick?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  className?: string;
}

// Label mappings
const cuisineLabels: Record<string, string> = {
  chinese: '中式', western: '西式', japanese: '日式', korean: '韓式', taiwanese: '台式', fusion: '混合'
}
const difficultyLabels: Record<string, string> = { easy: '簡單', medium: '中等', hard: '複雜' }
const methodLabels: Record<string, string> = { 
  stir_fry: '炒', 
  steamed: '蒸', 
  boiled: '煮/湯',
  baked: '焗', 
  fried: '煎/炸',
  braised: '燜',
}
const proteinLabels: Record<string, string> = {
  chicken: "雞", beef: "牛", pork: "豬", shrimp: "蝦", fish: "魚", tofu: "豆腐", egg: "蛋", vegetarian: "素", mixed: "混合"
}
const dishTypeLabels: Record<string, string> = {
  main: '主菜', side: '配菜', staple: '主食', soup: '湯', snack: '小食'
}

const dietLabels: Record<string, string> = {
  vegetarian: '素食',
  egg_lacto: '蛋奶素',
  high_protein: '高蛋白',
  low_fat: '低脂',
  low_calorie: '低卡',
  light: '清淡',
  gluten_free: '無麩質'
}

export default function RecipeCard({ recipe, onClick, onFavorite, isFavorite, className = '' }: RecipeCardProps) {
  // Safely extract recipe fields
  const recipeId = recipe?.id
  const recipeName = recipe?.name || '無名食譜'
  const recipeImage = recipe?.image_url || null
  
  // Time: prefer total_time_minutes, then cook_time_minutes
  const recipeTime = recipe?.total_time_minutes || recipe?.cook_time_minutes || recipe?.prep_time_minutes || null
  
  const recipeDifficulty = recipe?.difficulty || ''
  const recipeMethod = recipe?.method || ''
  const recipeCalories = recipe?.calories_per_serving || null
  // protein_g is the numeric protein amount, primary_protein is the protein type (fish, beef, etc.)
  const recipeProteinGrams = recipe?.protein_g ?? null
  const recipePrimaryProtein = recipe?.primary_protein || ''
  const recipeDiet = Array.isArray(recipe?.diet) ? recipe.diet : []
  const recipeDishType = recipe?.dish_type || ''
  
  // Build tags: primary_protein (as category label) + dish_type
  const tags: string[] = []
  if (recipePrimaryProtein && proteinLabels[recipePrimaryProtein]) {
    tags.push(proteinLabels[recipePrimaryProtein])
  }
  if (recipeDishType && dishTypeLabels[recipeDishType]) {
    tags.push(dishTypeLabels[recipeDishType])
  }
  
  // Card content
  const cardContent = (
    <>
      {/* Image - Fixed aspect ratio */}
      <div className="relative aspect-[4/3]">
        {recipeImage ? (
          <Image src={recipeImage} alt={recipeName} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-amber-50 to-orange-100">
            <span className="text-5xl">🍳</span>
          </div>
        )}
        {onFavorite && (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavorite(); }} 
            className="absolute top-3 right-3 bg-white/95 rounded-full w-9 h-9 flex items-center justify-center shadow-md z-10 hover:scale-110 transition-transform"
          >
            <span className="text-lg">❤️</span>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {/* Title - max 2 lines */}
        <h3 className="font-semibold text-base text-[#3A2010] mb-2 line-clamp-2 leading-tight">
          {recipeName}
        </h3>
        
        {/* Metadata row: Time · Difficulty · Method */}
        <div className="flex items-center gap-2 text-xs text-[#7A746B] mb-3">
          {recipeTime && (
            <span className="flex items-center gap-1">
              <span>⏱️</span>
              <span>{recipeTime}分鐘</span>
            </span>
          )}
          {recipeTime && recipeDifficulty && <span>·</span>}
          {recipeDifficulty && difficultyLabels[recipeDifficulty] && (
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                recipeDifficulty === 'easy' ? 'bg-green-400' : 
                recipeDifficulty === 'medium' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></span>
              <span>{difficultyLabels[recipeDifficulty]}</span>
            </span>
          )}
          {(recipeTime || recipeDifficulty) && recipeMethod && methodLabels[recipeMethod] && <span>·</span>}
          {recipeMethod && methodLabels[recipeMethod] && (
            <span className="flex items-center gap-1">
              <span>🥘</span>
              <span>{methodLabels[recipeMethod]}</span>
            </span>
          )}
        </div>
        
        {/* Tags row */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-[#F8F3E8] text-[#9B6035] rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Nutrition row - optional, show 1-2 key info */}
        <div className="flex items-center gap-3 text-xs text-[#AA7A50]">
          {recipeCalories && (
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span>{recipeCalories}卡</span>
            </span>
          )}
          {recipeProteinGrams && (
            <span className="flex items-center gap-1">
              <span>💪</span>
              <span>{recipeProteinGrams}g蛋白</span>
            </span>
          )}
          {recipeDiet.length > 0 && !recipeProteinGrams && (
            <span className="flex items-center gap-1">
              <span>🥗</span>
              <span>{dietLabels[recipeDiet[0]] || recipeDiet[0]}</span>
            </span>
          )}
        </div>
      </div>
    </>
  )

  // If we have an ID, wrap with Link
  if (recipeId) {
    return (
      <Link 
        href={`/recipes/${recipeId}`}
        onClick={onClick}
        className={`block cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}
      >
        {cardContent}
      </Link>
    )
  }

  // Fallback: just clickable div
  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${className}`}
    >
      {cardContent}
    </div>
  )
}
