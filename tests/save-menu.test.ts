import { describe, it, expect } from 'vitest';
import { transformItemsToInsert, getItemGroups } from '@/lib/menuItemTransform';

describe('Save Menu - Multi-dish per slot transformation', () => {
  const menu_plan_id = 'test-plan-id';
  const week_start_date = '2024-01-01';

  it('should assign item_order 1,2 for same day/slot', () => {
    const items = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r1', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r2', servings: 1 },
    ];
    
    const result = transformItemsToInsert(items, menu_plan_id, week_start_date);
    
    // Both should have same date and meal_slot
    expect(result[0].date).toBe('2024-01-01');
    expect(result[1].date).toBe('2024-01-01');
    expect(result[0].meal_slot).toBe('dinner');
    expect(result[1].meal_slot).toBe('dinner');
    
    // item_order should be 1 and 2
    expect(result[0].item_order).toBe(1);
    expect(result[1].item_order).toBe(2);
  });

  it('should restart item_order at 1 for new day/slot', () => {
    const items = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r1', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r2', servings: 1 },
      { day_index: 1, meal_type: 'dinner', recipe_id: 'r3', servings: 1 },
      { day_index: 1, meal_type: 'dinner', recipe_id: 'r4', servings: 1 },
    ];
    
    const result = transformItemsToInsert(items, menu_plan_id, week_start_date);
    
    // Day 0: item_order 1, 2
    expect(result[0].date).toBe('2024-01-01');
    expect(result[0].item_order).toBe(1);
    expect(result[1].date).toBe('2024-01-01');
    expect(result[1].item_order).toBe(2);
    
    // Day 1: item_order restarts at 1, 2
    expect(result[2].date).toBe('2024-01-02');
    expect(result[2].item_order).toBe(1);
    expect(result[3].date).toBe('2024-01-02');
    expect(result[3].item_order).toBe(2);
  });

  it('should handle 3 dishes in same day/slot', () => {
    const items = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r1', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r2', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r3', servings: 1 },
    ];
    
    const result = transformItemsToInsert(items, menu_plan_id, week_start_date);
    
    expect(result.length).toBe(3);
    expect(result[0].item_order).toBe(1);
    expect(result[1].item_order).toBe(2);
    expect(result[2].item_order).toBe(3);
  });

  it('should handle different meal_types separately', () => {
    const items = [
      { day_index: 0, meal_type: 'lunch', recipe_id: 'r1', servings: 1 },
      { day_index: 0, meal_type: 'lunch', recipe_id: 'r2', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r3', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r4', servings: 1 },
    ];
    
    const result = transformItemsToInsert(items, menu_plan_id, week_start_date);
    
    // Lunch: 2 items (order 1,2)
    const lunchItems = result.filter(r => r.meal_slot === 'lunch');
    expect(lunchItems.length).toBe(2);
    expect(lunchItems[0].item_order).toBe(1);
    expect(lunchItems[1].item_order).toBe(2);
    
    // Dinner: 2 items (order 1,2)
    const dinnerItems = result.filter(r => r.meal_slot === 'dinner');
    expect(dinnerItems.length).toBe(2);
    expect(dinnerItems[0].item_order).toBe(1);
    expect(dinnerItems[1].item_order).toBe(2);
  });

  it('should default meal_type to dinner', () => {
    const items = [
      { day_index: 0, recipe_id: 'r1', servings: 1 },
    ];
    
    const result = transformItemsToInsert(items, menu_plan_id, week_start_date);
    
    expect(result[0].meal_slot).toBe('dinner');
  });

  it('should use getItemGroups for verification', () => {
    const items = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r1' },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r2' },
      { day_index: 1, meal_type: 'dinner', recipe_id: 'r3' },
    ];
    
    const groups = getItemGroups(items, week_start_date);
    
    expect(groups).toEqual(['2024-01-01_dinner', '2024-01-02_dinner']);
  });
});

describe('Save Menu - Upsert behavior', () => {
  const menu_plan_id = 'test-plan-id';
  const week_start_date = '2024-01-01';

  it('should handle same week save without duplicate', () => {
    // Simulate: first save creates items with order 1,2
    const items1 = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r1', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r2', servings: 1 },
    ];
    const result1 = transformItemsToInsert(items1, menu_plan_id, week_start_date);
    expect(result1.length).toBe(2);
    expect(result1[0].item_order).toBe(1);
    expect(result1[1].item_order).toBe(2);

    // Simulate: second save (same week) - items should be new (upsert replaces)
    const items2 = [
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r3', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r4', servings: 1 },
      { day_index: 0, meal_type: 'dinner', recipe_id: 'r5', servings: 1 },
    ];
    const result2 = transformItemsToInsert(items2, menu_plan_id, week_start_date);
    expect(result2.length).toBe(3);
    expect(result2[0].item_order).toBe(1);
    expect(result2[1].item_order).toBe(2);
    expect(result2[2].item_order).toBe(3);
    // Different recipes, so this simulates overwrite scenario
    expect(result2[0].recipe_id).not.toBe(result1[0].recipe_id);
  });
});
