-- Review fixes for PR #157 (2026-11-04): liquid seasonings in spoons,
-- totals that match their step portions, and leftover gram/ml amounts in steps.
DO $$
DECLARE n int; cur text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_steps WHERE id = '11c751e7-d040-4c53-8c9a-744d073b02ea' AND text LIKE '%半茶匙紹興酒%') THEN RAISE NOTICE 'already applied'; RETURN; END IF;
  WITH m(id, old_code, old_qty, new_code, new_qty) AS (VALUES
    ('6b8d348b-c688-497f-b12b-5a48f983a134'::uuid, 'ml', 8::numeric, 'tsp', 1.5::numeric),
    ('73c4d888-8a6f-4367-bfd6-09768710d372'::uuid, 'ml', 8::numeric, 'tsp', 1.5::numeric),
    ('269722e5-8a84-4126-ba71-de67fe7cbdc2'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('684362d7-e22a-4b3d-bc6f-bb72883db263'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('95c1197a-0be0-4505-96dd-af7478932029'::uuid, 'ml', 5::numeric, 'tsp', 1::numeric),
    ('370acfc5-8983-417a-87b8-868e1df14a5d'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('9f4de145-eff4-46af-9d56-d002713b7b26'::uuid, 'ml', 2.5::numeric, 'tsp', 0.5::numeric),
    ('31540dd3-3d66-439e-a389-e3a00667a70a'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('1512cfec-af50-41c5-9280-f73dec9dcae1'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('7d1eb608-8784-484e-85d3-1fcabcb044ab'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('db17d969-cf37-4459-b79b-c91a1021da3c'::uuid, 'ml', 22.5::numeric, 'tbsp', 1.5::numeric),
    ('c33ca9a4-c722-40cc-9f83-75079c9d7750'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('b4137ccd-af12-4fc6-9263-c08884d244c6'::uuid, 'ml', 3.75::numeric, 'tsp', 0.75::numeric),
    ('16176911-2358-4bbe-b92a-c1b3d83efaa7'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('8c84d30a-435e-4096-808b-1d7f6b9b9a78'::uuid, 'ml', 30::numeric, 'tbsp', 2::numeric),
    ('8af8137d-3d5c-4e8f-a01f-7c4f0b01b1e4'::uuid, 'ml', 10::numeric, 'tsp', 2::numeric),
    ('a3645d18-574d-4326-aa13-0aeb895ab538'::uuid, 'ml', 2.5::numeric, 'tsp', 0.5::numeric),
    ('17c71df7-ed42-419f-b3d1-d03fdf5c1430'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('bd3d49e4-d442-42fd-babb-10c890d8322d'::uuid, 'ml', 3.75::numeric, 'tsp', 0.75::numeric),
    ('dbd6ba30-eb10-40d2-9f01-01b338b281d6'::uuid, 'ml', 3.75::numeric, 'tsp', 0.75::numeric),
    ('c03da423-b6e5-4c82-90d3-7c26c8a03398'::uuid, 'ml', 9.375::numeric, 'tsp', 2::numeric),
    ('0b9c068e-e9d5-4fce-9d93-65132c3c5abd'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('6d5f2b3d-559a-45de-a308-34ec87bebe27'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('660eb90c-9357-4c5d-9763-76c9da788e37'::uuid, 'ml', 5::numeric, 'tsp', 1::numeric),
    ('f3231a8b-ee8d-48ca-8f22-7fc587680120'::uuid, 'ml', 22.5::numeric, 'tbsp', 1.5::numeric),
    ('6d23b727-5f5c-4289-98ba-de4c593ce433'::uuid, 'ml', 22.5::numeric, 'tbsp', 1.5::numeric),
    ('2288db42-681d-40c0-b26b-630e1af3a054'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('daab9e44-5ed0-4bdd-8207-c690f4ad68b8'::uuid, 'ml', 2.5::numeric, 'tsp', 0.5::numeric),
    ('c329ca93-b360-4040-9ab1-da5576860a58'::uuid, 'ml', 15::numeric, 'tbsp', 1::numeric),
    ('5851dfaa-3fbd-4eb5-8c35-948080c3790b'::uuid, 'ml', 1.666667::numeric, 'tsp', 0.25::numeric),
    ('39da302e-739b-43e2-86b4-779d82117f87'::uuid, 'ml', 3.75::numeric, 'tsp', 0.75::numeric),
    ('70bfcf95-bd45-4374-aae3-6a6fadda5665'::uuid, 'ml', 5::numeric, 'tsp', 1::numeric),
    ('d601de6f-8024-4111-a72c-110537033f35'::uuid, 'ml', 2.5::numeric, 'tsp', 0.5::numeric),
    ('d96cef09-8785-4051-82ee-9b5c712f9974'::uuid, 'ml', 7.5::numeric, 'tsp', 1.5::numeric),
    ('f5dea6e7-78f0-4fd8-9d3c-bfde9ffbe48d'::uuid, 'ml', 10::numeric, 'tsp', 2::numeric),
    ('197bf631-a24c-4f21-b1fb-7ca3d4896e7f'::uuid, 'ml', 2.5::numeric, 'tsp', 0.5::numeric),
    ('886dc3f0-7409-4fe9-a762-932601a0840e'::uuid, 'tsp', 1::numeric, 'tsp', 0.75::numeric),
    ('457c9bde-2e7c-41fe-b8e7-ac65a5a1e4af'::uuid, 'tbsp', 1::numeric, 'tsp', 3.5::numeric),
    ('c12aa600-f372-4e93-a904-66033f57541a'::uuid, 'tsp', 2::numeric, 'tsp', 2.25::numeric),
    ('26798cff-f83d-403f-b288-4898cbb08ccf'::uuid, 'tbsp', 1::numeric, 'tsp', 3.5::numeric),
    ('6b36eee7-6bc0-4a5a-877f-f4b60d126dd6'::uuid, 'tsp', 1.5::numeric, 'tsp', 1.25::numeric),
    ('ad10da04-2ef7-4d10-bf7f-d43f39ca9b36'::uuid, 'tsp', 2::numeric, 'tsp', 2.25::numeric),
    ('cd7bb4be-8edf-44e3-9cb0-ac962c264ee7'::uuid, 'tbsp', 1::numeric, 'tsp', 2::numeric),
    ('7e5e21de-49ad-4165-b5bd-d1d2ef486125'::uuid, 'tbsp', 1::numeric, 'tsp', 2::numeric)
  ), upd AS (UPDATE public.recipe_ingredients ri SET quantity = m.new_qty, unit_id = nu.id FROM m, public.units ou, public.units nu
    WHERE ri.id = m.id AND ou.code = m.old_code AND ri.unit_id = ou.id AND abs(ri.quantity - m.old_qty) < 0.000001 AND nu.code = m.new_code RETURNING 1)
  SELECT count(*) INTO n FROM upd;
  IF n <> 44 THEN RAISE EXCEPTION 'Expected 44 ingredient rows, found %', n; END IF;
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '7179254b-dd23-4a97-9a7b-4cee63fc5572';
  IF cur IS NULL OR position('15毫升柚子豉油蘸醬' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '7179254b-dd23-4a97-9a7b-4cee63fc5572'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '15毫升柚子豉油蘸醬', '1湯匙柚子豉油蘸醬') WHERE id = '7179254b-dd23-4a97-9a7b-4cee63fc5572';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'eb524f99-e395-48a9-ba5b-b430b350f12e';
  IF cur IS NULL OR position('各15毫升味醂' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'eb524f99-e395-48a9-ba5b-b430b350f12e'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '各15毫升味醂', '各1湯匙味醂') WHERE id = 'eb524f99-e395-48a9-ba5b-b430b350f12e';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '373dc5c8-342d-4da4-bd35-d905e2ef6e26';
  IF cur IS NULL OR position('15毫升現成芝麻沙律汁' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '373dc5c8-342d-4da4-bd35-d905e2ef6e26'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '15毫升現成芝麻沙律汁', '1湯匙現成芝麻沙律汁') WHERE id = '373dc5c8-342d-4da4-bd35-d905e2ef6e26';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '11c751e7-d040-4c53-8c9a-744d073b02ea';
  IF cur IS NULL OR position('2.5毫升紹興酒' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '11c751e7-d040-4c53-8c9a-744d073b02ea'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '2.5毫升紹興酒', '半茶匙紹興酒') WHERE id = '11c751e7-d040-4c53-8c9a-744d073b02ea';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'f8691fd5-2b17-4c23-9967-330b908867e7';
  IF cur IS NULL OR position('灒餘2.5毫升酒' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'f8691fd5-2b17-4c23-9967-330b908867e7'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '灒餘2.5毫升酒', '灒餘下半茶匙酒') WHERE id = 'f8691fd5-2b17-4c23-9967-330b908867e7';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'd5a6a222-62c5-46dc-8dfa-f72e03ea39eb';
  IF cur IS NULL OR position('將2克家樂牌普通雞粉' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'd5a6a222-62c5-46dc-8dfa-f72e03ea39eb'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '將2克家樂牌普通雞粉', '將3/4茶匙家樂牌普通雞粉') WHERE id = 'd5a6a222-62c5-46dc-8dfa-f72e03ea39eb';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  IF cur IS NULL OR position('白胡椒粉0.1克' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '76802d0e-8192-4a25-9f0f-eb04f58001ff'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '白胡椒粉0.1克', '白胡椒粉少許') WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  IF cur IS NULL OR position('生抽（最多2.5毫升）' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '76802d0e-8192-4a25-9f0f-eb04f58001ff'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '生抽（最多2.5毫升）', '生抽（最多半茶匙）') WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  IF cur IS NULL OR position('鹽（最多1克）' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '76802d0e-8192-4a25-9f0f-eb04f58001ff'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '鹽（最多1克）', '鹽（最多1/8茶匙）') WHERE id = '76802d0e-8192-4a25-9f0f-eb04f58001ff';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088';
  IF cur IS NULL OR position('生抽（最多2.5毫升）' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '生抽（最多2.5毫升）', '生抽（最多半茶匙）') WHERE id = 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088';
  IF cur IS NULL OR position('鹽（最多0.5克）' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '鹽（最多0.5克）', '鹽（少許）') WHERE id = 'b92d4afb-d3f9-4e2b-bfbf-3a8e0dfef088';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '5015e852-fd97-4bed-9cd3-b67d5e1f4d23';
  IF cur IS NULL OR position('最多加1克' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '5015e852-fd97-4bed-9cd3-b67d5e1f4d23'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '最多加1克', '最多加1/8茶匙') WHERE id = '5015e852-fd97-4bed-9cd3-b67d5e1f4d23';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'b2feeb38-7d76-4a52-8614-0891bc83d55e';
  IF cur IS NULL OR position('撒1克芝麻' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'b2feeb38-7d76-4a52-8614-0891bc83d55e'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '撒1克芝麻', '撒1/4茶匙芝麻') WHERE id = 'b2feeb38-7d76-4a52-8614-0891bc83d55e';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '3a86dfd4-b3e1-42f5-a4de-786d6b1b9f45';
  IF cur IS NULL OR position('撒上1克芝麻' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '3a86dfd4-b3e1-42f5-a4de-786d6b1b9f45'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '撒上1克芝麻', '撒上1/4茶匙芝麻') WHERE id = '3a86dfd4-b3e1-42f5-a4de-786d6b1b9f45';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '393a1ae6-d1c7-41fe-9509-c84f73900c7a';
  IF cur IS NULL OR position('芝麻2.5克' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '393a1ae6-d1c7-41fe-9509-c84f73900c7a'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '芝麻2.5克', '芝麻3/4茶匙') WHERE id = '393a1ae6-d1c7-41fe-9509-c84f73900c7a';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '40ee674a-0a1f-4758-b43b-8fef671d1cdc';
  IF cur IS NULL OR position('加入3 g油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '40ee674a-0a1f-4758-b43b-8fef671d1cdc'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '加入3 g油', '加入半茶匙油') WHERE id = '40ee674a-0a1f-4758-b43b-8fef671d1cdc';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '9f0ad89a-c52f-4faa-8309-2667f828e9ba';
  IF cur IS NULL OR position('餘下2 g油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '9f0ad89a-c52f-4faa-8309-2667f828e9ba'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '餘下2 g油', '餘下半茶匙油') WHERE id = '9f0ad89a-c52f-4faa-8309-2667f828e9ba';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '0439de86-e977-4cfc-b2c4-63b63461c4e5';
  IF cur IS NULL OR position('抹2.5毫升油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '0439de86-e977-4cfc-b2c4-63b63461c4e5'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '抹2.5毫升油', '抹半茶匙油') WHERE id = '0439de86-e977-4cfc-b2c4-63b63461c4e5';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = '1f35e8f5-c4ea-4519-957a-7a24ab6280e6';
  IF cur IS NULL OR position('用量好的 4 g 油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', '1f35e8f5-c4ea-4519-957a-7a24ab6280e6'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '用量好的 4 g 油', '用量好的1茶匙油') WHERE id = '1f35e8f5-c4ea-4519-957a-7a24ab6280e6';
  SELECT text INTO cur FROM public.recipe_steps WHERE id = 'b0cb00dd-9f10-4eed-ab24-5bed68c97f8a';
  IF cur IS NULL OR position('全部3 g油' in cur) = 0 THEN RAISE EXCEPTION 'step % fragment missing', 'b0cb00dd-9f10-4eed-ab24-5bed68c97f8a'; END IF;
  UPDATE public.recipe_steps SET text = replace(text, '全部3 g油', '全部3/4茶匙油') WHERE id = 'b0cb00dd-9f10-4eed-ab24-5bed68c97f8a';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '6b8d348b-c688-497f-b12b-5a48f983a134';
  IF cur IS NULL OR position('本味醂8毫升' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '6b8d348b-c688-497f-b12b-5a48f983a134'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '本味醂8毫升', '本味醂1茶匙半') WHERE id = '6b8d348b-c688-497f-b12b-5a48f983a134';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '73c4d888-8a6f-4367-bfd6-09768710d372';
  IF cur IS NULL OR position('本味醂8毫升' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '73c4d888-8a6f-4367-bfd6-09768710d372'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '本味醂8毫升', '本味醂1茶匙半') WHERE id = '73c4d888-8a6f-4367-bfd6-09768710d372';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '95c1197a-0be0-4505-96dd-af7478932029';
  IF cur IS NULL OR position('本味醂5毫升' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '95c1197a-0be0-4505-96dd-af7478932029'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '本味醂5毫升', '本味醂1茶匙') WHERE id = '95c1197a-0be0-4505-96dd-af7478932029';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '70bfcf95-bd45-4374-aae3-6a6fadda5665';
  IF cur IS NULL OR position('醃2.5毫升＋灒酒2.5毫升' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '70bfcf95-bd45-4374-aae3-6a6fadda5665'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '醃2.5毫升＋灒酒2.5毫升', '醃半茶匙＋灒酒半茶匙') WHERE id = '70bfcf95-bd45-4374-aae3-6a6fadda5665';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = 'c12aa600-f372-4e93-a904-66033f57541a';
  IF cur IS NULL OR position('，合共約2茶匙' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', 'c12aa600-f372-4e93-a904-66033f57541a'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '，合共約2茶匙', '') WHERE id = 'c12aa600-f372-4e93-a904-66033f57541a';
  SELECT prep_note INTO cur FROM public.recipe_ingredients WHERE id = '1c79cb3f-21fa-465a-b4f9-5d97b67e1545';
  IF cur IS NULL OR position('雞肉用3/4茶匙' in cur) = 0 THEN RAISE EXCEPTION 'note % fragment missing', '1c79cb3f-21fa-465a-b4f9-5d97b67e1545'; END IF;
  UPDATE public.recipe_ingredients SET prep_note = replace(prep_note, '雞肉用3/4茶匙', '雞肉用半茶匙') WHERE id = '1c79cb3f-21fa-465a-b4f9-5d97b67e1545';
END $$;
