import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261104054435_merge_duplicate_shopping_ingredients.sql', 'utf8');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let db: PGlite;

beforeEach(async () => {
  await db?.close();
  db = new PGlite();
  await db.exec(`
    CREATE TABLE ingredients(id uuid PRIMARY KEY, slug text UNIQUE, name text, aliases text[] NOT NULL DEFAULT '{}',
      name_en text, name_zh text, shopping_category text, is_active boolean DEFAULT true);
    CREATE TABLE recipes(id uuid PRIMARY KEY);
    CREATE TABLE recipe_ingredients(id uuid PRIMARY KEY, recipe_id uuid REFERENCES recipes,
      ingredient_id uuid REFERENCES ingredients, quantity numeric, prep_note text, UNIQUE(recipe_id, ingredient_id));
    CREATE TABLE ingredient_substitutions(id uuid PRIMARY KEY, ingredient_id uuid REFERENCES ingredients,
      substitute_ingredient_id uuid REFERENCES ingredients);
    INSERT INTO ingredients(id,slug,name,aliases,shopping_category) VALUES
      ('${id(1)}','pork-mince','免治豬肉','{}','meat_seafood'), ('${id(2)}','minced-pork','豬肉碎','{免治豬肉,肉碎}','meat_seafood'),
      ('${id(3)}','miso-paste','味噌醬','{}','seasoning'), ('${id(4)}','miso','味噌','{味噌醬}','seasoning'),
      ('${id(5)}','tuna','吞拿魚','{}','meat_seafood'), ('${id(6)}','canned-tuna','吞拿魚罐頭','{吞拿魚}','meat_seafood'),
      ('${id(7)}','vermicelli','粉絲','{}','carb'), ('${id(8)}','mung-bean-glass-noodles','乾綠豆粉絲','{}','carb'),
      ('${id(9)}','tofu','豆腐','{}','tofu_egg'), ('${id(10)}','firm-tofu','硬豆腐','{}','tofu_egg');
    INSERT INTO recipes VALUES ('${id(20)}'),('${id(21)}'),('${id(22)}');
    INSERT INTO recipe_ingredients VALUES
      ('${id(30)}','${id(20)}','${id(1)}',150,'豬肉碎'),
      ('${id(31)}','${id(21)}','${id(2)}',100,null),
      ('${id(32)}','${id(20)}','${id(7)}',30,'浸軟'),
      ('${id(33)}','${id(20)}','${id(9)}',120,'鮮硬豆腐淨重，瀝水後切件'),
      ('${id(34)}','${id(21)}','${id(9)}',150,'切粒');
    INSERT INTO ingredient_substitutions VALUES ('${id(40)}','${id(3)}','${id(5)}');
  `);
});
afterAll(async () => { await db?.close(); });

const rows = async () => (await db.query<{ id: string; slug: string; quantity: string; prep_note: string | null }>(
  'SELECT ri.id, i.slug, ri.quantity::text, ri.prep_note FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id ORDER BY ri.id')).rows;

it('moves recipe rows to the canonical ingredient without changing quantities or notes', async () => {
  await db.exec(sql);
  expect(await rows()).toEqual([
    { id: id(30), slug: 'minced-pork', quantity: '150', prep_note: '豬肉碎' },
    { id: id(31), slug: 'minced-pork', quantity: '100', prep_note: null },
    { id: id(32), slug: 'mung-bean-glass-noodles', quantity: '30', prep_note: '浸軟' },
    { id: id(33), slug: 'firm-tofu', quantity: '120', prep_note: '鮮硬豆腐淨重，瀝水後切件' },
    { id: id(34), slug: 'tofu', quantity: '150', prep_note: '切粒' },
  ]);
  const ingredients = (await db.query<{ slug: string; is_active: boolean; aliases: string[] }>(
    'SELECT slug, is_active, aliases FROM ingredients ORDER BY slug')).rows;
  const bySlug = Object.fromEntries(ingredients.map(i => [i.slug, i]));
  for (const slug of ['pork-mince', 'miso-paste', 'tuna', 'vermicelli']) expect(bySlug[slug].is_active).toBe(false);
  expect(bySlug.tofu.is_active).toBe(true);
  expect(bySlug['minced-pork'].aliases).toEqual(['pork-mince', '免治豬肉', '肉碎']);
  expect(bySlug['mung-bean-glass-noodles'].aliases).toEqual(['vermicelli', '粉絲']);
  expect((await db.query('SELECT ingredient_id, substitute_ingredient_id FROM ingredient_substitutions')).rows)
    .toEqual([{ ingredient_id: id(4), substitute_ingredient_id: id(6) }]);
});

it('is idempotent', async () => {
  await db.exec(sql);
  const once = await rows();
  await db.exec(sql);
  expect(await rows()).toEqual(once);
});

it('refuses to combine two rows of one recipe', async () => {
  await db.exec(`INSERT INTO recipe_ingredients VALUES ('${id(35)}','${id(20)}','${id(2)}',50,null)`);
  await expect(db.exec(sql)).rejects.toThrow(/manual ingredient-row merge: pork-mince/);
  expect((await rows()).find(r => r.id === id(30))?.slug).toBe('pork-mince');
});
