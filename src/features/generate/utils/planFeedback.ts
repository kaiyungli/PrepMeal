/**
 * User-facing feedback for slots the planner could not fill.
 *
 * Composition slots never fall back to another role (see allowsCrossRoleFallback),
 * so an empty slot or a declined replace/add needs an explanation and a way out.
 * One message per action - never one per empty slot.
 */

type PlanSlot = { id?: string | number } | null | undefined;
type WeeklyPlan = Record<string, PlanSlot[]>;

// Same wording as the meal-role labels on the plan grid.
const SLOT_ROLE_LABELS: Record<string, string> = {
  complete_meal: '完整餐',
  protein_main: '主菜',
  veg_side: '配菜',
};

const ADJUST_HINT = '可放寬篩選條件或改選其他餐式。';

// Feedback with a suggestion needs longer on screen than a plain confirmation.
export const FEEDBACK_DURATION_MS = 6000;

export function getSlotRoleLabel(slotRole: string): string {
  return SLOT_ROLE_LABELS[slotRole] || '食譜';
}

export interface GeneratedPlanSummary {
  emptySlotCount: number;
  // Slot roles with at least one empty slot, in slot order.
  emptySlotRoles: string[];
  // Locked slots whose recipe no longer fits (e.g. after a composition change)
  // and was planned anew. Days outside the generated plan are not counted.
  droppedLockKeys: string[];
}

export function summarizeGeneratedPlan(
  plan: WeeklyPlan,
  slotRoles: string[],
  lockedSlots: Record<string, boolean>,
  lockedRecipes: Record<string, PlanSlot>
): GeneratedPlanSummary {
  let emptySlotCount = 0;
  const emptyRoles = new Set<number>();
  for (const day of Object.values(plan)) {
    slotRoles.forEach((_, index) => {
      if (!day?.[index]) {
        emptySlotCount += 1;
        emptyRoles.add(index);
      }
    });
  }

  const droppedLockKeys = Object.entries(lockedRecipes)
    .filter(([key, recipe]) => {
      if (!lockedSlots[key] || !recipe?.id) return false;
      const dash = key.lastIndexOf('-');
      const day = plan[key.slice(0, dash)];
      if (!day) return false;
      return day[Number(key.slice(dash + 1))]?.id !== recipe.id;
    })
    .map(([key]) => key);

  return {
    emptySlotCount,
    emptySlotRoles: [...new Set([...emptyRoles].sort((a, b) => a - b).map(i => slotRoles[i]))],
    droppedLockKeys,
  };
}

/** One combined message for a Generate run, or null when nothing needs explaining. */
export function buildGenerateFeedback(summary: GeneratedPlanSummary): string | null {
  const parts: string[] = [];
  if (summary.droppedLockKeys.length > 0) {
    parts.push(`${summary.droppedLockKeys.length} 道已鎖定的菜式不符合目前餐式，已解除鎖定並重新安排。`);
  }
  if (summary.emptySlotCount > 0) {
    const roles = summary.emptySlotRoles.map(getSlotRoleLabel).join('、');
    parts.push(`有 ${summary.emptySlotCount} 個餐位找不到符合條件的${roles}，已留空。`);
  }
  if (parts.length === 0) return null;
  return summary.emptySlotCount > 0 ? `${parts.join('')}${ADJUST_HINT}` : parts.join('');
}

/** Message when Replace or Add finds no eligible recipe for the slot. */
export function buildNoCandidateFeedback(slotRole: string): string {
  return `找不到其他符合條件的${getSlotRoleLabel(slotRole)}。${ADJUST_HINT}`;
}
