import Image from 'next/image'

export default function RecipeDetail({ recipe }) {
  if (!recipe) return null

  return (
    <div>
      {/* Hero Image */}
      <div className="relative h-[300px] bg-[#C8D49A]">
        {recipe.image_url ? (
          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🍽️
          </div>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
          <h1 className="text-3xl font-extrabold mb-2 text-white">{recipe.name}</h1>
          <div className="flex gap-2 flex-wrap">
            {recipe.speed && (
              <span className="bg-[#9B6035] px-3 py-1 rounded-xl text-sm text-white">
                {recipe.speed === 'quick' ? '快' : recipe.speed === 'medium' ? '中' : '慢'}
              </span>
            )}
            {recipe.difficulty && (
              <span className="bg-[#F0A060] px-3 py-1 rounded-xl text-sm text-white">
                {recipe.difficulty === 'easy' ? '易' : recipe.difficulty === 'medium' ? '中' : '難'}
              </span>
            )}
            {recipe.method && (
              <span className="bg-[#C8D49A] px-3 py-1 rounded-xl text-sm text-[#3A2010]">
                {recipe.method}
              </span>
            )}
            {recipe.cuisine && (
              <span className="bg-white/20 px-3 py-1 rounded-xl text-sm text-white">
                {recipe.cuisine}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6 grid grid-cols-12 gap-6">
        {/* Description */}
        {recipe.description && (
          <div className="col-span-12 bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
            <h3 className="text-base font-bold text-[#3A2010] mb-3">簡介</h3>
            <p className="text-[#AA7A50] leading-relaxed">{recipe.description}</p>
          </div>
        )}

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="col-span-12 bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
            <h3 className="text-base font-bold text-[#3A2010] mb-4">🥬 食材</h3>
            <ul className="list-none p-0 m-0">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between py-2.5 border-b border-[#DDD0B0]">
                  <span className="text-[#3A2010]">{ing.name || ing}</span>
                  <span className="text-[#AA7A50]">{ing.quantity} {ing.unit}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Steps */}
        {recipe.steps && recipe.steps.length > 0 && (
          <div className="col-span-12 bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
            <h3 className="text-base font-bold text-[#3A2010] mb-4">👨‍🍳 步驟</h3>
            <ol className="list-none p-0 m-0">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-4 mb-6 relative">
                  <div className="w-8 h-8 rounded-full bg-[#9B6035] text-white flex items-center justify-center font-bold flex-shrink-0">
                    {step.step_no || i + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-[#3A2010] leading-relaxed">{step.text}</p>
                    {step.time_seconds > 0 && (
                      <span className="text-xs text-[#AA7A50] mt-1 block">
                        ⏱️ {Math.floor(step.time_seconds / 60)} 分鐘
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
