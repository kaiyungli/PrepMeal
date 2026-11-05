-- Owner-approved (2026-11-05): every recipe is one serving. The 25 batch4
-- recipes already have one-person quantities, but their source adaptation notes
-- were written for an earlier two-person draft (兩人份, 300g chicken, etc.) and
-- used internal review wording. Replace them with reader-facing one-person notes.
-- The old text is kept in source_attribution.adaptation_note_before_20261105.
DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipes WHERE slug LIKE 'prepmeal-batch4-%'
             AND source_data->'source_attribution' ? 'adaptation_note_before_20261105') THEN
    RAISE NOTICE 'already applied'; RETURN;
  END IF;

  WITH v(slug, new_note) AS (VALUES
    ('prepmeal-batch4-01', $t$清水版，保留鹹蛋與皮蛋，用油已定量。$t$),
    ('prepmeal-batch4-02', $t$省去白蘿蔔蓉及豉油；鹽全數計入營養。$t$),
    ('prepmeal-batch4-03', $t$以硬豆腐代厚揚げ、鮮冬菇代舞茸、生粉代片栗粉；煎豆腐用油及水已列入材料。$t$),
    ('prepmeal-batch4-04', $t$保留蒸20分鐘、焗5分鐘及醃15分鐘；以普通豆豉代蔭豆豉，省去蔭油膏。$t$),
    ('prepmeal-batch4-05', $t$省去蘿蔔粒，減少胡椒及生抽；魚滑已調味，不另加鹽。魚滑含魚及花生，同廠亦處理麩質穀物、甲殼類、蛋及大豆。$t$),
    ('prepmeal-batch4-06', $t$只用豬肉並省去蒔蘿；減少鹽及油，保留裹粉及沾蛋工序，全部蛋及油計入營養。$t$),
    ('prepmeal-batch4-07', $t$用超市現成魚片頭；省去自製魚膠、蝦乾及冬菇，以清水代雞湯。$t$),
    ('prepmeal-batch4-08', $t$牛肉免醃；營養以瘦牛肉片估算，用肉眼或肥牛數值會不同。$t$),
    ('prepmeal-batch4-09', $t$以生抽代醬油膏，減糖減水；營養以豬肩胛肉估算。$t$),
    ('prepmeal-batch4-10', $t$用水浸吞拿魚，另加橄欖油；番茄茸營養以Epicure含鹽原味包裝標籤估算，份量較原方減少。$t$),
    ('prepmeal-batch4-11', $t$全部味醂計入營養；雞腿肉去皮去骨，原方未列重量，份量由本站編定。$t$),
    ('prepmeal-batch4-12', $t$用盒裝雞湯，減少醃肉鹽及胡椒；鈉按盒裝湯參考標籤計算。$t$),
    ('prepmeal-batch4-13', $t$補回原材料表漏列的蠔油，免清理整隻魷魚；汆水的水會倒掉，不計入營養。$t$),
    ('prepmeal-batch4-14', $t$以現成焙煎芝麻沙律汁代替芝麻、生抽及糖；營養以丘比產品標籤估算，香港不同容量配方可能有差異。$t$),
    ('prepmeal-batch4-15', $t$以李錦記蒜蓉豆豉醬代原方台灣品牌，減少蒜及額外鹽；補回原方漏寫的雞球回鑊步驟。$t$),
    ('prepmeal-batch4-16', $t$以雞湯代白酒、白蘑菇代cremini，省去Dijon芥末、百里香及細香蔥；用約1.5厘米厚去骨豬扒。$t$),
    ('prepmeal-batch4-17', $t$可用普通米醋；用現成肉眼薄片，免冷凍切片。$t$),
    ('prepmeal-batch4-18', $t$用肉片代肉餅，減少糖，不另加鹽；榨菜品種及浸洗程度會影響營養。$t$),
    ('prepmeal-batch4-19', $t$較原方減少油及魚露。$t$),
    ('prepmeal-batch4-20', $t$以香港紅甜椒代日本青椒，省去芝麻。$t$),
    ('prepmeal-batch4-21', $t$雞柳不上太白粉，減少一道工序；芽菜保留頭尾，用辣豆瓣醬，帶微辣。$t$),
    ('prepmeal-batch4-22', $t$用鍋煮飯，保留醃雞及焗飯步驟；80分鐘包括同時進行的工序，不用電飯煲一鍵煮。$t$),
    ('prepmeal-batch4-23', $t$可用鮮中式炒麵代日式炒麵；營養以濕麵重量估算。省去海苔及紅薑。$t$),
    ('prepmeal-batch4-24', $t$用普通日本豉油代生醬油，省去檸檬。$t$),
    ('prepmeal-batch4-25', $t$以普通生抽代頭抽，加少量水蓋煮；油鹽已定量。$t$)
  )
  UPDATE public.recipes r
  SET source_data = jsonb_set(
        jsonb_set(r.source_data, '{source_attribution,adaptation_note_before_20261105}',
                  r.source_data->'source_attribution'->'adaptation_note'),
        '{source_attribution,adaptation_note}', to_jsonb(v.new_note)),
      updated_at = now()
  FROM v
  WHERE r.slug = v.slug AND r.base_servings = 1
    AND r.source_data->'source_attribution'->>'adaptation_note' IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 25 THEN RAISE EXCEPTION 'Expected 25 batch4 notes, updated %', n; END IF;
END $$;
