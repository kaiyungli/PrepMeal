-- Reference-only audit; ingredient quantities and nutrition are preserved.
DO $review$
DECLARE n integer;
BEGIN
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","batch":2,"status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","author":"Bill","reference_url":"https://thewoksoflife.com/stir-fried-lettuce/","comparison":"同樣炒生菜；參考另有薑及多款醬料，本版為蒜鹽清炒，不能沿用其用量或營養。","findings":["水20毫升為選配，步驟卻要求必加，且部分份量不同；鹽1/8茶匙與步驟約1克不一致。"],"pending":["蒜頭為8瓣配180克菜，未找到原始記錄證明應為克或瓣，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='garlic-lettuce' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Source precondition changed'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","batch":2,"status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","author":"Bill","reference_url":"https://thewoksoflife.com/stir-fried-lettuce/","comparison":"參考可用羅馬生菜，但油麥菜不可直接當作完全相同品種；只比對蒜香快炒及避免過熟的技法，參考有額外醬料。","findings":["水20毫升為選配，步驟卻要求必加，且部分份量不同；鹽1/8茶匙與步驟約1克不一致。"],"pending":["蒜頭為8瓣配180克菜，未找到原始記錄證明應為克或瓣，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='garlic-romaine-lettuce' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Source precondition changed'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","batch":2,"status":"comparison_reference_only_original_unverified","publisher":"The Sound of Cooking","author":"Cindy","reference_url":"https://thesoundofcooking.com/stir-fried-morning-glory/","comparison":"蒜香炒通菜技法相近，參考把梗葉分次下鑊；鹽種類及白胡椒選配不同，不是本版原始來源。","findings":["未發現本輪檢查範圍內的材料與步驟數量矛盾。"],"pending":[],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='garlic-water-spinach' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Source precondition changed'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","batch":2,"status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","author":"Judy","reference_url":"https://thewoksoflife.com/chinese-cabbage-stir-fry/","comparison":"只作炒椰菜技法比對；參考含肉及辣椒、多款調味，本版是素菜，不能照搬配方或營養。","findings":["水20毫升為選配，步驟卻要求必加，且部分份量不同；鹽1/8茶匙與步驟約1克不一致。"],"pending":["蒜頭為5瓣配180克菜，未找到原始記錄證明應為克或瓣，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='stir-fried-cabbage' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Source precondition changed'; END IF;
UPDATE public.recipes SET source_data=jsonb_build_object('verification_review','{"date":"2026-10-25","batch":2,"status":"comparison_reference_only_original_unverified","publisher":"The Woks of Life","author":"Kaitlin","reference_url":"https://thewoksoflife.com/stir-fried-bok-choy-recipe/","comparison":"梗葉及蒜香翻炒技法可作比對；參考有薑、麻油等額外調味，比例不可直接沿用。","findings":["水20毫升為選配，步驟卻要求必加，且部分份量不同；鹽1/8茶匙與步驟約1克不一致。"],"pending":["蒜頭為5瓣配180克菜，未找到原始記錄證明應為克或瓣，保留待核。"],"nutrition_validated":false}'::jsonb),updated_at=now() WHERE slug='stir-fried-bok-choy' AND is_public AND source_data IS NULL;
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Source precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='如鑊太乾，可按需要加入最多20毫升選配清水，繼續翻炒。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='garlic-lettuce' AND s.step_no=4 AND s.text='加入 1 湯匙水，幫助生菜均勻受熱。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='加入鹽1/8茶匙調味，快速拌勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='garlic-lettuce' AND s.step_no=5 AND s.text='加入鹽約 1 克調味，快速拌勻。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='如鑊太乾，可按需要加入最多20毫升選配清水，繼續翻炒。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='garlic-romaine-lettuce' AND s.step_no=4 AND s.text='加入 1 湯匙水幫助受熱均勻。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='加入鹽1/8茶匙調味，快速拌勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='garlic-romaine-lettuce' AND s.step_no=5 AND s.text='加入鹽約 1 克調味。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='如鑊太乾，可按需要加入最多20毫升選配清水，繼續翻炒。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='stir-fried-cabbage' AND s.step_no=4 AND s.text='加入 1 至 2 湯匙水，幫助椰菜受熱變軟。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='加入鹽1/8茶匙調味，快速拌勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='stir-fried-cabbage' AND s.step_no=5 AND s.text='加入鹽約 1 克調味。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='加入葉部大火翻炒；如鑊太乾，可按需要加入最多20毫升選配清水。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='stir-fried-bok-choy' AND s.step_no=4 AND s.text='加入葉部和 1 湯匙水，大火翻炒。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
UPDATE public.recipe_steps s SET text='加入鹽1/8茶匙調味，快速拌勻。' FROM public.recipes r WHERE s.recipe_id=r.id AND r.is_public AND r.slug='stir-fried-bok-choy' AND s.step_no=5 AND s.text='加入鹽約 1 克調味。';
GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed'; END IF;
END $review$;
