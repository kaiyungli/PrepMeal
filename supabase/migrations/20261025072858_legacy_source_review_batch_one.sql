DO $audit$
DECLARE n integer;
BEGIN
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","reference_url":"https://thewoksoflife.com/smashed-asian-cucumber-salad/","author":"Judy","comparison":"拍瓜拌蒜及豉油麻油的技法相近；參考用米醋及另有配料，本版用檸檬汁，比例不同。","findings":["材料檸檬汁15毫升與步驟1茶匙不一致；步驟改按15毫升，不再列未入材料表的醋。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='cold-cucumber-salad' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed source precondition'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","reference_url":"https://thewoksoflife.com/steamed-egg/","author":"Judy","comparison":"過篩及蒸製技法相近；參考使用清水加高湯，蒸焗時間亦不同，不能作本版用量或營養依據。","findings":["水120毫升與步驟蛋液1.5倍不一致；步驟改按材料表120毫升。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='steamed-egg' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed source precondition'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","reference_url":"https://thewoksoflife.com/stir-fried-tomato-and-egg/","author":"Sarah","comparison":"先炒蛋盛起，再煮番茄後回鑊拌勻相近；參考用量、油量及調味較多，不能沿用其營養值。","findings":["糖為選配，原步驟卻直接要求加入；改為按需要加入選配糖，移除重複加鹽。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='tomato-scrambled-egg' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed source precondition'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","reference_url":"https://thewoksoflife.com/garlicky-broccoli/","author":"Sarah","comparison":"同樣先汆水再炒蒜；參考另有雞湯、酒及芡，本版為清炒，不能直接套用比例。","findings":["水30毫升選配與步驟必加15毫升、鹽1/8茶匙與步驟約1克不一致；按材料表統一步驟。","蒜頭180克西蘭花配8瓣，可能是舊單位問題，未能確認原意，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='garlic-broccoli' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed source precondition'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","reference_url":"https://thewoksoflife.com/stir-fry-spinach/","author":"Judy","comparison":"蒜香快炒菠菜技法相近；參考另外用白胡椒及麻油，蒜油比例不同，不是本版原始來源。","findings":["選配水20毫升與步驟15毫升、鹽1/8茶匙與步驟約1克不一致；按材料表統一步驟。","蒜頭180克菠菜配8瓣，可能是舊單位問題，未能確認原意，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='garlic-spinach' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed source precondition'; END IF;
UPDATE public.recipe_steps s SET text='加入清水120毫升及材料表所列的鹽，攪拌均勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='steamed-egg' AND s.step_no=2 AND s.text='加入約蛋液 1.5 倍份量的清水和鹽少許，攪拌均勻。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
UPDATE public.recipe_steps s SET text='加入生抽1湯匙、檸檬汁15毫升、麻油1茶匙和糖1茶匙拌勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='cold-cucumber-salad' AND s.step_no=3 AND s.text='加入生抽 1 湯匙、檸檬汁或醋 1 茶匙、麻油 1 茶匙和糖 1 茶匙拌勻。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
UPDATE public.recipe_steps s SET text='按需要加入選配糖，拌勻後試味。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='tomato-scrambled-egg' AND s.step_no=5 AND s.text='加入糖少許和鹽少許平衡酸味。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
UPDATE public.recipe_steps s SET text='如鑊太乾，可按需要加入最多30毫升選配清水；加入鹽1/8茶匙，炒至熟透。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='garlic-broccoli' AND s.step_no=5 AND s.text='加入 1 湯匙水和鹽約 1 克，炒至熟透但仍爽脆。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
UPDATE public.recipe_steps s SET text='如鑊太乾，可按需要加入最多20毫升選配清水。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='garlic-spinach' AND s.step_no=4 AND s.text='如鑊太乾可加入 1 湯匙水。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
UPDATE public.recipe_steps s SET text='加入鹽1/8茶匙調味。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.slug='garlic-spinach' AND s.step_no=5 AND s.text='加入鹽約 1 克調味。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Changed step precondition'; END IF;
END $audit$;
