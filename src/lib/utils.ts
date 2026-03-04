import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility functions

// Format cooking time
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分鐘`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}小時`;
  }
  return `${hours}小時${mins}分鐘`;
}

// Format calories
export function formatCalories(cal: number): string {
  return `${cal} kcal`;
}

// Format servings
export function formatServings(num: number): string {
  return `${num}人`;
}

// Generate random menu for week
export function generateWeeklyMenu(recipes: any[], servings: number = 2) {
  const days = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  
  const shuffled = [...recipes].sort(() => 0.5 - Math.random());
  const menu = [];
  
  for (let i = 0; i < 7; i++) {
    menu.push({
      day: days[i],
      recipe: shuffled[i % shuffled.length]
    });
  }
  
  const shoppingList: Record<string, { name: string; count: number }> = {};
  menu.forEach(item => {
    if (!shoppingList[item.recipe.name]) {
      shoppingList[item.recipe.name] = { 
        name: item.recipe.name, 
        count: servings 
      };
    }
  });
  
  return {
    menu,
    shoppingList: Object.values(shoppingList)
  };
}

export function calculateDailyCalories(menuItem: any): number {
  return menuItem?.recipe?.calories || 0;
}

export function calculateWeeklyCalories(menu: any[]): number {
  return menu.reduce((sum, item) => sum + (item.recipe?.calories || 0), 0);
}

export function parseTags(tagString: string): string[] {
  return tagString
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

export function formatTags(tags: string[] | null): string {
  if (!tags || !Array.isArray(tags)) return '';
  return tags.join(', ');
}

export function validateRecipe(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push('名稱不能為空');
  }
  if (!data.cooking_time || data.cooking_time < 1) {
    errors.push('烹飪時間必須大於0');
  }
  if (!data.calories || data.calories < 0) {
    errors.push('卡路里不能為負數');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
