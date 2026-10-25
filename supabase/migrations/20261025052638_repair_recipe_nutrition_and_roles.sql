-- Bounded catalogue repair; no quantities, steps, images or source evidence replaced.
DO $repair$
DECLARE changed integer;
BEGIN
WITH target(slug,role) AS (VALUES ('prepmeal-batch2-23','protein_side'),
('prepmeal-batch3-22','protein_side'),
('prepmeal-batch3-25','veg_side'),
('prepmeal-25-09-gamja-jorim','veg_side'),
('prepmeal-batch3-07','complete_meal'),
('prepmeal-batch3-17','complete_meal'),
('prepmeal-25-23-zaru-soba','complete_meal'),
('prepmeal-batch2-09','complete_meal'),
('prepmeal-batch3-19','complete_meal'),
('prepmeal-25-07-japchae','complete_meal'))
UPDATE public.recipes r SET meal_role=t.role, is_complete_meal=(t.role='complete_meal'),
 source_data=coalesce(r.source_data,'{}'::jsonb)||jsonb_build_object('meal_role',t.role,'is_complete_meal',t.role='complete_meal','role_repair_20261025',jsonb_build_object('previous_role',r.meal_role,'previous_complete',r.is_complete_meal,'reason','Explicit role after ingredient review; complete_meal denotes standalone rice/noodle dish, not a nutritional completeness claim; optional meat excluded')),
 updated_at=now()
FROM target t WHERE r.slug=t.slug AND r.is_public AND r.meal_role IS NULL AND r.is_complete_meal=false;
GET DIAGNOSTICS changed=ROW_COUNT;
IF changed<>10 THEN RAISE EXCEPTION 'Expected 10 unclassified recipes, got %',changed; END IF;
UPDATE public.recipes SET protein_g=37.4, carbs_g=8.0, fat_g=12.3,
 diet=array_remove(diet,'low_fat'),
 source_data=coalesce(source_data,'{}'::jsonb)||jsonb_build_object('nutrition_repair_20261025','{"date": "2026-10-25", "status": "reference_input_estimate_not_lab_measured", "basis": "1 serving; 160g raw skinless boneless chicken breast; all added oil counted; generic soy sauce and canola oil are proxies for unspecified brands; no measured cooking losses", "profiles": [{"fdc_id": 171077, "description": "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw", "source_url": "https://fdc.nal.usda.gov/food-details/171077/nutrients", "grams": 160, "per_100g": {"kcal": 120.0, "protein_g": 22.5, "fat_g": 2.62, "carbs_g": 0.0}}, {"fdc_id": 169230, "description": "Garlic, raw", "source_url": "https://fdc.nal.usda.gov/food-details/169230/nutrients", "grams": 10, "per_100g": {"kcal": 149.0, "protein_g": 6.36, "fat_g": 0.5, "carbs_g": 33.06}}, {"fdc_id": 169698, "description": "Cornstarch", "source_url": "https://fdc.nal.usda.gov/food-details/169698/nutrients", "grams": 4, "per_100g": {"kcal": 381.0, "protein_g": 0.26, "fat_g": 0.05, "carbs_g": 91.27}}, {"fdc_id": 170931, "description": "Spices, pepper, black", "source_url": "https://fdc.nal.usda.gov/food-details/170931/nutrients", "grams": 1, "per_100g": {"kcal": 251.0, "protein_g": 10.39, "fat_g": 3.26, "carbs_g": 63.95}}, {"fdc_id": 174277, "description": "Soy sauce made from soy and wheat (shoyu)", "source_url": "https://fdc.nal.usda.gov/food-details/174277/nutrients", "grams": 8, "per_100g": {"kcal": 53.0, "protein_g": 8.14, "fat_g": 0.57, "carbs_g": 4.93}}, {"fdc_id": 172336, "description": "Oil, canola", "source_url": "https://fdc.nal.usda.gov/food-details/172336/nutrients", "grams": 8, "per_100g": {"kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0}}], "per_serving_unrounded": {"kcal": 299.61, "protein_g": 37.4015, "fat_g": 12.3222, "carbs_g": 7.9907}, "previous": {"kcal": 300, "protein_g": 35, "carbs_g": 2, "fat_g": 10, "diet": ["high_protein", "low_fat", "low_calorie"]}}'::jsonb),updated_at=now()
WHERE slug='garlic-chicken-xhs' AND is_public AND base_servings=1 AND calories_per_serving=300 AND protein_g=35 AND carbs_g=2 AND fat_g=10;
GET DIAGNOSTICS changed=ROW_COUNT;
IF changed<>1 THEN RAISE EXCEPTION 'Expected original chicken nutrition, got %',changed; END IF;
END $repair$;
