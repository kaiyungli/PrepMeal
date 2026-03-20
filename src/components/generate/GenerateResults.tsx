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

interface GenerateResultsProps {
  weeklyPlan: Record<string, Recipe[]>
  lockedSlots: Record<string, boolean>
  daysPerWeek: number
  dishesPerDay: number
  filteredRecipes: Recipe[]
  onLock: (dayKey: string, index: number) => void
  onUnlock: (dayKey: string, index: number) => void
  onRemove: (dayKey: string, index: number) => void
  onRecipeClick: (recipe: Recipe) => void
  setWeeklyPlan?: React.Dispatch<React.SetStateAction<Record<string, Recipe[]>>>
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
  onRecipeClick,
  setWeeklyPlan,
}: GenerateResultsProps) {
  // Placeholder if not provided (for simple actions)
  const safeSetWeeklyPlan = setWeeklyPlan || (() => {})

  const replaceRecipe = (dayKey: string, index: number) => {
    const current = weeklyPlan[dayKey]?.[index]
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id))
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      safeSetWeeklyPlan((prev: Record<string, Recipe[]>) => ({
        ...prev,
        [dayKey]: (prev[dayKey] || []).map((r, i) => i === index ? random : r)
      }))
    }
  }

  const addRandomRecipe = (dayKey: string) => {
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id))
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      safeSetWeeklyPlan((prev: Record<string, Recipe[]>) => ({
        ...prev,
        [dayKey]: [...(prev[dayKey] || []), random]
      }))
    }
  }

  const hasRecipes = Object.values(weeklyPlan).some(arr => Array.isArray(arr) && arr.length > 0)
  const selectedCount = Object.values(weeklyPlan).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)

  return (
    <div className="max-w-[1200px] mx-auto p-6">
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
