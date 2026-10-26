import { COMPOSITION_CONFIG } from '@/constants/composition';
import { normalizeIngredients } from '@/lib/ingredientNormalizer';
import { fitsCompleteMealSetting, fitsDailyCompleteMealLimit, matchesConfiguredSlotRole, matchesSlotRole, type SlotRoleRecipe } from '@/lib/slotRoles';
import { getSlotRoleLabel } from './planFeedback';

type Recipe = SlotRoleRecipe & { id: string; cuisine?: string; protein?: string[] };
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** A necessary-supply warning, not a promise that the planner can fill every slot. */
export function getPlanAvailabilityWarnings({
  recipes, composition, daysPerWeek, cuisines = [], exclusions = [], allowCompleteMeal,
  weeklyPlan = {}, lockedSlots = {},
}: {
  recipes: Recipe[]; composition: string; daysPerWeek: number;
  cuisines?: string[]; exclusions?: string[]; allowCompleteMeal?: boolean;
  weeklyPlan?: Record<string, (Recipe | null)[]>; lockedSlots?: Record<string, boolean>;
}): string[] {
  const config = COMPOSITION_CONFIG[composition as keyof typeof COMPOSITION_CONFIG];
  if (!config) return [];
  const days = DAYS.slice(0, daysPerWeek);
  const excluded = new Set(normalizeIngredients(exclusions));
  const eligible = [...new Map(recipes.filter(recipe =>
    (!cuisines.length || !recipe.cuisine || cuisines.includes(recipe.cuisine)) &&
    !normalizeIngredients([recipe.primary_protein, ...(recipe.protein || [])].filter((p): p is string => Boolean(p)))
      .some(protein => excluded.has(protein)) &&
    fitsCompleteMealSetting(recipe, composition, allowCompleteMeal)
  ).map(recipe => [recipe.id, recipe])).values()];
  const eligibleIds = new Set(eligible.map(recipe => recipe.id));
  const reserved = new Set<string>();
  const needed: Record<string, number> = {};
  const pendingByDay: { role: string; otherLocks: Recipe[] }[][] = [];
  let keptLockCount = 0;
  const validLock = (day: string, index: number) => {
    const recipe = weeklyPlan[day]?.[index];
    return lockedSlots[`${day}-${index}`] && recipe && eligibleIds.has(recipe.id) &&
      matchesConfiguredSlotRole(recipe, config.slotRoles[index], composition, allowCompleteMeal)
      ? recipe : null;
  };
  for (const day of days) {
    const kept: Recipe[] = [];
    const pending: string[] = [];
    config.slotRoles.forEach((role, index) => {
      const lock = validLock(day, index);
      if (lock && fitsDailyCompleteMealLimit(lock, kept)) {
        kept.push(lock); reserved.add(lock.id); keptLockCount++;
      } else {
        needed[role] = (needed[role] || 0) + 1;
        pending.push(role);
      }
    });
    pendingByDay.push(pending.map(role => ({ role, otherLocks: kept })));
  }
  // Match the planner's reservation of valid locks outside the selected days.
  for (const day of DAYS.filter(day => !days.includes(day))) {
    config.slotRoles.forEach((_, index) => {
      const lock = validLock(day, index);
      if (lock) reserved.add(lock.id);
    });
  }
  return Object.entries(needed).flatMap(([role, demand]) => {
    const candidates = eligible.filter(recipe => !reserved.has(recipe.id) &&
      matchesConfiguredSlotRole(recipe, role, composition, allowCompleteMeal));
    const ordinary = candidates.filter(recipe => !matchesSlotRole(recipe, 'complete_meal')).length;
    // Two-main days can use at most one complete meal, including retained locks.
    const completeCapacity = pendingByDay.filter(slots => slots.some(slot => slot.role === role) &&
      !slots[0].otherLocks.some(recipe => matchesSlotRole(recipe, 'complete_meal'))).length;
    const supply = ordinary + Math.min(candidates.length - ordinary, completeCapacity);
    if (supply >= demand) return [];
    const label = getSlotRoleLabel(role);
    const prefix = keptLockCount || reserved.size ? '除已鎖定菜式外，' : '';
    return [`${prefix}目前有 ${supply} 道可用${label}，尚需安排 ${demand} 個${label}位，未足夠生成全週不重複餐單。可調整篩選條件或減少天數。`];
  });
}
