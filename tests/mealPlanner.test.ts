import { describe, it, expect } from 'vitest'
import { planWeek } from '../src/lib/mealPlanner'

describe('mealPlanner', () => {
  it('does not repeat same recipe twice', () => {
    const recipes = [
      {id:1},{id:2},{id:3},{id:4},{id:5},{id:6},{id:7}
    ]
    const plan = planWeek(recipes)
    const ids = plan.map(r=>r.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })
})