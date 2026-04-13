'use client'

import { useState } from 'react'
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
  weeklyPlan: Record<string, Recipe[]>
  lockedSlots: Record<string, boolean>
  daysPerWeek: number
  dishesPerDay: number
  filteredRecipes: Recipe[]
  onLock: (dayKey: string, index: number) => void
  onUnlock: (dayKey: string, index: number) => void
  onRemove: (dayKey: string, index: number) => void
  onReplace: (dayKey: string, index: number) => void
  onAddRandom: (dayKey: string) => void
  onRecipeClick: (recipe: Recipe) => void
}

export default function GenerateResults({
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

  const addRandomRecipe = (dayKey: string) => {
    if (onAddRandom) {
      onAddRandom(dayKey);
      return;
    }
    // Fallback: do nothing if no callback
  }

  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0)
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  
  // Check if plan is empty
  const isPlanEmpty = !weeklyPlan || Object.keys(weeklyPlan).length === 0 || 
    Object.values(weeklyPlan).every(arr => !arr || arr.length === 0)

  // Empty state before generation
  if (isPlanEmpty) {
    return (
      <div className="p-6 text-center py-16 text-[#999]">
        <p className="mb-3">尚未生成餐單</p>
        <p className="text-sm">請先設定條件並點擊「一鍵生成」</p>
      </div>
    );
  }

  return (
    <div className="p-6">
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
