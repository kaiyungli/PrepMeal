-- Eggs are bought by the egg. Recipes that stated shelled egg in grams
-- (their own notes: 50 克 ≈ 1 隻, 25 克 ≈ 半隻) now use the egg count unit, so
-- the shopping list shows one 雞蛋 line instead of 「隻」 and 「克」 rows.
-- 50 g shelled egg = 1 egg. Notes, optional flags and recipe nutrition are unchanged.
DO $$
DECLARE
  egg_id uuid;
  gram_id uuid;
  count_id uuid;
  moved integer;
BEGIN
  SELECT id INTO egg_id FROM public.ingredients WHERE slug = 'egg';
  SELECT id INTO gram_id FROM public.units WHERE code = 'g';
  SELECT id INTO count_id FROM public.units WHERE code = 'egg' AND unit_type = 'count';
  IF egg_id IS NULL OR gram_id IS NULL OR count_id IS NULL THEN RETURN; END IF;
  UPDATE public.recipe_ingredients
  SET unit_id = count_id, quantity = round(quantity / 50, 6)
  WHERE ingredient_id = egg_id AND unit_id = gram_id;
  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'Converted % egg rows from grams to eggs', moved;
END $$;
