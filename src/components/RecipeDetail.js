import Image from "next/image"

function getSpeedLabel(speed) {
  if (speed === "fast") return "Quick"
  if (speed === "medium") return "Medium"
  if (speed === "slow") return "Slow"
  return speed
}

function getDifficultyLabel(difficulty) {
  if (difficulty === "easy") return "Easy"
  if (difficulty === "medium") return "Medium"
  if (difficulty === "hard") return "Hard"
  return difficulty
}

function getMethodLabel(method) {
  const methods = {
    stir_fry: "Stir-fry",
    steam: "Steam", 
    boil: "Boil",
    bake: "Bake",
    braised: "Braise",
    grill: "Grill"
  }
  return methods[method] || method
}

export default function RecipeDetail({ recipe, compact = false }) {
  if (!recipe) return null

  const isCompact = compact

  return (
    <div className={isCompact ? "" : "max-w-4xl mx-auto"}>
      {recipe.image_url && (
        <div className={"relative " + (isCompact ? "h-48" : "h-64") + " w-full mb-4 rounded-lg overflow-hidden"}>
          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
        </div>
      )}

      <div className={"flex flex-wrap gap-2 mb-4 " + (isCompact ? "" : "mb-6")}>
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

      {recipe.description && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-3">Description</h3>
          <p className="text-[#AA7A50] leading-relaxed">{recipe.description}</p>
        </div>
      )}

      {recipe.ingredients && recipe.ingredients.length > 0 && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between py-2 border-b border-[#DDD0B0] last:border-0">
                <span className="text-[#3A2010]">{ing.name || ing}</span>
                <span className="text-[#AA7A50]">{ing.quantity} {ing.unit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.steps && recipe.steps.length > 0 && (
        <div className="bg-[#FEFCF8] rounded-xl p-5 mb-6 border border-[#DDD0B0]">
          <h3 className="text-base font-bold text-[#3A2010] mb-4">Steps</h3>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
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
