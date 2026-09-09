/**
 * Save Generated Plan Service
 * 
 * Saves the generated weekly plan to the user's account.
 */
import { perfNow, perfMeasure } from '@/utils/perf';

export interface PlanItem {
  day_index: number;
  meal_type: string;
  recipe_id: string;
  servings: number;
}

export interface SavePlanPayload {
  name: string;
  week_start_date: string;
  days_count: number;
  items: PlanItem[];
}

/**
 * Save generated plan to user account
 * @param payload - Plan data to save
 * @param token - Auth token
 * @returns Success/error
 */
export async function saveGeneratedPlan(payload: SavePlanPayload, token: string): Promise<{ success: boolean; error?: string }> {
  const t0 = perfNow();
  
  try {
    const res = await fetch('/api/user/menus', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    perfMeasure('generate.savePlan', t0);
    
    const data = await res.json();
    
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Failed to save plan');
    }

    if (!data.data?.plan_id) throw new Error('Invalid save response');
    
    return { success: true };
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Save failed' 
    };
  }
}

/**
 * Build save payload from weekly plan
 * @param weeklyPlan - Current weekly plan { dayKey: [recipes] }
 * @param servings - Servings per meal
 * @param daysPerWeek - Number of days
 * @returns SavePlanPayload
 */
export function buildSavePayload(
  weeklyPlan: Record<string, Array<{ id?: string | number } | null | undefined>>,
  servings: number,
  daysPerWeek: number
): SavePlanPayload {
  const DAY_INDEX_MAP = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
  
  const items: PlanItem[] = [];
  const dayKeys = Object.keys(weeklyPlan);
  for (const dayKey of dayKeys) {
    const dayIndex = DAY_INDEX_MAP[dayKey as keyof typeof DAY_INDEX_MAP];
    if (dayIndex === undefined) continue;
    
    const dayRecipes = weeklyPlan[dayKey] || [];
    for (const recipe of dayRecipes) {
      if (recipe && recipe.id) {
        items.push({
          day_index: dayIndex,
          meal_type: 'dinner',
          recipe_id: String(recipe.id),
          servings: servings,
        });
      }
    }
  }
  
  const now = new Date();
  const formatted = now.toLocaleString('zh-HK', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const name = `${servings}人 ${daysPerWeek}日餐單 ${formatted}`;
  
  return {
    name,
    week_start_date: new Date().toISOString().split('T')[0],
    days_count: daysPerWeek,
    items,
  };
}
