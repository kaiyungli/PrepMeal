import Image from 'next/image'
import { useState, useEffect, useCallback } from 'react'

interface RecipeDetailContentProps {
  recipe: {
    id: string
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
    ingredients?: Array<{
      display_name?: string
      name?: string
      slug?: string
      quantity?: number | null
      unit?: { name?: string } | string | null
      shopping_category?: string
      source?: string
    }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  }
  isLoading?: boolean
  isFavorite?: boolean
  toggleFavorite?: (recipeId: string | number) => Promise<boolean>
  isAuthenticated?: boolean
  onAuthRequired?: () => void
}

// Skeleton component for loading sections
function SectionSkeleton({ height = 'h-4' }: { height?: string }) {
  return <div className={`${height} w-full bg-[#E5DCC8] animate-pulse rounded`} />
}

const difficultyLabels: Record<string, string> = { easy: '易', medium: '中', hard: '難', 易: '易', 中: '中', 難: '難' }
const speedLabels: Record<string, string> = { quick: '快', normal: '中', slow: '慢', 快: '快', 中: '中', 慢: '慢' }
const methodLabels: Record<string, string> = { stir_fry: '炒', steam: '蒸', boil: '煮', bake: '焗', braised: '炆', grill: '燒', fried: '炸', 炒: '炒', 蒸: '蒸', 煮: '煮', 焗: '焗', 炆: '炆', 燒: '燒' }

export default function RecipeDetailContent({ recipe, isLoading, isFavorite, toggleFavorite, isAuthenticated, onAuthRequired }: RecipeDetailContentProps) {
  if (!recipe) return null

  // Defer heavy sections to reduce initial paint cost on iPad
  const [showHeavySections, setShowHeavySections] = useState(false);
  
  // Reset and defer heavy sections when recipe changes
  useEffect(() => {
    setShowHeavySections(false);
    const id = requestAnimationFrame(() => {
      setShowHeavySections(true);
    });
    return () => cancelAnimationFrame(id);
  }, [recipe?.id]);

  // Defensive guards for arrays
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : []

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F3E8' }}>
      {/* Hero Image */}
      <div className="relative h-[250px] md:h-[350px] lg:h-[400px] overflow-hidden">
        {/* Favorite Button - top right, offset from close button */}
        {(toggleFavorite || onAuthRequired) && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated && onAuthRequired) {
                onAuthRequired();
                return;
              }
              if (toggleFavorite && recipe?.id) {
                toggleFavorite(recipe.id);
              }
            }} 
            className={`absolute top-4 right-14 rounded-full w-9 h-9 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20 z-10 hover:scale-110 ${
              isFavorite 
                ? 'bg-rose-500 text-white' 
                : 'bg-white/80 text-rose-400 hover:bg-white'
            }`}
            aria-label={isFavorite ? "取消收藏" : "收藏"}
          >
            <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.5 10.5 11.25 10.5 11.25S21 15.75 21 8.25z" />
            </svg>
          </button>
        )}
        
        {recipe.image_url ? (
          <Image 
            src={recipe.image_url} 
            alt={recipe.name} 
            fill 
            className="object-cover"
            sizes="(max-width: 600px) 100vw, (max-width: 900px) 80vw, 1200px" />
        ) : (
          <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#C8D49A' }}>
            <span className="text-8xl">🍳</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-[1200px] mx-auto px-4 pb-8">
            {/* Tags */}
            <div className="flex items-center gap-3 mb-4">
              {recipe.difficulty && (
                <div className="rounded-lg px-4 py-2 shadow-lg" style={{ backgroundColor: '#C8D49A' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#3A2010' }}>
                    {difficultyLabels[recipe.difficulty] || recipe.difficulty}
                  </span>
                </div>
              )}
              {recipe.speed && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <Clock className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {speedLabels[recipe.speed] || recipe.speed}
                  </span>
                </div>
              )}
              {recipe.method && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <ChefHat className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {methodLabels[recipe.method] || recipe.method}
                  </span>
                </div>
              )}
            </div>
            
            {/* Title */}
            <h1 className="text-4xl font-black text-white mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              {recipe.name}
            </h1>
            
            {/* Meta info */}
            <div className="flex items-center gap-4">
              {recipe.calories_per_serving && (
                <div className="rounded-lg px-4 py-2 flex items-center gap-1" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <Flame className="w-4 h-4 text-white" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>
                    {recipe.calories_per_serving} 卡
                  </span>
                </div>
              )}
              {/* Removed servings display - showing calories only */}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        
        {/* Description Card */}
        {recipe.description && (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-3" style={{ color: '#3A2010' }}>簡介</h3>
            <p className="leading-relaxed" style={{ color: '#AA7A50' }}>{recipe.description}</p>
          </div>
        )}

        {/* Ingredients Card - Deferred */}
        {showHeavySections ? (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>🥬 食材</h3>
            {isLoading ? (
            <div className="space-y-3">
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
            </div>
          ) : ingredients.length > 0 ? (
            <ul className="space-y-3">
              {ingredients.map((ing: any, i: number) => (
                <li key={i} className="flex justify-between py-2 border-b" style={{ borderColor: '#DDD0B0' }}>
                  <span style={{ color: '#3A2010' }}>{ing.display_name || ing.name || ing.slug}</span>
                  <span style={{ color: '#AA7A50' }}>{ing.quantity ?? '-'} {ing.unit?.name || ing.unit || ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#AA7A50' }}>暫無食材資料</p>
          )}
        </div>
        ) : (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0', minHeight: '120px' }}>
            <div className="space-y-3">
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
              <SectionSkeleton height="h-6" />
            </div>
          </div>
        )}

        {/* Steps Card - Deferred */}
        {showHeavySections ? (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>👨‍🍳 烹飪步驟</h3>
          {isLoading ? (
            <div className="space-y-4">
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
            </div>
          ) : steps.length > 0 ? (
            <ol className="space-y-4">
              {steps.map((step: any, i: number) => (
                <li key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#9B6035', color: 'white' }}>
                    {step.step_no || i + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="leading-relaxed" style={{ color: '#3A2010' }}>{step.text}</p>
                    {(step.time_seconds || 0) > 0 && (
                      <span className="text-xs mt-1 block" style={{ color: '#AA7A50' }}>
                        ⏱ {Math.floor((step.time_seconds || 0) / 60)}分鐘
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ color: '#AA7A50' }}>暫無步驟資料</p>
          )}
        </div>
        ) : (
          <div className="rounded-2xl p-6 border-2 mb-6" style={{ backgroundColor: '#FEFCF8', borderColor: '#DDD0B0', minHeight: '120px' }}>
            <div className="space-y-4">
              <SectionSkeleton height="h-16" />
              <SectionSkeleton height="h-16" />
            </div>
          </div>
        )}

        {/* Nutrition Card - Keep immediate for now (lightweight) */}
        <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: '#FFF9E6', borderColor: '#F0A060' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>📊 營養資料</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.calories_per_serving || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>卡路里</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.protein_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>蛋白質(g)</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.carbs_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>碳水(g)</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ backgroundColor: 'white' }}>
              <div className="text-xl font-bold" style={{ color: '#9B6035' }}>{recipe.fat_g || '-'}</div>
              <div className="text-xs" style={{ color: '#AA7A50' }}>脂肪(g)</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

// Icons as simple components
function Clock({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  )
}

function ChefHat({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
      <line x1="6" y1="17" x2="18" y2="17"></line>
    </svg>
  )
}

function Flame({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>
  )
}
