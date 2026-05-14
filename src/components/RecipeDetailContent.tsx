import Image from 'next/image'
import { METHOD_MAP, DIFFICULTY_MAP, SPEED_MAP } from '@/constants/taxonomy';
import { useState, useEffect, useCallback } from 'react'
import FavoriteButton from './FavoriteButton'

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
  favoriteLoading?: boolean
  onFavoriteClick?: () => void | Promise<void>
}

// Skeleton component for loading sections
function SectionSkeleton({ height = 'h-4' }: { height?: string }) {
  return <div className={`${height} w-full bg-[#E5DCC8] animate-pulse rounded`} />
}


// Label helpers with safe fallback
const getDifficultyLabel = (v?: string | null) => v ? (DIFFICULTY_MAP[v] || '其他') : '';
const getSpeedLabel = (v?: string | null) => v ? (SPEED_MAP[v] || '其他') : '';
const getMethodLabel = (v?: string | null) => v ? (METHOD_MAP[v] || '其他') : '';
const getUnitLabel = (unit?: { code?: string; name?: string; display_name_zh?: string } | null) => {
  if (!unit) return '';
  return unit.display_name_zh || unit.name || '其他';
};

// Format ingredient quantity for display (fractions, trim decimals)
function formatIngredientQuantity(qty: number | null | undefined): string {
  if (qty === null || qty === undefined) return '-';
  
  const q = Number(qty);
  if (Number.isInteger(q)) return q.toString();
  
  // Common fractions
  const fractions: Record<number, string> = {
    0.3333333333333333: '1/3',
    0.6666666666666666: '2/3',
    0.5: '1/2',
    0.25: '1/4',
    0.75: '3/4',
    0.125: '1/8',
    0.375: '3/8',
    0.625: '5/8',
    0.875: '7/8',
  };
  
  // Check exact match
  if (fractions[q]) return fractions[q];
  
  // Check close to fraction
  for (const [key, label] of Object.entries(fractions)) {
    if (Math.abs(q - Number(key)) < 0.01) return label;
  }
  
  // Round to max 2 decimals, trim trailing zeros
  const rounded = Math.round(q * 100) / 100;
  return rounded.toString();
}

export default function RecipeDetailContent({ recipe, isLoading, isFavorite, favoriteLoading, onFavoriteClick }: RecipeDetailContentProps) {
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
        {onFavoriteClick && (
          <div className="absolute top-4 right-4 z-10">
            <FavoriteButton
              active={isFavorite}
              loading={favoriteLoading}
              onClick={onFavoriteClick}
            />
          </div>
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
                    {getDifficultyLabel(recipe.difficulty)}
                  </span>
                </div>
              )}
              {recipe.speed && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <Clock className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {getSpeedLabel(recipe.speed)}
                  </span>
                </div>
              )}
              {recipe.method && (
                <div className="rounded-lg px-4 py-2 shadow-lg flex items-center gap-1" style={{ backgroundColor: '#F8F3E8' }}>
                  <ChefHat className="w-4 h-4" style={{ color: '#9B6035' }} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#9B6035' }}>
                    {getMethodLabel(recipe.method)}
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
                  <span style={{ color: '#AA7A50' }}>{formatIngredientQuantity(ing.quantity)} {getUnitLabel(ing.unit)}</span>
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
              {steps.map((step: any, i: number) => {
                const stepText = typeof step === 'string' ? step : (step?.text || '');
                const stepNo = step?.step_no ?? (i + 1);
                const stepTime = step?.time_seconds || 0;
                return (
                <li key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: '#9B6035', color: 'white' }}>
                    {stepNo}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="leading-relaxed" style={{ color: '#3A2010' }}>{stepText}</p>
                    {stepTime > 0 && (
                      <span className="text-xs mt-1 block" style={{ color: '#AA7A50' }}>
                        ⏱ {Math.floor(stepTime / 60)}分鐘
                      </span>
                    )}
                  </div>
                </li>
              );
              })}
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
