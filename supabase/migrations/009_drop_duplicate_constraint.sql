-- Drop the old duplicate constraint that's blocking multi-dish saves
-- The new constraint menu_plan_items_unique_slot_order allows multiple items per slot via item_order

ALTER TABLE menu_plan_items DROP CONSTRAINT IF EXISTS unique_plan_meal;

-- Verify remaining constraints
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'menu_plan_items'::regclass;
