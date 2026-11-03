import { prefetchRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';
import Image from 'next/image'

import { getSlotRoleForIndex } from '@/features/generate/utils/slotRoleFilter';
import { getSlotRoleLabel } from '@/features/generate/utils/planFeedback';

// Get meal role label for display
function getMealRoleLabel(recipe: Recipe): string | null {
  if (recipe.is_complete_meal || recipe.meal_role === 'complete_meal') return '完整餐';
  if (recipe.meal_role === 'veg_side') return '配菜';
  if (recipe.meal_role === 'protein_main') return '主菜';
  // Default based on dish_type
  if (recipe.dish_type === 'side') return '配菜';
  if (recipe.dish_type === 'soup') return '湯';
  return null;
}

// Get total time in minutes
function getTimeLabel(recipe: Recipe): string | null {
  const total = recipe.total_time_minutes || 
    ((recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0));
  return total > 0 ? `${total}分鐘` : null;
}

// Get difficulty label
function getDifficultyLabel(difficulty?: string): string | null {
  if (!difficulty) return null;
  const map: Record<string, string> = { easy: '容易', medium: '中等', hard: '困難' };
  return map[difficulty] || null;
}

const DAYS = [
  { key: 'mon', label: '第一天', isWeekend: false },
  { key: 'tue', label: '第二天', isWeekend: false },
  { key: 'wed', label: '第三天', isWeekend: false },
  { key: 'thu', label: '第四天', isWeekend: false },
  { key: 'fri', label: '第五天', isWeekend: false },
  { key: 'sat', label: '第六天', isWeekend: true },
  { key: 'sun', label: '第七天', isWeekend: true },
]

// Generate dates for current week
function getWeekDates() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (today.getDay() - 1))
  
  return DAYS.map((day, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const month = date.getMonth() + 1
    const dayNum = date.getDate()
    return { ...day, date: `${month}月${dayNum}日` }
  })
}

interface Recipe {
  id: string
  name: string
  image_url?: string
  cuisine?: string
  dish_type?: string
  meal_role?: string
  is_complete_meal?: boolean
  total_time_minutes?: number
  prep_time_minutes?: number
  cook_time_minutes?: number
  calories_per_serving?: number
  difficulty?: string
  speed?: string
}

/**
 * WeeklyPlanGrid - displays weekly meal plan as a grid
 * 
 * DATA PROPS:
 *   weeklyPlan: Record<string, (Recipe | null)[]> - current plan state; null = empty slot
 *   lockedSlots: Record<string, boolean> - which slots are locked
 *   daysPerWeek: number                  - how many days to display
 *   dishesPerDay: number                - how many dishes per day
 * 
 * CALLBACK PROPS (all required):
 *   onRecipeClick: (recipe) => void    - show recipe detail
 *   onReplace: (dayKey, index) => void - replace recipe
 *   onLock: (dayKey, index) => void    - lock slot
 *   onUnlock: (dayKey, index) => void  - unlock slot
 *   onRemove: (dayKey, index) => void  - remove recipe
 *   onAddRandom: (dayKey, index) => void - add random recipe
 */
interface WeeklyPlanGridProps {
  weeklyPlan: Record<string, (Recipe | null)[]>
  lockedSlots: Record<string, boolean>
  daysPerWeek: number
  dishesPerDay: number
  dailyComposition?: string
  onRecipeClick: (recipe: Recipe) => void
  onReplace: (dayKey: string, index: number) => void
  onLock: (dayKey: string, index: number) => void
  onUnlock: (dayKey: string, index: number) => void
  onRemove: (dayKey: string, index: number) => void
  onAddRandom: (dayKey: string, index: number) => void
}

