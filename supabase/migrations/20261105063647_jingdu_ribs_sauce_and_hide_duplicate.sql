-- Owner-approved recipe fixes (2026-11-05):
-- 1. 京都骨 was the same recipe as 生炒骨. Give it a 京都汁 with 喼汁
--    (1 tbsp added, 白醋 1 tbsp -> 1 tsp), marinate the ribs in 生抽, and
--    update nutrition (喼汁 USDA 78 kcal / 19.46 g carbs per 100 g, 17 g per tbsp).
-- 2. Hide 滑蛋蝦仁, a duplicate of 蝦仁炒蛋 (no favourites or saved plans use it).
-- 3. Write three spoon amounts in steps as fractions, as the ingredient list does.
DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_ingredients ri JOIN public.ingredients i ON i.id = ri.ingredient_id
             WHERE ri.recipe_id = '5d0e5bd3-3573-4df1-8257-6b5c555feb0b' AND i.slug = 'worcestershire-sauce') THEN
    RAISE NOTICE 'already applied'; RETURN;
  END IF;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id, is_optional)
  SELECT '5d0e5bd3-3573-4df1-8257-6b5c555feb0b', i.id, 1, u.id, false
  FROM public.ingredients i, public.units u
  WHERE i.slug = 'worcestershire-sauce' AND u.code = 'tbsp';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 喼汁 row, inserted %', n; END IF;

  UPDATE public.recipe_ingredients ri SET unit_id = u.id
  FROM public.units u, public.units old
  WHERE ri.id = '9f56877d-10ed-41cb-8898-4a7d7eb76052' AND ri.quantity = 1
    AND ri.unit_id = old.id AND old.code = 'tbsp' AND u.code = 'tsp';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 1 白醋 row, updated %', n; END IF;

  WITH v(id, old_text, new_text) AS (VALUES
    ('931f1e40-6c85-44c3-92e2-52cab79be57c'::uuid, $t$排骨沖洗後瀝乾，沾上生粉。$t$, $t$排骨沖洗後瀝乾，加生抽拌勻醃 10 分鐘，再沾上生粉。$t$),
    ('9b09ca12-dd18-4879-b626-100204f5ba27'::uuid, $t$加入茄汁、白醋、糖和生抽。$t$, $t$喼汁、茄汁、糖及白醋拌勻成京都汁，倒入鑊中。$t$),
    ('4eff90e5-018a-41f8-a217-ee9c52beac6e'::uuid, $t$準備熟飯；青豆按包裝煮熟。雞肉碎拌清酒、味醂、生抽、薑蓉及雞肉用糖0.5湯匙。$t$, $t$準備熟飯；青豆按包裝煮熟。雞肉碎拌清酒、味醂、生抽、薑蓉及雞肉用糖1/2湯匙。$t$),
    ('ffb77e70-f6a6-4dad-9b06-0afd3078b20d'::uuid, $t$鍋中以小火加熱麻油1.5茶匙，放入薑片炒香，避免燒焦。$t$, $t$鍋中以小火加熱麻油1 1/2茶匙，放入薑片炒香，避免燒焦。$t$),
    ('f49ee053-f177-47bc-92ea-2367a0fd64d2'::uuid, $t$加入蠔油1.5茶匙和清水60毫升；如選用生抽，加入半茶匙；如選用糖，加入1/4茶匙拌勻。$t$, $t$加入蠔油1 1/2茶匙和清水60毫升；如選用生抽，加入半茶匙；如選用糖，加入1/4茶匙拌勻。$t$)
  )
  UPDATE public.recipe_steps s SET text = v.new_text FROM v WHERE s.id = v.id AND s.text = v.old_text;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 5 THEN RAISE EXCEPTION 'Expected 5 steps, updated %', n; END IF;

  UPDATE public.recipes SET calories_per_serving = 731, carbs_g = 35.4,
    source_data = jsonb_set(coalesce(source_data, '{}'::jsonb), '{jingdu_sauce_review_20261105}', jsonb_build_object(
      'date', '2026-11-05',
      'change', '京都汁加入喼汁1湯匙，白醋由1湯匙改為1茶匙；與生炒骨區分',
      'previous', jsonb_build_object('calories_per_serving', 719, 'carbs_g', 32.1),
      'added_component', jsonb_build_object('ingredient', 'worcestershire-sauce', 'input_quantity', 1, 'input_unit', 'tbsp',
        'nutrition_amount_g', 17, 'per_100', jsonb_build_object('kcal', 78, 'carbs_g', 19.46, 'protein_g', 0, 'fat_g', 0),
        'source', 'USDA FoodData Central, Sauce, worcestershire'),
      'vinegar_change', 'white vinegar 15 g -> 5 g (-1.8 kcal)',
      'unrounded_totals', jsonb_build_object('kcal', 730.615, 'carbs_g', 35.43, 'protein_g', 21.93, 'fat_g', 55.6)))
  WHERE id = '5d0e5bd3-3573-4df1-8257-6b5c555feb0b' AND calories_per_serving = 719;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected 京都骨 nutrition update, got %', n; END IF;

  UPDATE public.recipes SET is_public = false
  WHERE id = '4d591143-29c7-44a6-aa34-6a0563d76c57' AND slug = 'shrimp-scrambled-egg-xhs' AND is_public;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Expected to hide 滑蛋蝦仁, got %', n; END IF;
END $$;
