import Image from 'next/image'

interface RecipeCardProps {
  recipe: {
    id: number
    name: string
    image_url?: string
    cooking_time?: number
    calories_per_serving?: number
    protein?: number
    cuisine?: string
    difficulty?: string
    method?: string
    [key: string]: any
  }
  onClick?: () => void
  onFavorite?: () => void
}

export default function RecipeCard({ recipe, onClick, onFavorite }: RecipeCardProps) {
  return (
    <div onClick={onClick} className="cursor-pointer bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all">
      {/* Image */}
      <div className="h-48 relative">
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
          {recipe.cooking_time || recipe.calories_per_serving ? `${recipe.cooking_time || '30'}分鐘 · ${recipe.calories_per_serving || '0'}卡路里` : '30分鐘 · 0卡路里'}
        </p>
        {/* Tags */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {recipe.cuisine && (
            <span className="text-xs px-2 py-1 bg-[#C8D49A] text-[#3A2010] rounded">{recipe.cuisine}</span>
          )}
          {recipe.difficulty && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">{recipe.difficulty}</span>
          )}
          {recipe.method && (
            <span className="text-xs px-2 py-1 bg-teal-500 text-white rounded">{recipe.method}</span>
          )}
        </div>
      </div>
    </div>
  )
}
