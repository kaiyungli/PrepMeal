/**
 * Weekly Plan Service - Reusable weekly plan data transformation
 */

export interface PlanItem {
  recipeId: string | number | null;
  recipeName: string;
  recipeImage: string | null;
  servings: number;
  mealSlot: string;
  done: boolean;
}

export interface PlanDay {
  dayIndex: number;
  dayName: string;
  date: string | null;
  items: PlanItem[];
}

export interface Recipe {
  id: string | number;
  name: string;
  image_url?: string;
  ingredients?: any;
}

const DAY_NAMES = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];

export function groupPlanByDay(planDays: PlanDay[]): PlanDay[] {
  if (!planDays || planDays.length === 0) return [];
  
  const sorted = [...planDays].sort((a, b) => (a.dayIndex || 0) - (b.dayIndex || 0));
  
  return sorted.map(day => ({
    dayIndex: day.dayIndex ?? 0,
    dayName: day.dayName || DAY_NAMES[day.dayIndex] || `Day ${day.dayIndex + 1}`,
    date: day.date || null,
    items: (day.items || []).map(item => ({
      recipeId: item.recipeId,
      recipeName: item.recipeName,
      recipeImage: item.recipeImage,
      servings: item.servings,
      mealSlot: item.mealSlot,
      done: item.done
    }))
  }));
}

export function generateWeeklyPlan(recipes: Recipe[], daysCount = 5, itemsPerDay = 2): PlanDay[] {
  if (!recipes || recipes.length === 0) return [];
  
  const shuffled = [...recipes].sort(() => 0.5 - Math.random());
  const selectedRecipes = shuffled.slice(0, daysCount * itemsPerDay);
  
  const mealSlots = ['lunch', 'dinner'];
  const result: PlanDay[] = [];
  
  for (let i = 0; i < daysCount; i++) {
    const dayItems: PlanItem[] = [];
    for (let j = 0; j < itemsPerDay; j++) {
      const idx = i * itemsPerDay + j;
      if (idx < selectedRecipes.length) {
        const r = selectedRecipes[idx];
        dayItems.push({
          recipeId: r.id,
          recipeName: r.name,
          recipeImage: r.image_url || null,
          servings: 2,
          mealSlot: mealSlots[j % mealSlots.length],
          done: false
        });
      }
    }
    result.push({ dayIndex: i, dayName: DAY_NAMES[i] || `Day ${i+1}`, date: null, items: dayItems });
  }
  return result;
}

export function buildShoppingListFromPlan(planDays: PlanDay[]): Array<{name: string, qty: string | number}> {
  return [];
}

export function getMealLabel(slot: string): string {
  return { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }[slot] || '晚餐';
}
