import { prefetchRecipeDetail } from '@/features/recipes/services/recipeDetailClientCache';
import Image from 'next/image'
import { getSelectionReasonLabel, sortSelectionReasons } from '@/features/generate/config/selectionReasons';

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
  const map: Record<string, string> = { easy: '簡單', medium: '中等', hard: '困難' };
  return map[difficulty] || null;
}

// Get cuisine label
function getCuisineLabel(cuisine?: string): string | null {
  if (!cuisine) return null;
  const map: Record<string, string> = { 
    japanese: '日式', chinese: '中式', western: '西式', 
    italian: '意大利', korean: '韓式', thai: '泰式',
    港式: '港式', 川菜: '川菜', 臺式: '臺式'
  };
  return map[cuisine] || cuisine;
}

// Get speed label  
function getSpeedLabel(speed?: string): string | null {
  if (!speed) return null;
  const map: Record<string, string> = { quick: '快手', normal: '普通', slow: '慢煮' };
  return map[speed] || null;
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
 *   weeklyPlan: Record<string, Recipe[]>   - current plan state
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
  weeklyPlan: Record<string, Recipe[]>
  lockedSlots: Record<string, boolean>
  daysPerWeek: number
  dishesPerDay: number
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
  onRecipeClick,
  onReplace,
  onLock,
  onUnlock,
  onRemove,
  onAddRandom,
}: WeeklyPlanGridProps) {
  const weekDates = getWeekDates()
  const days = weekDates.slice(0, daysPerWeek)
  const handleRecipePrefetch = (recipe: any, source: string) => {
    if (!recipe?.id) return;
    console.log('[recipe-card] prefetch_triggered', { recipeId: recipe.id, source, entry: 'generate' });
    prefetchRecipeDetail(recipe.id);
  }

  // Prefetch helper

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
      {days.map(day => (
        <div 
          key={day.key}
          className={`rounded-xl overflow-hidden ${
            day.isWeekend ? 'bg-[#C8D49A]/30' : 'bg-white'
          } shadow-md`}
        >
          {/* Day Header */}
          <div className={`px-3 py-2 flex justify-between items-center ${
            day.isWeekend ? 'bg-[#C8D49A]' : 'bg-[#9B6035]'
          }`}>
            <div>
              <span className="text-white font-bold text-sm">{day.label}</span>
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
                    <div className="bg-[#F8F3E8] rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                      <div 
                        className="h-44 sm:h-48 relative cursor-pointer overflow-hidden"
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
                          <Image src={recipe.image_url} alt={recipe.name} fill className="object-cover" />
                        ) : (
                          <div className="h-full flex items-center justify-center bg-gray-200">
                            <span className="text-2xl">🍳</span>
                          </div>
                        )}
                        {isLocked && (
                          <div className="absolute top-1 right-1 bg-yellow-400 text-xs px-1 rounded">
                            🔒
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span className="text-base font-bold text-[#3A2010] truncate">{recipe.name}</span>
                          {getMealRoleLabel(recipe) && (
                            <span className="text-[10px] px-2 py-0.5 bg-[#E8E4DC] text-[#8B7355] rounded-full">
                              {getMealRoleLabel(recipe)}
                            </span>
                          )}
                        </div>
                        {/* Metadata: time, calories, difficulty, cuisine, speed */}
                        {recipe.difficulty || getTimeLabel(recipe) || recipe.calories_per_serving ? (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {getTimeLabel(recipe) && (
                              <span className="text-sm px-3 py-1 bg-[#F4EDDD] text-[#9B6035] rounded-full">
                                ⏱ {getTimeLabel(recipe)}
                              </span>
                            )}
                            {recipe.calories_per_serving && (
                              <span className="text-sm px-3 py-1 bg-[#F4EDDD] text-[#9B6035] rounded-full">
                                🔥 {recipe.calories_per_serving} kcal
                              </span>
                            )}
                            {getDifficultyLabel(recipe.difficulty) && (
                              <span className="text-sm px-3 py-1 bg-[#E8F4E8] text-[#4A7040] rounded-full">
                                {getDifficultyLabel(recipe.difficulty)}
                              </span>
                            )}
                          </div>
                        ) : null}
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            onClick={() => onReplace(day.key, index)}
                            className="flex-1 text-sm font-medium bg-[#A66336] text-white rounded-full px-4 py-1.5 shadow-sm hover:bg-[#8B5230] active:scale-95 transition-all"
                          >
                            換一道
                          </button>
                          <button
                            onClick={() => isLocked ? onUnlock(day.key, index) : onLock(day.key, index)}
                            className="text-sm bg-white/70 border border-[#E0CBB2] text-[#8B5A2B] rounded-full px-3 py-1.5 hover:bg-white active:scale-95 transition-all"
                          >
                            {isLocked ? '解鎖' : '鎖定'}
                          </button>
                          <button
                            onClick={() => onRemove(day.key, index)}
                            className="text-sm bg-red-50 border border-red-100 text-red-500 rounded-full px-3 py-1.5 hover:bg-red-100 active:scale-95 transition-all"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddRandom(day.key, index)}
                      className="w-full py-3 border-2 border-dashed border-[#DDD0B0] rounded-lg text-[#AA7A50] text-sm hover:border-[#9B6035] hover:text-[#9B6035] transition-colors"
                    >
                      + 添加
                    </button>
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
