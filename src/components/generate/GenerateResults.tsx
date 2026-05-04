'use client'

import { useEffect } from 'react'
import { perfLog } from '@/utils/perf';
import WeeklyPlanGrid from './WeeklyPlanGrid'

interface Recipe {
  id: string
  name: string
  image_url?: string
  cuisine?: string
  dish_type?: string
  tags?: string[]
  ingredients?: { name: string; quantity: number; unit: string }[]
  steps?: { text: string }[]
}

/**
 * GenerateResults - displays weekly meal plan grid
 * 
 * CONTRACT:
 *   weeklyPlan: Record<string, Recipe[]>  - current plan state
 *   lockedSlots: Record<string, boolean>  - locked slots
 *   daysPerWeek: number                   - days to show
 *   dishesPerDay: number                  - dishes per day
 *   filteredRecipes: Recipe[]             - available recipes
 * 
 * CALLBACKS:
 *   onLock, onUnlock, onRemove, onReplace, onAddRandom, onRecipeClick
 */
interface GenerateResultsProps {
  traceId?: string;
  weeklyPlan: Record<string, Recipe[]>
  lockedSlots: Record<string, boolean>
  daysPerWeek: number
  dishesPerDay: number
  filteredRecipes: Recipe[]
  onLock: (dayKey: string, index: number) => void
  onUnlock: (dayKey: string, index: number) => void
  onRemove: (dayKey: string, index: number) => void
  onReplace: (dayKey: string, index: number) => void
  onAddRandom: (dayKey: string, index: number) => void
  onRecipeClick: (recipe: Recipe) => void
}

export default function GenerateResults({
  traceId,
  weeklyPlan,
  lockedSlots,
  daysPerWeek,
  dishesPerDay,
  filteredRecipes,
  onLock,
  onUnlock,
  onRemove,
  onReplace,
  onAddRandom,
  onRecipeClick,
}: GenerateResultsProps) {

  const replaceRecipe = (dayKey: string, index: number) => {
    if (onReplace) {
      onReplace(dayKey, index);
      return;
    }
    // Fallback: do nothing if no callback
  }

  const addRandomRecipe = (dayKey: string, index: number) => {
    if (onAddRandom) {
      onAddRandom(dayKey, index);
      return;
    }
    // Fallback: do nothing if no callback
  }

  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.some(Boolean))
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.filter(Boolean).length : 0), 0)
  
  // Log results render when plan changes
  useEffect(() => {
    if (hasRecipes) {
      const dayCount = Object.values(weeklyPlan).filter((arr: any) => arr?.length).length;
      perfLog({
        traceId,
        event: 'generate_results',
        stage: 'results_render',
        label: 'generate.results.render',
        duration: 0,
        meta: { totalRecipes: selectedCount, dayCount, dishesPerDay }
      });
    }
  }, [weeklyPlan, hasRecipes, selectedCount, dishesPerDay, traceId]);

  return (
    <div className="bg-white rounded-xl border border-[#DDD0B0] p-6">
      {/* Summary */}
      {hasRecipes && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-semibold text-[#3A2010]">
            已選擇 {selectedCount} 餐
          </span>
        </div>
      )}

      {/* Weekly Plan Grid */}
      <WeeklyPlanGrid
        weeklyPlan={weeklyPlan}
        lockedSlots={lockedSlots}
        daysPerWeek={daysPerWeek}
        dishesPerDay={dishesPerDay}
        onRecipeClick={onRecipeClick}
        onReplace={replaceRecipe}
        onLock={onLock}
        onUnlock={onUnlock}
        onRemove={onRemove}
        onAddRandom={addRandomRecipe}
      />
    </div>
  )
}
