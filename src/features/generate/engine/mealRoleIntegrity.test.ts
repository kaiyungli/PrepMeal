import { describe, expect, it } from 'vitest'
import { planWeekAdvanced } from '@/lib/mealPlanner'
import { replaceRecipeInPlan } from './recipeReplacer'

const main = { id: 'main', name: '普通主菜', dish_type: 'main', primary_protein: 'fish' }
const complete = { id: 'complete', name: '完整餐', dish_type: 'main', meal_role: 'complete_meal', is_complete_meal: true }
const config = {
  daysPerWeek: 1, dishesPerDay: 1, slotRoles: ['complete_meal'],
  dailyComposition: 'complete_meal', isWeekend: () => false,
}
describe('complete meal slot integrity', () => {
  it('does not select ordinary mains when complete meals are unavailable', () => {
    expect(planWeekAdvanced([main], config).mon).toEqual([null])
  })
  it('selects an eligible complete meal', () => {
    expect(planWeekAdvanced([main, complete], config).mon[0]?.id).toBe('complete')
  })
  it('rejects an invalid locked ordinary main', () => {
    const result = planWeekAdvanced([main], {
      ...config, lockedSlots: { 'mon-0': true }, lockedRecipes: { 'mon-0': main },
    })
    expect(result.mon).toEqual([null])
  })
  it('does not replace a complete meal with an ordinary main', () => {
    const result = replaceRecipeInPlan({ mon: [complete] }, 'mon', 0, [main], {
      dailyComposition: 'complete_meal',
    })
    expect(result).toBeNull()
  })
})
