import Image from 'next/image'

interface RecipeCardProps {
  recipe: {
    id: number
    name: string
    image_url?: string
    cooking_time?: number
    calories_per_serving?: number
    protein?: number | string
    carbs_g?: number
    fat_g?: number
    cuisine?: string
    difficulty?: string
    method?: string
    speed?: string
    diet?: string[]
    [key: string]: any
  }
  onClick?: () => void
  onFavorite?: () => void
  className?: string
  imageHeightClass?: string
}

// Label mappings
const cuisineLabels: Record<string, string> = {
  中菜: '中菜', 西菜: '西菜', 日菜: '日菜', 韓菜: '韓菜', 泰菜: '泰菜',
  印度: '印度', 越南: '越南', 意大利: '意大利', 法國: '法國', 美國: '美國'
}
const difficultyLabels: Record<string, string> = { easy: '易', medium: '中', hard: '難', 易: '易', 中: '中', 難: '難' }
const methodLabels: Record<string, string> = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒', 炒: '炒', 蒸: '蒸', 煮: '煮' }
const proteinLabels: Record<string, string> = { egg: '蛋', chicken: '雞', beef: '牛', pork: '豬', tofu: '豆腐', seafood: '海鮮', fish: '魚', vegetarian: '素' }

export default function RecipeCard({ recipe, onClick, onFavorite, className = '', imageHeightClass = 'h-48' }: RecipeCardProps) {
  const tags = [...(recipe.protein ? [recipe.protein] : []), ...(recipe.diet || [])].slice(0, 3)
  
  return (
    <div onClick={() => { alert('RecipeCard clicked! ' + recipe.name); if (onClick) onClick(); }} className={`cursor-pointer bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all ${className}`}>
      {/* Image */}
      <div className={`relative ${imageHeightClass}`}>
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-200">
            <span className="text-5xl">🍳</span>
          </div>
        )}
        {onFavorite && (
          <button onClick={(e) => { e.stopPropagation(); onFavorite(); }} className="absolute top-3 right-3 bg-white/95 border-2 border-red-400 rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10 hover:scale-105 transition-transform">
            <span className="text-lg">❤️</span>
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-lg mb-2 text-[#3A2010]">{recipe.name}</h3>
        <p className="text-sm text-[#AA7A50]">
          {recipe.cooking_time || '30'}分鐘 · {recipe.calories_per_serving || '0'}卡路里 · 蛋白{recipe.protein || '0'}g
        </p>
        {/* Tags */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {recipe.cuisine && (
            <span className="text-xs px-2 py-1 bg-[#C8D49A] text-[#3A2010] rounded">{cuisineLabels[recipe.cuisine] || recipe.cuisine}</span>
          )}
          {recipe.difficulty && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{difficultyLabels[recipe.difficulty] || recipe.difficulty}</span>
          )}
          {recipe.method && (
            <span className="text-xs px-2 py-1 bg-teal-500 text-white rounded">{methodLabels[recipe.method] || recipe.method}</span>
          )}
          {tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-[#C8D49A] text-[#3A2010] rounded">{proteinLabels[tag] || tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
