-- Fix: Allow multiple items per (date, meal_slot) by adding item_order to unique constraint
-- Bug: duplicate key value violates unique constraint "menu_plan_items_menu_plan_id_date_meal_slot_key"

-- Step 1: Drop the old unique constraint (if exists)
ALTER TABLE menu_plan_items DROP CONSTRAINT IF EXISTS menu_plan_items_menu_plan_id_date_meal_slot_key;

-- Step 2: Add new unique constraint with item_order
-- This allows multiple items per slot, ordered by item_order
ALTER TABLE menu_plan_items ADD CONSTRAINT menu_plan_items_unique_slot_order 
  UNIQUE (menu_plan_id, date, meal_slot, item_order);

-- Verify the constraint was added
-- SELECT conname FROM pg_constraint WHERE conname = 'menu_plan_items_unique_slot_order';
