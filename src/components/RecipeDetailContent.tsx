import Image from 'next/image'

interface RecipeDetailContentProps {
  recipe: {
    id: number
    name: string
    image_url?: string
    description?: string
    cuisine?: string
    difficulty?: string
    speed?: string
    method?: string
    calories_per_serving?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
    ingredients?: Array<{ ingredient_id?: string; ingredient?: string; name?: string; quantity: number; unit: string }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  }
}

const difficultyLabels: Record<string, string> = { easy: '易', medium: '中', hard: '難', 易: '易', 中: '中', 難: '難' }
const speedLabels: Record<string, string> = { quick: '快', normal: '中', slow: '慢', 快: '快', 中: '中', 慢: '慢' }
const methodLabels: Record<string, string> = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒', 炒: '炒', 蒸: '蒸', 煮: '煮' }

export default function RecipeDetailContent({ recipe }: RecipeDetailContentProps) {
  if (!recipe) return null

  return (
    <div>
      {/* Hero Image */}
      <div className="relative h-[300px] bg-[#C8D49A]">
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" priority />
        ) : (
          <div className="h-full flex items-center justify-center text-6xl">🍳</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-5 right-5 text-white">
          <h1 className="text-3xl font-extrabold mb-2">{recipe.name}</h1>
          <div className="flex gap-2 flex-wrap">
            {recipe.difficulty && (
              <span className="bg-[#9B6035] px-3 py-1 rounded-xl text-sm">
                {difficultyLabels[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.speed && (
              <span className="bg-[#F0A060] px-3 py-1 rounded-xl text-sm">
                {speedLabels[recipe.speed] || recipe.speed}
              </span>
            )}
            {recipe.method && (
              <span className="bg-[#C8D49A] px-3 py-1 rounded-xl text-sm text-[#3A2010]">
                {methodLabels[recipe.method] || recipe.method}
              </span>
            )}
            {recipe.calories_per_serving && (
              <span className="bg-white/20 px-3 py-1 rounded-xl text-sm">
                {recipe.calories_per_serving} 卡
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        
        {/* Description Card */}
        {recipe.description && (
          <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
            <h3 className="text-base font-bold text-[#3A2010] mb-3">簡介</h3>
            <p className="text-[#AA7A50] leading-relaxed">{recipe.description}</p>
          </div>
        )}

        {/* Ingredients Card */}
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">🥬 食材</h3>
          {(recipe.ingredients && recipe.ingredients.length > 0) ? (
            <ul className="list-none p-0 m-0">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between py-2.5 border-b border-[#DDD0B0]">
                  <span className="text-[#3A2010]">{ing.ingredient_id || ing.ingredient || ing.name || '-'}</span>
                  <span className="text-[#AA7A50]">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[#AA7A50]">暫無食材資料</p>
          )}
        </div>

        {/* Cooking Steps Card */}
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">👨🍳 烹飪步驟</h3>
          {(recipe.steps && recipe.steps.length > 0) ? (
            <ol className="list-none p-0 m-0">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4 mb-5 relative">
                  <div className="w-8 h-8 rounded-full bg-[#9B6035] text-white flex items-center justify-center font-bold flex-shrink-0">
                    {step.step_no}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-[#3A2010] leading-relaxed">{step.text}</p>
                    {(step.time_seconds || 0) > 0 && (
                      <span className="text-xs text-[#AA7A50] mt-1 block">
                        ⏱ {Math.floor((step.time_seconds || 0) / 60)}分鐘
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[#AA7A50]">暫無步驟資料</p>
          )}
        </div>

        {/* Nutrition Card */}
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">📊 營養資料</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-[#F8F3E8] rounded-lg">
              <div className="text-xl font-bold text-[#9B6035]">{recipe.calories_per_serving || '-'}</div>
              <div className="text-xs text-[#AA7A50]">卡路里</div>
            </div>
            <div className="text-center p-3 bg-[#F8F3E8] rounded-lg">
              <div className="text-xl font-bold text-[#9B6035]">{recipe.protein_g || '-'}</div>
              <div className="text-xs text-[#AA7A50]">蛋白質(g)</div>
            </div>
            <div className="text-center p-3 bg-[#F8F3E8] rounded-lg">
              <div className="text-xl font-bold text-[#9B6035]">{recipe.carbs_g || '-'}</div>
              <div className="text-xs text-[#AA7A50]">碳水(g)</div>
            </div>
            <div className="text-center p-3 bg-[#F8F3E8] rounded-lg">
              <div className="text-xl font-bold text-[#9B6035]">{recipe.fat_g || '-'}</div>
              <div className="text-xs text-[#AA7A50]">脂肪(g)</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
