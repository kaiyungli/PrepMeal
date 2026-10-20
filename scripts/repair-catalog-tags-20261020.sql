-- Catalog tag audit: 26 public recipes. Dry-run by default.
-- Uses existing nutritionRules.ts; does not change nutrition, ingredients or steps.
-- Review returned rows, then replace the final ROLLBACK with COMMIT to apply.
BEGIN;
CREATE TEMP TABLE tag_repair ON COMMIT DROP AS
SELECT * FROM jsonb_to_recordset($audit$[
  {
    "id": "52f80de1-87df-4e5d-9c12-184449419847",
    "name": "涼拌番茄",
    "before_diet": [
      "low_calorie"
    ],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "no_cook",
    "protein_g": 2,
    "fat_g": 2,
    "calories_per_serving": 60,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "8d7d22fe-8c9b-4511-a29b-19170cf6eb07",
    "name": "涼拌青瓜",
    "before_diet": [
      "low_calorie",
      "vegetarian"
    ],
    "after_diet": [
      "vegetarian",
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "no_cook",
    "protein_g": 2,
    "fat_g": 3,
    "calories_per_serving": 70,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "0285dc52-d7f1-4b68-9332-b433130df09e",
    "name": "雞胸豆腐蛋餅",
    "before_diet": [
      "high_protein"
    ],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "fried",
    "after_method": "fried",
    "protein_g": 32,
    "fat_g": 14,
    "calories_per_serving": 300,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "7bbaa915-bc87-4c6e-863c-206245a94af9",
    "name": "吞拿魚豆腐蛋餅",
    "before_diet": [
      "high_protein"
    ],
    "after_diet": [],
    "before_method": "fried",
    "after_method": "fried",
    "protein_g": 30,
    "fat_g": 16,
    "calories_per_serving": 310,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "d8bd8db7-974b-47d0-99cd-d1330138a286",
    "name": "瑞士雞翼（現成瑞士汁版）",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "braised",
    "after_method": "braised",
    "protein_g": 14.5,
    "fat_g": 10.3,
    "calories_per_serving": 208,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "33ce56c8-d05c-49a9-b8e2-eb6499bcbdd8",
    "name": "韓式家常雜菜粉絲",
    "before_diet": [
      "vegetarian"
    ],
    "after_diet": [
      "vegetarian",
      "low_calorie"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 4,
    "fat_g": 13.1,
    "calories_per_serving": 371,
    "dish_type": "staple",
    "is_complete_meal": false
  },
  {
    "id": "a857763a-b6b6-4df6-9005-81d31a6ea592",
    "name": "泰式青木瓜沙律",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "no_cook",
    "after_method": "no_cook",
    "protein_g": 8.8,
    "fat_g": 7.2,
    "calories_per_serving": 194,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "a2eee8c2-0e5f-48fb-bd2c-fc098b7b74ff",
    "name": "泰式酸辣海鮮粉絲沙律",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 21.8,
    "fat_g": 17.5,
    "calories_per_serving": 373,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "446124e6-ac8b-462d-8a3b-1ed34173379b",
    "name": "韓式辣炒魷魚",
    "before_diet": [
      "high_protein"
    ],
    "after_diet": [
      "high_protein",
      "low_calorie"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 27,
    "fat_g": 17.2,
    "calories_per_serving": 400,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "eb11805c-e2fc-4196-a890-40244bca9f74",
    "name": "日式味噌牛油炒雜菇",
    "before_diet": [
      "vegetarian",
      "egg_lacto"
    ],
    "after_diet": [
      "vegetarian",
      "egg_lacto",
      "low_calorie"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 6.3,
    "fat_g": 9.4,
    "calories_per_serving": 148,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "79688204-3b31-4951-bdc4-59c695eabb01",
    "name": "法式白酒煮青口",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 18.4,
    "fat_g": 9.5,
    "calories_per_serving": 226,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "2eeddb92-86ee-4ab3-9d85-89eb57989e01",
    "name": "煙肉粟米薯仔牛奶湯",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 5.1,
    "fat_g": 4.8,
    "calories_per_serving": 140,
    "dish_type": "soup",
    "is_complete_meal": false
  },
  {
    "id": "e3345160-5e9a-45ab-b6aa-41926d5a36d0",
    "name": "西湖牛肉羹（豆腐雜蔬版）",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 15.3,
    "fat_g": 6.1,
    "calories_per_serving": 149,
    "dish_type": "soup",
    "is_complete_meal": false
  },
  {
    "id": "b8cd10e9-6682-4291-a138-8affc8d46aa0",
    "name": "叉燒炒蛋",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 21.2,
    "fat_g": 20,
    "calories_per_serving": 337,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "2ff3f98b-58c0-46bf-8ff5-141d3addca04",
    "name": "蜜糖蒜香煎豬扒",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "fried",
    "after_method": "fried",
    "protein_g": 21,
    "fat_g": 15.8,
    "calories_per_serving": 283,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "5ac57672-0c3c-4eec-8976-2f219e4c54ae",
    "name": "希臘檸檬香草焗雞配薯仔（簡易版）",
    "before_diet": [],
    "after_diet": [
      "high_protein"
    ],
    "before_method": "baked",
    "after_method": "baked",
    "protein_g": 41.1,
    "fat_g": 44.6,
    "calories_per_serving": 749,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "6c26019b-399f-4808-87b7-95af53e00786",
    "name": "港式火腿雜菜湯通粉",
    "before_diet": [],
    "after_diet": [
      "high_protein"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 36.1,
    "fat_g": 10.7,
    "calories_per_serving": 659,
    "dish_type": "staple",
    "is_complete_meal": true
  },
  {
    "id": "9e92a54f-e6e2-4437-bed8-5cb31a9143c4",
    "name": "沙茶牛肉煮菜心",
    "before_diet": [],
    "after_diet": [
      "high_protein",
      "low_calorie"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 25.4,
    "fat_g": 17.6,
    "calories_per_serving": 287,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "26321be2-7fa8-47cf-9fcb-4a865bfbe7f3",
    "name": "吞拿魚粟米牛油電飯煲飯",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 9.7,
    "fat_g": 5.8,
    "calories_per_serving": 342,
    "dish_type": "staple",
    "is_complete_meal": false
  },
  {
    "id": "77a0840e-85af-4529-8719-4adfb9947821",
    "name": "韓式吞拿魚紫菜飯糰（簡易拌飯版）",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "no_cook",
    "after_method": "no_cook",
    "protein_g": 15.6,
    "fat_g": 10.4,
    "calories_per_serving": 354,
    "dish_type": "staple",
    "is_complete_meal": false
  },
  {
    "id": "5f8c5b9f-a044-4919-b954-c4bcd49e12de",
    "name": "豆豉涼瓜蒸排骨（簡易版）",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "steamed",
    "after_method": "steamed",
    "protein_g": 19.4,
    "fat_g": 25.4,
    "calories_per_serving": 345,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "98bb1cd9-f558-4c8c-8d53-db68fb90be59",
    "name": "白菜粉絲炆魚片頭",
    "before_diet": [],
    "after_diet": [
      "low_fat",
      "low_calorie"
    ],
    "before_method": "braised",
    "after_method": "braised",
    "protein_g": 13.4,
    "fat_g": 7,
    "calories_per_serving": 257,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "6f243da5-911a-4704-b0bd-860a4cd0a89a",
    "name": "蒜泥白肉（薄肉快煮版）",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 23.1,
    "fat_g": 17.1,
    "calories_per_serving": 268,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "3e812e48-fc4e-440d-8c80-7dc58377c16c",
    "name": "芝麻醬拌四季豆（現成醬版）",
    "before_diet": [
      "vegetarian",
      "egg_lacto"
    ],
    "after_diet": [
      "vegetarian",
      "egg_lacto",
      "low_calorie"
    ],
    "before_method": "boiled",
    "after_method": "boiled",
    "protein_g": 3.2,
    "fat_g": 6.3,
    "calories_per_serving": 108,
    "dish_type": "side",
    "is_complete_meal": false
  },
  {
    "id": "8df34ca9-b92d-4c71-b79a-7c8f2ad455ac",
    "name": "榨菜蒸梅頭肉",
    "before_diet": [],
    "after_diet": [
      "low_calorie"
    ],
    "before_method": "steamed",
    "after_method": "steamed",
    "protein_g": 22.4,
    "fat_g": 18.1,
    "calories_per_serving": 278,
    "dish_type": "main",
    "is_complete_meal": false
  },
  {
    "id": "a4165f61-26cc-417b-b5f7-39ca17f365f9",
    "name": "日式海鮮炒麵（家常版）",
    "before_diet": [],
    "after_diet": [
      "high_protein"
    ],
    "before_method": "stir_fry",
    "after_method": "stir_fry",
    "protein_g": 38.6,
    "fat_g": 10.7,
    "calories_per_serving": 578,
    "dish_type": "staple",
    "is_complete_meal": true
  }
]$audit$::jsonb) AS p(
 id uuid, name text, before_diet text[], after_diet text[], before_method text, after_method text,
 protein_g numeric, fat_g numeric, calories_per_serving numeric, dish_type text, is_complete_meal boolean);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM tag_repair p LEFT JOIN public.recipes r ON r.id=p.id WHERE r.id IS NULL OR NOT r.is_public
 OR r.name IS DISTINCT FROM p.name OR r.protein_g IS DISTINCT FROM p.protein_g
 OR r.fat_g IS DISTINCT FROM p.fat_g OR r.calories_per_serving IS DISTINCT FROM p.calories_per_serving
 OR r.dish_type IS DISTINCT FROM p.dish_type OR r.is_complete_meal IS DISTINCT FROM p.is_complete_meal
 OR NOT ((r.diet IS NOT DISTINCT FROM p.before_diet AND r.method IS NOT DISTINCT FROM p.before_method)
 OR (r.diet IS NOT DISTINCT FROM p.after_diet AND r.method IS NOT DISTINCT FROM p.after_method))) THEN
 RAISE EXCEPTION 'Catalog changed since audit; refresh the affected records before applying';
 END IF;
END $$;
UPDATE public.recipes r SET diet=p.after_diet, method=p.after_method, updated_at=now() FROM tag_repair p
WHERE r.id=p.id AND (r.diet IS DISTINCT FROM p.after_diet OR r.method IS DISTINCT FROM p.after_method)
RETURNING r.id, r.name, r.diet, r.method;
ROLLBACK;
