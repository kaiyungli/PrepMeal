/**
 * Normalize Plan for Save
 * 
 * Transforms weekly plan into API payload for saving.
 */
import { SavePlanPayload } from '../services/saveGeneratedPlan';

const DAY_INDEX_MAP = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

/**
 * Transform weekly plan to save payload
 * @param weeklyPlan - Current weekly plan { dayKey: [recipes] }
 * @param servings - Servings per meal
 * @param daysPerWeek - Number of days
 * @returns SavePlanPayload
 */
export function normalizePlanForSave(
  weeklyPlan: Record<string, any[]>,
  servings: number,
  daysPerWeek: number
): SavePlanPayload {
  const items: Array<{
    day_index: number;
    meal_type: string;
    recipe_id: string | number;
    servings: number;
  }> = [];

  const dayKeys = Object.keys(weeklyPlan);
  for (const dayKey of dayKeys) {
    const dayIndex = (DAY_INDEX_MAP as any)[dayKey];
    if (dayIndex === undefined) continue;

    const dayRecipes = weeklyPlan[dayKey] || [];
    for (const recipe of dayRecipes) {
      if (recipe && recipe.id) {
        items.push({
          day_index: dayIndex,
          meal_type: 'dinner',
          recipe_id: recipe.id,
          servings: servings,
        });
      }
    }
  }

  const name = `${servings}人 ${daysPerWeek}日餐單 ${new Date().toLocaleDateString('zh-HK')}`;

  return {
    name,
    week_start_date: new Date().toISOString().split('T')[0],
    days_count: daysPerWeek,
    items,
  };
}
