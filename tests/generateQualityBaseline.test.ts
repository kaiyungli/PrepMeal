import { describe, expect, it, vi, afterEach } from 'vitest';
import { planWeekAdvanced } from '@/lib/mealPlanner';
import { matchesSlotRole } from '@/lib/slotRoles';
import { COMPOSITION_CONFIG } from '@/constants/composition';

// Synthetic, intentionally role-balanced dataset. These metrics are NOT
// production catalogue statistics or acceptance thresholds.
const recipes = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `complete-${i}`, name: `Complete ${i}`, meal_role: 'complete_meal',
    is_complete_meal: true, dish_type: 'main', primary_protein: ['chicken','fish','pork','beef'][i % 4],
    cuisine: i % 2 ? 'western' : 'chinese', budget_level: ['budget','normal','premium'][i % 3],
    method: ['steamed','braised','fried'][i % 3],
  })),
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `main-${i}`, name: `Main ${i}`, meal_role: 'protein_main',
    is_complete_meal: false, dish_type: 'main', primary_protein: ['chicken','fish','pork','beef','tofu'][i % 5],
    cuisine: i % 2 ? 'western' : 'chinese', budget_level: ['budget','normal','premium'][i % 3],
    method: ['steamed','braised','fried'][i % 3],
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `veg-${i}`, name: `Veg ${i}`, meal_role: 'veg_side',
    is_complete_meal: false, dish_type: 'side', primary_protein: null,
    cuisine: i % 2 ? 'western' : 'chinese', budget_level: ['budget','normal','premium'][i % 3],
    method: ['steamed','braised','fried'][i % 3],
  })),
];

function measure(plan: ReturnType<typeof planWeekAdvanced>, roles: string[]) {
  const slots = Object.values(plan).flat();
  const populated = slots.filter((r): r is NonNullable<typeof r> => r !== null);
  const ids = populated.map(r => r.id);
  const roleErrors = Object.values(plan).reduce((count, day) =>
    count + day.filter((r, i) => r !== null && !matchesSlotRole(r, roles[i])).length, 0);
  return {
    requested: slots.length,
    filled: populated.length,
    empty: slots.length - populated.length,
    fillRate: slots.length ? populated.length / slots.length : 1,
    duplicateIds: ids.length - new Set(ids).size,
    roleErrors,
    budgetMatches: populated.filter(r => r.budget_level === 'budget').length,
    completedDays: Object.values(plan).filter(day => day.every(Boolean)).length,
  };
}

afterEach(() => vi.restoreAllMocks());

describe('generation quality baseline (synthetic catalogue)', () => {
  it.each([3, 5, 7])('records all composition metrics for %i days', days => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    for (const [composition, setting] of Object.entries(COMPOSITION_CONFIG)) {
      const plan = planWeekAdvanced(recipes, {
        daysPerWeek: days, dishesPerDay: setting.dishesPerDay,
        slotRoles: setting.slotRoles, dailyComposition: composition,
        allowCompleteMeal: false, isWeekend: () => false,
      });
      const metrics = measure(plan, setting.slotRoles);
      console.log('[quality-baseline]', JSON.stringify({ days, composition, ...metrics }));
      expect(Object.keys(plan)).toHaveLength(days);
      expect(metrics.requested).toBe(days * setting.dishesPerDay);
      expect(metrics.roleErrors).toBe(0);
      expect(metrics.duplicateIds).toBe(0);
    }
  });

  it.each(['budget', 'normal', 'premium'])('records tier and constraint impact: %s', budget => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const roles = COMPOSITION_CONFIG.meat_veg.slotRoles;
    const variants = [
      { label: 'unrestricted', cuisines: [] as string[], exclusions: [] as string[] },
      { label: 'chinese', cuisines: ['chinese'], exclusions: [] as string[] },
      { label: 'no_chicken', cuisines: [] as string[], exclusions: ['chicken'] },
      { label: 'chinese_no_chicken', cuisines: ['chinese'], exclusions: ['chicken'] },
    ];
    for (const v of variants) {
      const plan = planWeekAdvanced(recipes, {
        daysPerWeek: 7, dishesPerDay: 2, slotRoles: roles,
        dailyComposition: 'meat_veg', allowCompleteMeal: false,
        isWeekend: () => false, budget, cuisines: v.cuisines, exclusions: v.exclusions,
      });
      const metrics = measure(plan, roles);
      console.log('[quality-baseline]', JSON.stringify({ days: 7, composition: 'meat_veg', budget, variant: v.label, ...metrics }));
      expect(metrics.roleErrors).toBe(0);
      expect(metrics.duplicateIds).toBe(0);
      for (const r of Object.values(plan).flat().filter(Boolean)) {
        if (v.cuisines.length) expect(v.cuisines).toContain(r!.cuisine);
        if (v.exclusions.length) expect(v.exclusions).not.toContain(r!.primary_protein);
      }
    }
  });

  it.each([3, 5, 7])('fills every slot when the role-balanced catalogue has enough recipes for %i days', days => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    for (const [composition, setting] of Object.entries(COMPOSITION_CONFIG)) {
      const plan = planWeekAdvanced(recipes, {
        daysPerWeek: days,
        dishesPerDay: setting.dishesPerDay,
        slotRoles: setting.slotRoles,
        dailyComposition: composition,
        allowCompleteMeal: false,
        isWeekend: () => false,
      });
      const metrics = measure(plan, setting.slotRoles);
      expect(metrics.empty, `${composition} for ${days} days`).toBe(0);
      expect(metrics.completedDays).toBe(days);
      expect(metrics.roleErrors).toBe(0);
    }
  });

  it('captures insufficient-role supply without disguising empty slots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const scarce = recipes.filter(r => r.meal_role === 'complete_meal').slice(0, 2);
    const roles = COMPOSITION_CONFIG.complete_meal.slotRoles;
    const plan = planWeekAdvanced(scarce, {
      daysPerWeek: 7, dishesPerDay: 1, slotRoles: roles,
      dailyComposition: 'complete_meal', isWeekend: () => false,
    });
    const metrics = measure(plan, roles);
    expect(metrics.filled).toBe(2);
    expect(metrics.empty).toBe(5);
    expect(metrics.roleErrors).toBe(0);
  });
});
