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
  setWeeklyPlan: React.Dispatch<React.SetStateAction<Record<string, Recipe[]>>>
  lockedSlots: Record<string, boolean>
  setLockedSlots: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  daysPerWeek: number
  dishesPerDay: number
  filteredRecipes: Recipe[]
  onRecipeClick: (recipe: Recipe) => void
}

export default function GenerateResults({
  weeklyPlan,
  setWeeklyPlan,
  lockedSlots,
  setLockedSlots,
  daysPerWeek,
  dishesPerDay,
  filteredRecipes,
  onRecipeClick,
}: GenerateResultsProps) {
  const lockSlot = (dayKey: string, index: number) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: true }))
  }

  const unlockSlot = (dayKey: string, index: number) => {
    setLockedSlots(prev => ({ ...prev, [`${dayKey}-${index}`]: false }))
  }

  const removeRecipe = (dayKey: string, index: number) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== index)
    }))
  }

  const replaceRecipe = (dayKey: string, index: number) => {
    const current = weeklyPlan[dayKey]?.[index]
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id))
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      setWeeklyPlan(prev => ({
        ...prev,
        [dayKey]: (prev[dayKey] || []).map((r, i) => i === index ? random : r)
      }))
    }
  }

  const addRandomRecipe = (dayKey: string) => {
    const available = filteredRecipes.filter(r => !weeklyPlan[dayKey]?.some(pr => pr?.id === r.id))
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)]
      setWeeklyPlan(prev => ({
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
        onLock={lockSlot}
        onUnlock={unlockSlot}
        onRemove={removeRecipe}
        onAddRandom={addRandomRecipe}
      />
    </div>
  )
}
