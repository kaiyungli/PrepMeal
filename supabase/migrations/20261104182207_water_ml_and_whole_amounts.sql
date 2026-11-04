-- Water in 毫升 everywhere, and whole-number amounts in step and note text (2026-11-04).
DO $$
DECLARE n int; cur text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_steps WHERE id = '6a116e88-deb1-4117-9827-bba88e4eb10d' AND text LIKE '%和水15毫升%') THEN RAISE NOTICE 'already applied'; RETURN; END IF;
  WITH m(id, old_code, old_qty, new_code, new_qty) AS (VALUES
    ('127fac47-f0ba-4688-afb4-f5dfc19bf254'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('5dc87124-5a43-4ffd-b9a8-14fe44584849'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('318012df-1ffe-4fb4-a447-8a075ca83758'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('f1f1a721-5329-44e5-bbdc-5bf73d5f375f'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('5387a7a8-abd6-4fd4-8c7a-9325ce329d91'::uuid, 'tbsp', 3::numeric, 'ml', 45::numeric),
    ('9c4aec17-8982-421e-94c6-665842165612'::uuid, 'tbsp', 2::numeric, 'ml', 30::numeric),
    ('4ac52d71-3ab7-4168-b7da-fc4cf376c341'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('8f3fd4f3-0573-4dde-81b0-c3e8e4346819'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('3204af08-f434-400b-8970-ce9d30a01ad6'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('27071ceb-0c07-4d3f-acb3-ec94554baee3'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('804661e0-d893-4e5b-b9fc-1d6cef471b12'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('973d4ded-356b-44d5-9070-73737b873209'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('843c5ede-b4c8-44fd-a52c-c077f55f7e13'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('a25f25e4-9feb-45f6-8652-499bfd048c89'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('2b1596ed-2909-4021-9b53-bedd3cecba61'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('d42d357e-7980-4a9f-a1fa-9a6e6693b312'::uuid, 'tbsp', 2::numeric, 'ml', 30::numeric),
    ('ecfbdc06-2bfb-4083-aadb-ebe97140b5e6'::uuid, 'tbsp', 2::numeric, 'ml', 30::numeric),
    ('427cd6d0-131e-4ded-a3e0-09d882072527'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('4ed8f71c-166a-49f2-8dec-67de8ab609e1'::uuid, 'tbsp', 2::numeric, 'ml', 30::numeric),
    ('8c7c0270-e654-427e-a913-033c2cf8c3d1'::uuid, 'tbsp', 1::numeric, 'ml', 15::numeric),
    ('17f3a1ec-bdd9-445d-9dd9-072330034517'::uuid, 'g', 15::numeric, 'ml', 15::numeric),
    ('5919b9b5-2355-4b0c-b41c-32451d95312c'::uuid, 'g', 200::numeric, 'ml', 200::numeric),
    ('c2dcde18-55d3-499d-956d-c077d195bda8'::uuid, 'g', 500::numeric, 'ml', 500::numeric),
    ('57c5d3f7-f167-454e-9cb4-61a88ebc42b9'::uuid, 'g', 90::numeric, 'ml', 90::numeric),
    ('f01c8a69-5e72-4255-b5cd-6c13dec27e81'::uuid, 'g', 1000::numeric, 'ml', 1000::numeric),
    ('6f9ed86f-5688-4544-92f6-3cae925eb0e7'::uuid, 'g', 1010::numeric, 'ml', 1010::numeric),
    ('2eab62d3-341a-4dbb-bf1b-64fa6e6e094b'::uuid, 'g', 30::numeric, 'ml', 30::numeric),
    ('a0d8d52e-a6a6-4386-a743-ad809922a51e'::uuid, 'g', 22.5::numeric, 'ml', 22.5::numeric),
    ('f9be328d-a101-4e6c-be84-958609ba4e32'::uuid, 'g', 825::numeric, 'ml', 825::numeric),
    ('706a17ac-33a5-4e04-ba42-00f05771c940'::uuid, 'g', 100::numeric, 'ml', 100::numeric),
    ('9f7f0833-49b7-4e80-b32b-dd5fd53f6f30'::uuid, 'g', 25::numeric, 'ml', 25::numeric),
    ('61df6c6e-2828-4d38-9871-c165957f09ac'::uuid, 'g', 275::numeric, 'ml', 275::numeric),
    ('34f27492-6da7-4fad-b094-49a849fc877e'::uuid, 'g', 1000::numeric, 'ml', 1000::numeric),
    ('5a794a1f-bb97-4441-9981-bfc2136e2167'::uuid, 'g', 1000::numeric, 'ml', 1000::numeric),
    ('aae5765e-20d8-45e3-ba28-d47e1ab498ec'::uuid, 'g', 1500::numeric, 'ml', 1500::numeric),
    ('48921041-4fbd-4953-ae49-bf8002b15d19'::uuid, 'ml', 1533.333333::numeric, 'ml', 1535::numeric)
  ), upd AS (UPDATE public.recipe_ingredients ri SET quantity = m.new_qty, unit_id = nu.id FROM m, public.units ou, public.units nu
    WHERE ri.id = m.id AND ou.code = m.old_code AND ri.unit_id = ou.id AND abs(ri.quantity - m.old_qty) < 0.000001 AND nu.code = m.new_code RETURNING 1)
  SELECT count(*) INTO n FROM upd;
  IF n <> 36 THEN RAISE EXCEPTION 'Expected 36 ingredient rows, found %', n; END IF;
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '6a116e88-deb1-4117-9827-bba88e4eb10d';
  IF cur IS NULL OR position('和水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '6a116e88-deb1-4117-9827-bba88e4eb10d'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '和水1湯匙', '和水15毫升') WHERE id = '6a116e88-deb1-4117-9827-bba88e4eb10d';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '8e65e476-e686-403b-97be-5656aad16eb8';
  IF cur IS NULL OR position('清水 1 湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '8e65e476-e686-403b-97be-5656aad16eb8'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '清水 1 湯匙', '清水15毫升') WHERE id = '8e65e476-e686-403b-97be-5656aad16eb8';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '36dddfae-b6bf-4f25-8edc-62a348254cb5';
  IF cur IS NULL OR position('3 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '36dddfae-b6bf-4f25-8edc-62a348254cb5'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '3 湯匙水', '45毫升水') WHERE id = '36dddfae-b6bf-4f25-8edc-62a348254cb5';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '9e084f74-d298-499f-8c26-404dd8d03135';
  IF cur IS NULL OR position('2 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '9e084f74-d298-499f-8c26-404dd8d03135'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '2 湯匙水', '30毫升水') WHERE id = '9e084f74-d298-499f-8c26-404dd8d03135';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '69eee6da-b8c3-4b01-9d57-70f51790b2be';
  IF cur IS NULL OR position('加入水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '69eee6da-b8c3-4b01-9d57-70f51790b2be'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '加入水1湯匙', '加入水15毫升') WHERE id = '69eee6da-b8c3-4b01-9d57-70f51790b2be';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'cc470661-293a-45fb-a919-870660f04918';
  IF cur IS NULL OR position('1 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'cc470661-293a-45fb-a919-870660f04918'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '1 湯匙水', '15毫升水') WHERE id = 'cc470661-293a-45fb-a919-870660f04918';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '5e70fadb-de55-44d9-b819-133d52d44296';
  IF cur IS NULL OR position('和 1 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '5e70fadb-de55-44d9-b819-133d52d44296'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '和 1 湯匙水', '和15毫升水') WHERE id = '5e70fadb-de55-44d9-b819-133d52d44296';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '4d439cbc-62c5-4381-8477-6b055d71c2c6';
  IF cur IS NULL OR position('和水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '4d439cbc-62c5-4381-8477-6b055d71c2c6'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '和水1湯匙', '和水15毫升') WHERE id = '4d439cbc-62c5-4381-8477-6b055d71c2c6';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '46f60373-2b89-43a0-8e9e-59db729ba7ba';
  IF cur IS NULL OR position('和水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '46f60373-2b89-43a0-8e9e-59db729ba7ba'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '和水1湯匙', '和水15毫升') WHERE id = '46f60373-2b89-43a0-8e9e-59db729ba7ba';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '5f441c76-427f-4a6b-ab00-b9f1ceea1f4d';
  IF cur IS NULL OR position('1 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '5f441c76-427f-4a6b-ab00-b9f1ceea1f4d'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '1 湯匙水', '15毫升水') WHERE id = '5f441c76-427f-4a6b-ab00-b9f1ceea1f4d';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'ea695611-94e8-4189-bb07-9bc82fc03e1e';
  IF cur IS NULL OR position('及水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'ea695611-94e8-4189-bb07-9bc82fc03e1e'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '及水1湯匙', '及水15毫升') WHERE id = 'ea695611-94e8-4189-bb07-9bc82fc03e1e';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'c15ef9e7-117f-4b86-a04a-69d78edf2006';
  IF cur IS NULL OR position('及水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'c15ef9e7-117f-4b86-a04a-69d78edf2006'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '及水1湯匙', '及水15毫升') WHERE id = 'c15ef9e7-117f-4b86-a04a-69d78edf2006';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '08b3d8ff-7049-4b16-bcaf-3cd837d71974';
  IF cur IS NULL OR position('1 湯匙水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '08b3d8ff-7049-4b16-bcaf-3cd837d71974'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '1 湯匙水', '15毫升水') WHERE id = '08b3d8ff-7049-4b16-bcaf-3cd837d71974';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '1cbdf068-4979-42ff-ac23-397d65a59b5b';
  IF cur IS NULL OR position('加入水2湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '1cbdf068-4979-42ff-ac23-397d65a59b5b'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '加入水2湯匙', '加入水30毫升') WHERE id = '1cbdf068-4979-42ff-ac23-397d65a59b5b';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '6f1ea003-7fb1-41e6-b8f5-06ac5371040b';
  IF cur IS NULL OR position('清水2湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '6f1ea003-7fb1-41e6-b8f5-06ac5371040b'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '清水2湯匙', '清水30毫升') WHERE id = '6f1ea003-7fb1-41e6-b8f5-06ac5371040b';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '661f914d-d519-4faf-a581-ce325074bfcb';
  IF cur IS NULL OR position('加入水1湯匙' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '661f914d-d519-4faf-a581-ce325074bfcb'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '加入水1湯匙', '加入水15毫升') WHERE id = '661f914d-d519-4faf-a581-ce325074bfcb';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '68178720-1c56-4a50-bcf3-b8e311a7a740';
  IF cur IS NULL OR position('3.75克牛油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '68178720-1c56-4a50-bcf3-b8e311a7a740'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '3.75克牛油', '約4克牛油') WHERE id = '68178720-1c56-4a50-bcf3-b8e311a7a740';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '859f4ab7-9f3c-407f-a5c1-b16f302107d6';
  IF cur IS NULL OR position('餘下3.75克軟牛油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '859f4ab7-9f3c-407f-a5c1-b16f302107d6'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '餘下3.75克軟牛油', '餘下約4克軟牛油') WHERE id = '859f4ab7-9f3c-407f-a5c1-b16f302107d6';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '7c944dda-b268-4700-b428-483ce4d1da23';
  IF cur IS NULL OR position('22.5毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '7c944dda-b268-4700-b428-483ce4d1da23'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '22.5毫升水', '約23毫升水') WHERE id = '7c944dda-b268-4700-b428-483ce4d1da23';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '7cdd98cf-cc81-4dda-88db-910994e8ea9f';
  IF cur IS NULL OR position('約33.333毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '7cdd98cf-cc81-4dda-88db-910994e8ea9f'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '約33.333毫升水', '約35毫升水') WHERE id = '7cdd98cf-cc81-4dda-88db-910994e8ea9f';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'fe6df516-0c0a-4697-a21f-4811b3bcf23c';
  IF cur IS NULL OR position('約333.333毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'fe6df516-0c0a-4697-a21f-4811b3bcf23c'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '約333.333毫升水', '約335毫升水') WHERE id = 'fe6df516-0c0a-4697-a21f-4811b3bcf23c';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'd3cce9e3-507c-4e80-84c4-ee0b8f8a3545';
  IF cur IS NULL OR position('7.5毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'd3cce9e3-507c-4e80-84c4-ee0b8f8a3545'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '7.5毫升水', '約8毫升水') WHERE id = 'd3cce9e3-507c-4e80-84c4-ee0b8f8a3545';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '48c23faf-4c40-454d-9167-ec90b6781178';
  IF cur IS NULL OR position('22.5毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '48c23faf-4c40-454d-9167-ec90b6781178'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '22.5毫升水', '約23毫升水') WHERE id = '48c23faf-4c40-454d-9167-ec90b6781178';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'c59c6157-402d-4e3d-b90e-7e1ac4931613';
  IF cur IS NULL OR position('7.5毫升水' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'c59c6157-402d-4e3d-b90e-7e1ac4931613'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '7.5毫升水', '約8毫升水') WHERE id = 'c59c6157-402d-4e3d-b90e-7e1ac4931613';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'e7f9afce-c7f5-4a1f-b12e-b5285d8ceaee';
  IF cur IS NULL OR position('8.5克蛋黃' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'e7f9afce-c7f5-4a1f-b12e-b5285d8ceaee'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '8.5克蛋黃', '約9克蛋黃') WHERE id = 'e7f9afce-c7f5-4a1f-b12e-b5285d8ceaee';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '2a40e4cf-69ad-4c9e-9358-84763a0eb6a7';
  IF cur IS NULL OR position('約3.5克牛油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '2a40e4cf-69ad-4c9e-9358-84763a0eb6a7'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '約3.5克牛油', '約4克牛油') WHERE id = '2a40e4cf-69ad-4c9e-9358-84763a0eb6a7';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '393a1ae6-d1c7-41fe-9509-c84f73900c7a';
  IF cur IS NULL OR position('水7.5毫升' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '393a1ae6-d1c7-41fe-9509-c84f73900c7a'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '水7.5毫升', '水約8毫升') WHERE id = '393a1ae6-d1c7-41fe-9509-c84f73900c7a';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '7e0e4438-b477-4be6-b629-dd67e7044ad4';
  IF cur IS NULL OR position('約88.65克' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '7e0e4438-b477-4be6-b629-dd67e7044ad4'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '約88.65克', '約89克') WHERE id = '7e0e4438-b477-4be6-b629-dd67e7044ad4';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '50d4dae2-b6f9-4363-b1f6-76a2b06b8443';
  IF cur IS NULL OR position('粟米粒61.3克' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '50d4dae2-b6f9-4363-b1f6-76a2b06b8443'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '粟米粒61.3克', '粟米粒約61克') WHERE id = '50d4dae2-b6f9-4363-b1f6-76a2b06b8443';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '9f6e89b0-4243-461b-89d1-e64a092e8734';
  IF cur IS NULL OR position('約88.65克' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '9f6e89b0-4243-461b-89d1-e64a092e8734'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '約88.65克', '約89克') WHERE id = '9f6e89b0-4243-461b-89d1-e64a092e8734';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '294d5fe7-d740-43b0-b06a-35df6245aecb';
  IF cur IS NULL OR position('約70.92克' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '294d5fe7-d740-43b0-b06a-35df6245aecb'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '約70.92克', '約71克') WHERE id = '294d5fe7-d740-43b0-b06a-35df6245aecb';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '48921041-4fbd-4953-ae49-bf8002b15d19';
  IF cur IS NULL OR position('約33.333毫升' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '48921041-4fbd-4953-ae49-bf8002b15d19'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '約33.333毫升', '約35毫升') WHERE id = '48921041-4fbd-4953-ae49-bf8002b15d19';
END $$;
