import Image from 'next/image'
import Modal from '@/components/ui/Modal'

interface RecipeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  recipe?: {
    id: number
    name: string
    image_url?: string
    description?: string
    cuisine?: string
    difficulty?: string
    speed?: string
    method?: string
    calories_per_serving?: number
    protein?: number
    carbs_g?: number
    fat_g?: number
    ingredients?: Array<{ name: string; quantity: number; unit: string }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  }
  loading?: boolean
}

// Label mappings
const cuisineLabels: Record<string, string> = {
  中菜: '中菜', 西菜: '西菜', 日菜: '日菜', 韓菜: '韓菜', 泰菜: '泰菜',
  印度: '印度', 越南: '越南', 意大利: '意大利', 法國: '法國', 美國: '美國'
}
const difficultyLabels: Record<string, string> = { easy: '易', medium: '中', hard: '難', 易: '易', 中: '中', 難: '難' }
const speedLabels: Record<string, string> = { quick: '快', normal: '中', slow: '慢', 快: '快', 中: '中', 慢: '慢' }
const methodLabels: Record<string, string> = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒', 炒: '炒', 蒸: '蒸', 煮: '煮' }

export default function RecipeDetailModal({ isOpen, onClose, recipe, loading }: RecipeDetailModalProps) {
  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} title={recipe?.name} onClose={onClose} maxWidth="600px">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="text-[#AA7A50]">載入中...</div>
        </div>
      ) : recipe ? (
        <div className="max-h-[70vh] overflow-y-auto">
          {/* Hero Image */}
          {recipe.image_url && (
            <div className="relative h-48 w-full mb-4 rounded-lg overflow-hidden">
              <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
            </div>
          )}
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.speed && (
              <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm text-[#3A2010]">
                ⏱️ {speedLabels[recipe.speed] || recipe.speed}
              </span>
            )}
            {recipe.difficulty && (
              <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm text-[#3A2010]">
                {difficultyLabels[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.method && (
              <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm text-[#3A2010]">
                {methodLabels[recipe.method] || recipe.method}
              </span>
            )}
            {recipe.cuisine && (
              <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm text-[#3A2010]">
                {cuisineLabels[recipe.cuisine] || recipe.cuisine}
              </span>
            )}
          </div>

          {/* Nutrition */}
          <div className="flex gap-4 mb-4 text-sm">
            {recipe.calories_per_serving && (
              <span className="text-[#AA7A50]">🔥 {recipe.calories_per_serving} 卡</span>
            )}
            {recipe.protein && (
              <span className="text-[#AA7A50]">💪 蛋白 {recipe.protein}g</span>
            )}
            {recipe.carbs_g && (
              <span className="text-[#AA7A50]">碳水 {recipe.carbs_g}g</span>
            )}
            {recipe.fat_g && (
              <span className="text-[#AA7A50]">脂肪 {recipe.fat_g}g</span>
            )}
          </div>
          
          {/* Description */}
          {recipe.description && (
            <p className="text-[#AA7A50] mb-4">{recipe.description}</p>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="bg-[#FEFCF8] rounded-xl p-4 mb-4 border border-[#DDD0B0]">
              <h3 className="font-bold text-[#3A2010] mb-3">🥬 食材</h3>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-[#3A2010]">{ing.name}</span>
                    <span className="text-[#AA7A50]">{ing.quantity} {ing.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          {recipe.steps && recipe.steps.length > 0 && (
            <div className="bg-[#FEFCF8] rounded-xl p-4 mb-4 border border-[#DDD0B0]">
              <h3 className="font-bold text-[#3A2010] mb-3">👨‍🍳 步驟</h3>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#9B6035] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {step.step_no || i + 1}
                    </div>
                    <div>
                      <p className="text-[#3A2010] text-sm">{step.text}</p>
                      {(step.time_seconds || 0) > 0 && (
                        <span className="text-xs text-[#AA7A50]">⏱️ {Math.floor((step.time_seconds || 0) / 60)} 分鐘</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-10">
          <div className="text-[#AA7A50]">找不到食譜</div>
        </div>
      )}
    </Modal>
  )
}
