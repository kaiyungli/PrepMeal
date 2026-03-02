-- Insert 3 sample recipes into PrepMeal database
-- Run this in Supabase SQL Editor

-- Recipe 1: 麻辣雞煲
INSERT INTO recipes (name, description, instructions, cooking_time, difficulty, cuisine, tags, min_servings)
VALUES (
  '麻辣雞煲',
  '香辣惹味既雞煲',
  '["醃雞肉", "爆香配料", "加入雞件炒", "加醬汁燜煮"]'::jsonb,
  30,
  '中',
  '中式',
  '["辣", "送飯"]'::jsonb,
  2
);

-- Recipe 2: 豬肉蓋飯
INSERT INTO recipes (name, description, instructions, cooking_time, difficulty, cuisine, tags, min_servings)
VALUES (
  '豬肉蓋飯',
  '日式做法既豬肉飯',
  '["洋蔥切絲", "煮醬汁", "加入豬肉", "燜10分鐘"]'::jsonb,
  15,
  '易',
  '日式',
  '["送飯", "簡易"]'::jsonb,
  1
);

-- Recipe 3: 炒飯
INSERT INTO recipes (name, description, instructions, cooking_time, difficulty, cuisine, tags, min_servings)
VALUES (
  '炒飯',
  '簡單既家常炒飯',
  '["炒蛋", "加入冷飯", "加入配料", "炒均"]'::jsonb,
  10,
  '易',
  '中式',
  '["送飯", "簡易"]'::jsonb,
  1
);

-- Add equipment for recipes
INSERT INTO equipment (name, category) VALUES 
  ('平底鍋', '爐'),
  ('鑊', '爐')
ON CONFLICT DO NOTHING;

-- Link recipe 1 to equipment
INSERT INTO recipe_equipment (recipe_id, equipment_id)
SELECT r.id, e.id FROM recipes r, equipment e 
WHERE r.name = '麻辣雞煲' AND e.name = '平底鍋'
ON CONFLICT DO NOTHING;

-- Link recipe 2 to equipment
INSERT INTO recipe_equipment (recipe_id, equipment_id)
SELECT r.id, e.id FROM recipes r, equipment e 
WHERE r.name = '豬肉蓋飯' AND e.name = '平底鍋'
ON CONFLICT DO NOTHING;

-- Link recipe 3 to equipment
INSERT INTO recipe_equipment (recipe_id, equipment_id)
SELECT r.id, e.id FROM recipes r, equipment e 
WHERE r.name = '炒飯' AND e.name = '鑊'
ON CONFLICT DO NOTHING;
