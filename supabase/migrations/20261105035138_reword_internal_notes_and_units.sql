-- Reword ingredient notes and step text that showed internal bookkeeping
-- (nutrition sources, shopping-list counting) or Latin units to users, and
-- show 公仔麵 in 個 (owner approved 2026-11-05). Quantities are untouched.
-- Each row is matched by id and its old value; the whole set applies or none.
DO $$
DECLARE n integer; total integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipe_ingredients WHERE id = '45286d95-e30a-4266-bd88-7c05c08a3e1f' AND prep_note = $t$斬細件；連骨生重；營養可食率依參考樣本估算$t$) THEN
    RAISE NOTICE 'already applied'; RETURN;
  END IF;
  WITH v(id, old_note, new_note) AS (VALUES
    ('45286d95-e30a-4266-bd88-7c05c08a3e1f'::uuid, $t$斬細件；連骨生重；營養可食率依參考樣本估算$t$, $t$斬細件；連骨生重$t$),
    ('0cca31d0-8350-4522-9e3f-7bdc1028c335'::uuid, $t$去皮重量，切薄片；計入全部用量$t$, $t$去皮後重量，切薄片$t$),
    ('6d6a91a3-22ef-4ac5-b358-7fde1015af91'::uuid, $t$煮汁用；全投入計營養及倍算，汆燙工序水不計$t$, $t$煮汁用；汆燙用水另備$t$),
    ('ec3922af-25f2-4c62-ad99-dc9490a9aab5'::uuid, $t$原味未鹽漬、去大骨魚柳可食生重，連皮；以大西洋鯖魚作營養參考$t$, $t$原味未鹽漬、去大骨魚柳，連皮生重$t$),
    ('b5eb2f86-547a-443b-b0d2-9843d3602f0d'::uuid, $t$熟重；不是生米150克，計入本餐營養及購物清單$t$, $t$熟飯重量，不是生米150克$t$),
    ('193803e6-4fd9-46ef-8d39-f7664c0cf391'::uuid, $t$先煮熟備用；營養及材料重量按未煮／未浸泡乾重計$t$, $t$先煮熟備用；重量為未煮生米$t$),
    ('b88b9679-a6c2-495c-a1a3-cb0a996a7b2a'::uuid, $t$甘醋汁用，全部計入$t$, $t$甘醋汁用$t$),
    ('94b3d0aa-b77d-469c-b551-7a1ee45135e3'::uuid, $t$醬汁用，全部計入$t$, $t$醬汁用$t$),
    ('e0f02852-afb5-41cd-be3c-cf589170dfd3'::uuid, $t$湯用，全部計購物倍算；全湯納入營養$t$, $t$煮湯用$t$),
    ('30fa25f4-53aa-491e-9bfe-401570dfefb1'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未浸泡乾米粉$t$),
    ('22805279-970b-4ae5-b21a-24a052d1729c'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未浸泡乾米粉$t$),
    ('87bba77b-0147-4b98-9953-80ed0197be7a'::uuid, $t$浸軟；營養及材料重量按未煮／未浸泡乾重計$t$, $t$浸軟；重量為未浸泡乾粉絲$t$),
    ('7d0816ad-4d6d-43b9-b834-78ba32fc15cc'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮乾意粉$t$),
    ('1b1caf89-9d19-4c07-be44-bed6a3145a7b'::uuid, $t$斬細件；連骨生重；營養可食率依參考樣本估算$t$, $t$斬細件；連骨生重$t$),
    ('9aa89f0a-baea-41f4-a006-9df584010b19'::uuid, $t$湯底用，全部連飯食用；此水量納入材料倍算$t$, $t$湯底用，連飯一起食用$t$),
    ('adba6e1d-aa3c-4448-90b6-c9d4b4c02bc3'::uuid, $t$可食生重；以約16%脂肪豬肉碎作營養參考，實購肥瘦比例會影響數值$t$, $t$生重；肥瘦比例會影響營養數值$t$),
    ('42b1d624-e7ee-4850-aa68-8bb401567938'::uuid, $t$按包裝煮熟，保留少許咬口；營養及材料重量按未煮／未浸泡乾重計$t$, $t$按包裝煮熟，保留少許咬口；重量為未煮乾意粉$t$),
    ('431baeba-c9ff-4a48-90dd-b6cae6649270'::uuid, $t$按包裝煮熟，保留少許咬口；營養及材料重量按未煮／未浸泡乾重計$t$, $t$按包裝煮熟，保留少許咬口；重量為未煮乾意粉$t$),
    ('218771e9-13bc-430e-8660-e89229022792'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮乾意粉$t$),
    ('3f101511-c7e2-4464-ba4d-00a9b651f893'::uuid, $t$煲湯用量600毫升；汆水用水另備，不計入此量。用小型有蓋湯鍋，成品湯量目標400毫升。$t$, $t$煲湯用600毫升；汆水用水另備。用小型有蓋湯鍋，煲好約有400毫升湯。$t$),
    ('9c6cade8-1376-4605-a812-5d9ff0f6f49a'::uuid, $t$不用預先煮熟；營養及材料重量按未煮／未浸泡乾重計$t$, $t$不用預先煮熟；重量為未煮生米$t$),
    ('49c8a5fc-ea5c-4139-b445-eb87a590fb62'::uuid, $t$浸軟；營養及材料重量按未煮／未浸泡乾重計$t$, $t$浸軟；重量為未浸泡乾粉絲$t$),
    ('523f8029-7d75-4245-85f8-69cea9efede2'::uuid, $t$煲湯用量600毫升；浸菜乾及汆水用水另備，不計入此量。用小型有蓋湯鍋，成品湯量目標400毫升。$t$, $t$煲湯用600毫升；浸菜乾及汆水用水另備。用小型有蓋湯鍋，煲好約有400毫升湯。$t$),
    ('8c34c653-a1c4-4cb6-810f-a729b41c212f'::uuid, $t$按包裝煮熟，保留少許咬口；營養及材料重量按未煮／未浸泡乾重計$t$, $t$按包裝煮熟，保留少許咬口；重量為未煮乾意粉$t$),
    ('eca75ac5-7484-4712-9bcc-1f45375b39a7'::uuid, $t$生雞中翼連骨重量；營養暫按70%可食率估算$t$, $t$生雞中翼，連骨$t$),
    ('9ddee038-d10e-4318-b74b-a81d7f8fb69a'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮乾意粉$t$),
    ('1f6402d7-8db7-46f9-b9aa-00fc347456cc'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮乾意粉$t$),
    ('7e40a794-e875-4de8-8262-09a157ee8f0f'::uuid, $t$浸軟；營養及材料重量按未煮／未浸泡乾重計$t$, $t$浸軟；重量為未浸泡乾粉絲$t$),
    ('620fee9c-9c7d-4571-94c5-83bbe46afb8a'::uuid, $t$煲湯用量600毫升；清洗及汆水用水另備，不計入此量。用小型有蓋湯鍋，成品湯量目標400毫升。$t$, $t$煲湯用600毫升；清洗及汆水用水另備。用小型有蓋湯鍋，煲好約有400毫升湯。$t$),
    ('078bc4df-1776-4c9f-af11-b4e0059e6240'::uuid, $t$薄汁用；焯菜、蒸鍋工序水不計購物$t$, $t$薄汁用；焯菜及蒸用水另備$t$),
    ('61b4d8c5-5105-40fe-a94d-59d43dcd5937'::uuid, $t$浸鹽水吐沙；連殼生重；營養只計估算蜆肉部分$t$, $t$浸鹽水吐沙；連殼生重$t$),
    ('23d02e14-8d4d-432d-b5cd-16a689c21331'::uuid, $t$斬細件；連骨生重；營養可食率依參考樣本估算$t$, $t$斬細件；連骨生重$t$),
    ('79e4bf14-857e-4201-aad7-c5b36889a8b1'::uuid, $t$醃料用，會成為蒸汁；納入材料清單$t$, $t$醃料用，蒸時會變成蒸汁$t$),
    ('d9ef7514-5374-43bf-b73b-e57201e73013'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮生米$t$),
    ('fe59a616-3884-491d-8524-d3f581b1c85e'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未浸泡乾米粉$t$),
    ('b5900549-5556-499c-91eb-df2a115ad44e'::uuid, $t$營養及材料重量按未煮／未浸泡乾重計$t$, $t$重量為未煮乾意粉$t$),
    ('22608b91-b0e3-46f9-8d64-3d7bc3759c0d'::uuid, $t$修整生重，切段；以青蔥通用資料近似日本大蔥$t$, $t$修整後切段$t$),
    ('3fd230d4-2171-4e7b-922b-d69073d87d5d'::uuid, $t$原味免治雞肉可食生重，非熟雞肉；以約8%脂肪通用值估算$t$, $t$原味免治雞肉生重，非熟雞肉$t$),
    ('d5e77a88-9e17-4f3c-8853-8d8e52bda2e2'::uuid, $t$去皮生重，切約1厘米塊；以連皮薯仔通用值近似，纖維或偏高$t$, $t$去皮生重，切約1厘米塊$t$),
    ('50d4dae2-b6f9-4363-b1f6-76a2b06b8443'::uuid, $t$去衣及鬚後連芯生重100克，切段；按可食率61.3%估算粟米粒約61克，只吃粟米粒、不吃芯$t$, $t$去衣及鬚後連芯生重100克，切段；只吃粟米粒、不吃芯$t$),
    ('718ec3a3-9aaa-43f8-9b20-87e5ef1fb879'::uuid, $t$孜然粉，以孜然籽通用資料估算$t$, NULL),
    ('8bd681b4-734c-47a3-a987-8fc0a7cd0433'::uuid, $t$完成撒面；乾芝麻資料近似熟芝麻$t$, $t$完成後撒面$t$),
    ('5e81cbec-f905-4ec1-a7ed-ff31ac1961f4'::uuid, $t$完成撒面；乾芝麻資料近似熟芝麻$t$, $t$完成後撒面$t$)
  )
  UPDATE public.recipe_ingredients ri SET prep_note = v.new_note::text FROM v
  WHERE ri.id = v.id AND ri.prep_note = v.old_note;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 43 THEN RAISE EXCEPTION 'Expected 43 notes, updated %', n; END IF;
  total := total + n;
  WITH v(id, old_text, new_text) AS (VALUES
    ('08f916ff-df45-48fc-b452-1fe97412a812'::uuid, $t$菠菜放入滾水焯約 30–60 秒，瀝乾，放至可觸摸後擠乾水分、切碎。80 g 是焯水前重量，毋須再秤取 80 g 熟菠菜。$t$, $t$菠菜放入滾水焯約 30–60 秒，瀝乾，放至可觸摸後擠乾水分、切碎。80 克是焯水前重量，毋須再秤取 80 克熟菠菜。$t$),
    ('e23f9005-caff-4e88-b389-7a09f49c321e'::uuid, $t$蝦蓉、蝦粒、菠菜、燕麥蛋液、鹽和胡椒拌勻，分成約 4 件，攤成約 7–8 cm 闊、0.8 cm 厚的小餅。$t$, $t$蝦蓉、蝦粒、菠菜、燕麥蛋液、鹽和胡椒拌勻，分成約 4 件，攤成約 7–8 厘米闊、0.8 厘米厚的小餅。$t$),
    ('acef9738-33f4-4201-b4b2-45ba6a1436f3'::uuid, $t$豉油、白醋、麻油、砂糖、蒜蓉及 15 ml 凍滾水拌勻，砂糖溶解後即成醬汁。$t$, $t$豉油、白醋、麻油、砂糖、蒜蓉及 15 毫升凍滾水拌勻，砂糖溶解後即成醬汁。$t$)
  )
  UPDATE public.recipe_steps s SET text = v.new_text FROM v WHERE s.id = v.id AND s.text = v.old_text;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 steps, updated %', n; END IF;
  total := total + n;
  UPDATE public.recipe_ingredients ri SET unit_id = pc.id
  FROM public.units pc, public.units pce
  WHERE pc.code = 'pc' AND pce.code = 'piece' AND ri.unit_id = pce.id
    AND ri.id IN ('f85ebd61-045f-45f8-a5ae-4be18abbce53', '6468255b-0a45-4a07-a569-08dcd35bc80c');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Expected 2 公仔麵 rows, updated %', n; END IF;
  total := total + n;
  RAISE NOTICE 'updated % rows', total;
END $$;