export default function WeeklyPlanGrid({
  weeklyPlan,
  lockedSlots,
  daysPerWeek,
  dishesPerDay,
  dailyComposition = 'meat_veg',
  onRecipeClick,
  onReplace,
  onLock,
  onUnlock,
  onRemove,
  onAddRandom,
}: WeeklyPlanGridProps) {
  const weekDates = getWeekDates()
  const days = weekDates.slice(0, daysPerWeek)
  const handleRecipePrefetch = (recipe: Recipe, source: string) => {
    if (!recipe?.id) return;
    console.log('[recipe-card] prefetch_triggered', { recipeId: recipe.id, source, entry: 'generate' });
    prefetchRecipeDetail(recipe.id);
  }

  // Prefetch helper

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 ${daysPerWeek === 7 ? 'xl:grid-cols-4' : ''}`}>
      {days.map(day => (
        <div 
          key={day.key}
          className={`rounded-xl overflow-hidden ${
            day.isWeekend ? 'bg-[#F2F4E9]' : 'bg-white'
          } border border-[#E8DFD0]`}
        >
          {/* Day Header */}
          <div className={`px-3 py-2 flex justify-between items-center ${
            day.isWeekend ? 'bg-[#E7EDD5] text-[#3D4C25]' : 'bg-[#F0E5D6] text-[#5D3B24]'
          }`}>
            <div>
              <span className="font-semibold text-sm">{day.label}</span>
            </div>
          </div>

          {/* Recipe Slots */}
          <div className="p-2 space-y-2">
            {Array.from({ length: dishesPerDay }).map((_, index) => {
              const recipe = weeklyPlan[day.key]?.[index]
              const isLocked = lockedSlots[`${day.key}-${index}`]
              
              return (
                <div key={index} className="relative">
                  {recipe ? (
                    <div className="bg-white rounded-lg overflow-hidden flex flex-col">
                      <div 
                        className="aspect-video relative cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9B6035]"
                        onMouseEnter={() => handleRecipePrefetch(recipe, 'hover')}
                        onFocus={() => handleRecipePrefetch(recipe, 'focus')}
                        onTouchStart={() => handleRecipePrefetch(recipe, 'touch')}
                        onClick={() => onRecipeClick(recipe)}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRecipeClick(recipe);
                          }
                        }}
                      >
                        {recipe.image_url ? (
                          <Image src={recipe.image_url} alt={recipe.name} fill sizes="(min-width: 1280px) 420px, (min-width: 768px) 50vw, 100vw" className="object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center bg-gray-200">
                            <span className="text-2xl">🍳</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="absolute top-2 right-2 bg-white/95 text-[#3A2010] text-xs px-2 py-1 rounded-md">
                            已鎖定
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col">
                        <div className="mb-2">
                          <h3 className="min-h-12 text-base leading-6 font-semibold text-[#3A2010] break-words">{recipe.name}</h3>
                          {dishesPerDay > 1 && getMealRoleLabel(recipe) && (
                            <span className="text-xs text-[#66594B]">
                              {getMealRoleLabel(recipe)}
                            </span>
                          )}
                        </div>
                        {/* Metadata: time, calories, difficulty, cuisine, speed */}
                        {recipe.difficulty || getTimeLabel(recipe) || recipe.calories_per_serving ? (
                          <div className="min-h-12 flex flex-wrap content-start gap-x-3 gap-y-1 text-sm text-[#66594B]">
                            {getTimeLabel(recipe) && (
                              <span className="whitespace-nowrap">
                                {getTimeLabel(recipe)}
                              </span>
                            )}
                            {recipe.calories_per_serving && (
                              <span className="whitespace-nowrap">
                                {recipe.calories_per_serving} 卡路里／人
                              </span>
                            )}
                            {getDifficultyLabel(recipe.difficulty) && (
                              <span className="whitespace-nowrap">
                                {getDifficultyLabel(recipe.difficulty)}
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#EEE7DB] pt-3">
                          <button
                            onClick={() => onReplace(day.key, index)}
                            className="flex-1 min-h-10 whitespace-nowrap text-sm font-semibold text-[#794B2B] bg-[#F5EDE2] rounded-lg px-3 py-2 hover:bg-[#ECE0D0] focus-visible:outline-2 focus-visible:outline-[#9B6035]"
                          >
                            換一道
                          </button>
                          <button
                            aria-pressed={isLocked}
                            onClick={() => isLocked ? onUnlock(day.key, index) : onLock(day.key, index)}
                            className="min-h-10 whitespace-nowrap text-sm border border-[#E0CBB2] text-[#65482F] rounded-lg px-3 py-2 hover:bg-[#F8F3E8] focus-visible:outline-2 focus-visible:outline-[#9B6035]"
                          >
                            {isLocked ? '解鎖' : '鎖定'}
                          </button>
                          <details className="group relative shrink-0">
                            <summary aria-label={`${day.label}第${index + 1}道更多操作`} className="flex min-h-10 min-w-10 cursor-pointer list-none items-center justify-center rounded-lg text-[#66594B] hover:bg-[#F8F3E8] focus-visible:outline-2 focus-visible:outline-[#9B6035]">⋯</summary>
                            <div className="absolute bottom-full right-0 z-20 mb-2 min-w-28 rounded-lg border border-[#DDD0B0] bg-white p-1 shadow-lg">
                              <button type="button" onClick={() => onRemove(day.key, index)} className="block w-full min-h-10 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-[#A12E2E] hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-[#9B6035]">移除</button>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#DDD0B0] text-center">
                      <p className="pt-3 text-sm text-[#66594B]">
                        欠一道{getSlotRoleLabel(getSlotRoleForIndex(dailyComposition, index))}
                      </p>
                    <button
                      type="button"
                      aria-label={`${day.label}第${index + 1}道：添加${getSlotRoleLabel(getSlotRoleForIndex(dailyComposition, index))}`}
                      onClick={() => onAddRandom(day.key, index)}
                      className="w-full py-3 rounded-lg text-[#AA7A50] text-sm hover:text-[#9B6035] transition-colors"
                    >
                      + 添加
                    </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
