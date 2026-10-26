import { generateCookingTips, generatePairingSuggestions, generateStorageTips, STORAGE_GUIDANCE_SOURCE } from '@/lib/recipes/recipeGuidance';
import Image from 'next/image'
import { RecipeDetailInArticleAd } from '@/components/ads/AdSlot';
import { METHOD_MAP, DIFFICULTY_MAP, SPEED_MAP } from '@/constants/taxonomy';
import { useState, useEffect, useCallback } from 'react'
import { formatQuantityForDisplay } from '@/lib/quantityFormatter';
import { formatUnit } from '@/lib/formatters';
import FavoriteButton from './FavoriteButton'
import RecipeProvenance from './RecipeProvenance';
import { ingredientPrepNote } from '@/features/recipes/mappers/ingredientPrepNote';
import type { RecipeProvenance as Provenance } from '@/features/recipes/mappers/recipeProvenance';

interface RecipeDetailContentProps {
  recipe: Partial<Provenance> & {
    meal_role?: string | null
    dish_type?: string | null
    is_complete_meal?: boolean | null
    primary_protein?: string | null
    base_servings?: number | null
    dietary_notes?: string[]
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
      is_optional?: boolean
      prep_note?: string | null
      unit?: { code?: string; name?: string; display_name_zh?: string } | string | null
      shopping_category?: string
      source?: string
    }>
    steps?: Array<{ step_no: number; text: string; time_seconds?: number }>
  } | null
  isLoading?: boolean
  showAds?: boolean
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
const getUnitLabel = (unit?: string | { code?: string; name?: string; display_name_zh?: string } | null) => {
  if (!unit) return '';
  return typeof unit === 'object' ? unit.display_name_zh || formatUnit(unit) : formatUnit(unit);
};

export default function RecipeDetailContent({ recipe, isLoading, isFavorite, favoriteLoading, onFavoriteClick, showAds = false }: RecipeDetailContentProps) {
  // Defer heavy sections to reduce initial paint cost on iPad
  const recipeId = recipe?.id;
  const [deferredSections, setDeferredSections] = useState({ recipeId, ready: false });
  // Reset readiness when the input changes, before committing stale sections.
  // The guarded render adjustment avoids a synchronous setState in the effect.
  if (deferredSections.recipeId !== recipeId) {
    setDeferredSections({ recipeId, ready: false });
  }
  const showHeavySections = deferredSections.recipeId === recipeId && deferredSections.ready;
  
  // Reset and defer heavy sections when recipe changes
  useEffect(() => {
    if (!recipeId) return;
    let active = true;
    const id = requestAnimationFrame(() => {
      if (active) setDeferredSections({ recipeId, ready: true });
    });
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [recipeId]);

  // Hooks must run even when the recipe is temporarily absent.
  if (!recipe) return null

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
              {recipe.base_servings != null && <span className="text-white text-sm">原方 {recipe.base_servings} 人份</span>}
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
            <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>🥬 食材{recipe.base_servings != null ? `（${recipe.base_servings} 人份總量）` : ''}</h3>
            {recipe.dietary_notes?.map(note => <p key={note} className="mb-3 text-sm" style={{ color: '#5A4030' }}>{note}</p>)}
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
                  <div style={{ color: '#3A2010' }}>
                    <span>{ing.display_name || ing.name || ing.slug}</span>
                    {ing.is_optional && <span className="ml-2 text-xs" style={{ color: '#AA7A50' }}>選配</span>}
                    {ingredientPrepNote(ing.prep_note) && <p className="mt-1 text-sm" style={{ color: '#AA7A50' }}>{ingredientPrepNote(ing.prep_note)}</p>}
                  </div>
                  <span className="shrink-0 ml-3" style={{ color: '#AA7A50' }}>{formatQuantityForDisplay(ing.quantity, ing.unit, { roundCount: false })} {getUnitLabel(ing.unit)}</span>
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

        {/* Ad between ingredients and steps */}
        {showAds && <RecipeDetailInArticleAd className="my-6" />}

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
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>📊 營養資料（每人份）</h3>
          {recipe.nutrition_is_estimate && <p className="text-sm mb-3" style={{ color: '#5A4030' }}>營養數值為食材投入量推算，並非化驗結果；實際數值會因品牌、份量及烹調而異。</p>}
          {!!recipe.nutrition_notes?.length && <ul className="text-sm mb-3 list-disc pl-5" style={{ color: '#5A4030' }}>{recipe.nutrition_notes.map((note, i) => <li key={i}>{note}</li>)}</ul>}
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

        {/* SEO Section: 烹飪貼士 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>💡 烹飪貼士</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generateCookingTips(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SEO Section: 配搭建議 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>🍽️ 配搭建議</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generatePairingSuggestions(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8"><RecipeProvenance recipe={recipe} /></div>

        {/* SEO Section: 保存方法 */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4" style={{ color: '#3A2010' }}>❄️ 保存方法</h3>
          <ul className="space-y-2" style={{ color: '#5A4030' }}>
            {generateStorageTips(recipe).map((tip: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <a href={STORAGE_GUIDANCE_SOURCE} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: '#9B6035' }}>參考：食物安全中心剩食處理指引</a>
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
