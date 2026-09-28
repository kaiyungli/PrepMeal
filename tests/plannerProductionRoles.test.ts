import { afterEach, describe, expect, it, vi } from 'vitest';
import { matchesSlotRole, planWeekAdvanced } from '@/lib/mealPlanner';

const makeRecipe = (id: string, meal_role: string, dish_type: string, primary_protein: string) => ({
  id, name: id, meal_role, dish_type, primary_protein, cuisine: 'chinese',
  method: 'stir_fry', difficulty: 'easy', speed: 'quick', is_complete_meal: false,
});

const veg = makeRecipe('涼拌青瓜', 'veg_side', 'side', 'vegetarian');
const soup = makeRecipe('紫菜蛋花湯', 'soup', 'soup', 'egg');
const proteinSide = makeRecipe('照燒雞粒', 'protein_side', 'side', 'chicken');

afterEach(() => vi.restoreAllMocks());

describe('production-shaped mixed meal roles', () => {
  it('never treats vegetarian-tagged sides or protein-tagged soup as a protein main', () => {
    expect(matchesSlotRole(veg, 'veg_side')).toBe(true);
    expect(matchesSlotRole(veg, 'protein_main')).toBe(false);
    expect(matchesSlotRole(soup, 'protein_main')).toBe(false);
    expect(matchesSlotRole(makeRecipe('無角色蔬菜', '', 'side', 'vegetarian'), 'protein_main')).toBe(false);
    expect(matchesSlotRole(makeRecipe('無角色雞湯', '', 'soup', 'chicken'), 'protein_main')).toBe(false);
    expect(matchesSlotRole(proteinSide, 'protein_main')).toBe(true);
  });

  it('fills three one-protein-one-veg days with the intended roles', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const recipes = [
      makeRecipe('豬肉主菜', 'protein_main', 'main', 'pork'),
      makeRecipe('牛肉主菜', 'protein_main', 'main', 'beef'),
      makeRecipe('魚主菜', 'protein_main', 'main', 'fish'),
      proteinSide,
      veg,
      makeRecipe('蒜蓉油麥菜', 'veg_side', 'side', 'vegetarian'),
      makeRecipe('炒菜心', 'veg_side', 'side', 'vegetarian'),
      soup,
      makeRecipe('菠菜豆腐湯', 'soup', 'soup', 'tofu'),
    ];
    const plan = planWeekAdvanced(recipes, {
      daysPerWeek: 3,
      dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      dailyComposition: 'meat_veg',
      allowCompleteMeal: false,
      isWeekend: () => false,
    });

    for (const day of ['mon', 'tue', 'wed']) {
      expect(plan[day]).toHaveLength(2);
      expect(matchesSlotRole(plan[day][0], 'protein_main'), day).toBe(true);
      expect(matchesSlotRole(plan[day][1], 'veg_side'), day).toBe(true);
      expect(plan[day][0].meal_role).not.toBe('veg_side');
      expect(plan[day][0].meal_role).not.toBe('soup');
    }
  });

  it('does not let a cheap veg side or soup displace the protein slot', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const recipes = [
      { ...makeRecipe('豬肉主菜', 'protein_main', 'main', 'pork'), budget_level: 'normal' },
      { ...veg, budget_level: 'budget' },
      { ...soup, budget_level: 'budget' },
      { ...makeRecipe('蒜蓉油麥菜', 'veg_side', 'side', 'vegetarian'), budget_level: 'budget' },
    ];
    const plan = planWeekAdvanced(recipes, {
      daysPerWeek: 1, dishesPerDay: 2,
      slotRoles: ['protein_main', 'veg_side'],
      dailyComposition: 'meat_veg', budget: 'budget',
      allowCompleteMeal: false, isWeekend: () => false,
    });

    expect(plan.mon.map(recipe => recipe.meal_role)).toEqual(['protein_main', 'veg_side']);
  });
});
