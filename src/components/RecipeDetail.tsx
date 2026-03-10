import Image from 'next/image'

// Helper functions for labels
function getSpeedLabel(speed: string) {
  if (speed === '快') return '快 (<15min)'
  if (speed === '中') return '中 (15-30min)'
  if (speed === '慢') return '慢 (>30min)'
  return speed
}

function getDifficultyLabel(difficulty: string) {
  if (difficulty === '易') return 'Easy'
  if (difficulty === '中') return 'Medium'
  if (difficulty === '難') return 'Hard'
  return difficulty
}

function getMethodLabel(method: string) {
  const methods: Record<string, string> = {
    '炒': 'Stir-fry',
    '蒸': 'Steam',
    '煮': 'Boil',
    '焗': 'Bake',
    '炆': 'Braise',
    '燒': 'Grill'
  }
  return methods[method] || method
}

export default function RecipeDetail({ recipe, compact = false }: { recipe: any, compact?: boolean }) {
  if (!recipe) return null

  const isCompact = compact

  return (
    <div className={isCompact ? '' : 'max-w-4xl mx-auto'}>
      {/* Hero Image */}
      {recipe.image_url && (
        <div className={`relative ${isCompact ? 'h-48' : 'h-64'} w-full mb-4 rounded-lg overflow-hidden`}>
          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
        </div>
      )}

      {/* Tags Row */}
      <div className={`flex flex-wrap gap-2 mb-4 ${isCompact ? '' : 'mb-6'}`}>
        {recipe.speed && (
          <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm">
            {getSpeedLabel(recipe.speed)}
          </span>
        )}
        {recipe.difficulty && (
          <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm">
            {getDifficultyLabel(recipe.difficulty)}
          </span>
        )}
        {recipe.method && (
          <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm">
            {getMethodLabel(recipe.method)}
          </span>
        )}
        {recipe.cuisine && (
          <span className="bg-[#F8F3E8] px-3 py-1 rounded-full text-sm">
            {recipe.cuisine}
          </span>
        )}
      </div>

      {/* Description */}
      {recipe.description && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-3">Description</h3>
          <p className="text-[#AA7A50] leading-relaxed">{recipe.description}</p>
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing: any, i: number) => (
              <li key={i} className="flex justify-between py-2 border-b border-[#DDD0B0] last:border-0">
                <span className="text-[#3A2010]">{ing.name}</span>
                <span className="text-[#AA7A50]">{ing.quantity} {ing.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {recipe.steps && recipe.steps.length > 0 && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">Steps</h3>
          <ol className="space-y-4">
            {recipe.steps.map((step: any, i: number) => (
              <li key={i} className="flex gap-4 relative">
                <div className="w-8 h-8 rounded-full bg-[#9B6035] text-white flex items-center justify-center font-bold flex-shrink-0">
                  {step.step_no || i + 1}
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-[#3A2010] leading-relaxed">{step.text}</p>
                  {step.time_seconds > 0 && (
                    <span className="text-xs text-[#AA7A50] mt-1 block">
                      {Math.floor(step.time_seconds / 60)} min
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
