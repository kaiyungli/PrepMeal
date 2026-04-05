/**
 * Transform items for menu_plan_items insert
 * Groups items by (date, meal_slot) and assigns item_order per group
 */

export interface MenuItemInput {
  day_index: number;
  meal_type?: string;
  recipe_id: string;
  servings?: number;
}

export interface MenuItemInsert {
  menu_plan_id: string;
  date: string;
  meal_slot: string;
  recipe_id: string;
  servings: number;
  item_order: number;
  source: string;
}

/**
 * Transform user input items to database insert format
 * Groups by (date, meal_slot) and assigns item_order starting at 1 per group
 * 
 * @param items - Raw items from frontend (day_index, meal_type, recipe_id, servings)
 * @param menu_plan_id - The parent plan ID
 * @param week_start_date - Start date of the week (YYYY-MM-DD)
 * @returns Array of items ready for database insert
 */
export function transformItemsToInsert(
  items: MenuItemInput[],
  menu_plan_id: string,
  week_start_date: string
): MenuItemInsert[] {
  // Group by (date, meal_slot)
  const itemsByGroup: Record<string, MenuItemInput[]> = {};
  
  items.forEach((item) => {
    const itemDate = new Date(week_start_date);
    itemDate.setDate(itemDate.getDate() + (item.day_index || 0));
    const dateStr = itemDate.toISOString().split('T')[0];
    const mealSlot = item.meal_type || 'dinner';
    const key = `${dateStr}_${mealSlot}`;
    
    if (!itemsByGroup[key]) {
      itemsByGroup[key] = [];
    }
    itemsByGroup[key].push(item);
  });
  
  // Transform to insert format with item_order per group
  const itemsToInsert: MenuItemInsert[] = [];
  
  Object.values(itemsByGroup).forEach((groupItems) => {
    groupItems.forEach((item, idx) => {
      const itemDate = new Date(week_start_date);
      itemDate.setDate(itemDate.getDate() + (item.day_index || 0));
      
      itemsToInsert.push({
        menu_plan_id,
        date: itemDate.toISOString().split('T')[0],
        meal_slot: item.meal_type || 'dinner',
        recipe_id: item.recipe_id,
        servings: item.servings || 1,
        item_order: idx + 1, // Restarts at 1 for each date+meal_slot group
        source: 'generated',
      });
    });
  });
  
  return itemsToInsert;
}

/**
 * Get group keys for testing verification
 */
export function getItemGroups(
  items: MenuItemInput[],
  week_start_date: string
): string[] {
  const groups: string[] = [];
  const seen = new Set<string>();
  
  items.forEach((item) => {
    const itemDate = new Date(week_start_date);
    itemDate.setDate(itemDate.getDate() + (item.day_index || 0));
    const dateStr = itemDate.toISOString().split('T')[0];
    const mealSlot = item.meal_type || 'dinner';
    const key = `${dateStr}_${mealSlot}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      groups.push(key);
    }
  });
  
  return groups;
}
