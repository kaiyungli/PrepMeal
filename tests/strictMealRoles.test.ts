import { describe, expect, it, vi, afterEach } from 'vitest';
import { matchesSlotRole } from '@/lib/slotRoles';
import { planWeekAdvanced } from '@/lib/mealPlanner';

afterEach(() => vi.restoreAllMocks());

describe('explicit meal_role is authoritative for composition slots', () => {
  it('does not promote a protein side to a main because it has protein', () => {
    const side = { id: 'wings', name: '雞翼', meal_role: 'protein_side', dish_type: 'side', primary_protein: 'chicken' };
    expect(matchesSlotRole(side, 'protein_main')).toBe(false);
    expect(matchesSlotRole(side, 'veg_side')).toBe(false);
    expect(matchesSlotRole(side, 'side')).toBe(true);
  });

  it('does not promote complete meals or soups into protein main', () => {
    expect(matchesSlotRole({ meal_role: 'complete_meal', dish_type: 'main', primary_protein: 'pork' }, 'protein_main')).toBe(false);
    expect(matchesSlotRole({ meal_role: 'soup', dish_type: 'main', primary_protein: 'fish' }, 'protein_main')).toBe(false);
    expect(matchesSlotRole({ meal_role: 'protein_main', dish_type: 'main', primary_protein: 'vegetarian' }, 'protein_main')).toBe(true);
  });

  it('retains limited backward compatibility for recipes missing meal_role', () => {
    expect(matchesSlotRole({ dish_type: 'main', primary_protein: 'chicken' }, 'protein_main')).toBe(true);
    expect(matchesSlotRole({ dish_type: 'side', primary_protein: null }, 'veg_side')).toBe(true);
    expect(matchesSlotRole({ dish_type: 'side', primary_protein: 'egg' }, 'protein_main')).toBe(false);
  });

  it('leaves a missing main empty rather than placing protein_side in it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const plan = planWeekAdvanced([
      { id: 'wings', name: '雞翼', meal_role: 'protein_side', dish_type: 'side', primary_protein: 'chicken' },
      { id: 'veg', name: '青菜', meal_role: 'veg_side', dish_type: 'side', primary_protein: 'vegetarian' },
    ], { daysPerWeek: 1, dishesPerDay: 2, slotRoles: ['protein_main', 'veg_side'],
      dailyComposition: 'meat_veg', allowCompleteMeal: false, isWeekend: () => false });
    expect(plan.mon[0]).toBeNull();
    expect(plan.mon[1]?.id).toBe('veg');
  });
});
