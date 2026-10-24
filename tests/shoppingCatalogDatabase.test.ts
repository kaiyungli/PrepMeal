import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';

const catalogSql = readFileSync('supabase/migrations/20261024210651_canonicalize_duplicate_ingredients.sql', 'utf8');
const shoppingSql = readFileSync('supabase/migrations/20261024210700_correct_plan_shopping_quantities.sql', 'utf8');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE ingredients(id uuid PRIMARY KEY, slug text UNIQUE, name text, aliases text[],
      name_en text, name_zh text, shopping_category text, is_active boolean DEFAULT true);
    CREATE TABLE units(id uuid PRIMARY KEY, code text UNIQUE, unit_type text, display_name_en text, display_name_zh text);
    CREATE TABLE recipes(id uuid PRIMARY KEY, base_servings integer, is_public boolean DEFAULT true);
    CREATE TABLE recipe_ingredients(id uuid PRIMARY KEY, recipe_id uuid REFERENCES recipes,
      ingredient_id uuid REFERENCES ingredients, unit_id uuid REFERENCES units,
      quantity numeric, is_optional boolean DEFAULT false, prep_note text, created_at timestamptz);
    CREATE TABLE ingredient_substitutions(id uuid PRIMARY KEY, ingredient_id uuid REFERENCES ingredients,
      substitute_ingredient_id uuid REFERENCES ingredients);
    CREATE TABLE menu_plans(id uuid PRIMARY KEY, user_id uuid);
    CREATE TABLE menu_plan_items(id uuid PRIMARY KEY, menu_plan_id uuid REFERENCES menu_plans,
      recipe_id uuid REFERENCES recipes, servings numeric);
    CREATE TABLE user_preferences(user_id uuid PRIMARY KEY, unit_language text);
    ALTER TABLE menu_plans ENABLE ROW LEVEL SECURITY;
  `);
  await db.exec(shoppingSql);
}, 30000);
beforeEach(async () => {
  await db.exec(`TRUNCATE menu_plan_items,menu_plans,recipe_ingredients,ingredient_substitutions,recipes,ingredients,units,user_preferences;
    SELECT set_config('request.jwt.claim.sub','${id(1)}',false);
    INSERT INTO ingredients(id,slug,name,shopping_category) VALUES ('${id(10)}','chicken','雞肉','meat');
    INSERT INTO units VALUES ('${id(20)}','g','mass','g','克'),('${id(21)}','ml','volume','ml','毫升');
    INSERT INTO recipes VALUES ('${id(30)}',2,true),('${id(31)}',4,true),('${id(32)}',1,false);
    INSERT INTO menu_plans VALUES ('${id(40)}','${id(1)}'),('${id(41)}','${id(2)}'),('${id(42)}','${id(1)}');
    INSERT INTO recipe_ingredients(id,recipe_id,ingredient_id,unit_id,quantity,is_optional) VALUES
      ('${id(50)}','${id(30)}','${id(10)}','${id(20)}',200,false),
      ('${id(51)}','${id(31)}','${id(10)}','${id(20)}',400,false),
      ('${id(52)}','${id(32)}','${id(10)}','${id(20)}',999,false),
      ('${id(53)}','${id(30)}','${id(10)}','${id(21)}',99,true);`);
});
afterAll(async () => { await db?.close(); });

async function meals(rows: [number, number, number | null][]) {
  for (const [mealId, recipeId, servings] of rows) await db.query(
    'INSERT INTO menu_plan_items VALUES ($1,$2,$3,$4)', [id(mealId), id(40), id(recipeId), servings]);
}
async function result(plan = 40) {
  return (await db.query<{ data: { items: { quantity: number; unit_code: string; unit_display: string }[] } | null }>(
    'SELECT public.get_menu_plan_shopping_list_json($1) AS data', [id(plan)])).rows[0].data;
}

it('scales each occurrence against its own recipe basis, including fractional servings', async () => {
  await meals([[60,30,2], [61,30,1], [62,31,0.5]]);
  expect((await result())?.items).toMatchObject([{ quantity: 350, unit_code: 'g', unit_display: '克' }]);
});
it('excludes unselected options and private recipes, without mixing incompatible units', async () => {
  await meals([[60,30,2], [61,32,1]]);
  expect((await result())?.items).toHaveLength(1);
  expect((await result())?.items[0].quantity).toBe(200);
  await db.exec(`UPDATE recipe_ingredients SET is_optional=false WHERE id='${id(53)}';`);
  expect((await result())?.items.map(x => [x.unit_code,x.quantity])).toEqual([['g',200],['ml',99]]);
});
it('keeps unknown and unowned plans indistinguishable, with a distinct owned-empty result', async () => {
  expect(await result(41)).toBeNull(); expect(await result(99)).toBeNull();
  expect(await result(42)).toEqual({ items: [] });
  const privileges = await db.query(`SELECT
    has_function_privilege('anon','public.get_menu_plan_shopping_list_json(uuid)','EXECUTE') AS anon,
    has_function_privilege('authenticated','public.get_menu_plan_shopping_list_json(uuid)','EXECUTE') AS authenticated,
    has_function_privilege('service_role','public.get_menu_plan_shopping_list_json(uuid)','EXECUTE') AS service_role`);
  expect(privileges.rows[0]).toEqual({ anon:false,authenticated:true,service_role:false });
  await db.exec('SET ROLE authenticated');
  expect(await result(41)).toBeNull();
  await db.exec('RESET ROLE');
});
it('uses the caller unit language and defaults invalid legacy servings to one', async () => {
  await meals([[60,30,null],[61,30,0]]);
  await db.exec(`INSERT INTO user_preferences VALUES ('${id(1)}','en');`);
  expect((await result())?.items).toMatchObject([{quantity:200,unit_display:'g'}]);
});
it('redirects duplicate catalog references and preserves quantities, notes and retired records on replay', async () => {
  await db.exec(`INSERT INTO ingredients(id,slug,name,aliases,name_en) VALUES
    ('${id(70)}','fermented-black-bean','豆豉',ARRAY['黑豆豉'],'fermented black bean'),
    ('${id(71)}','fermented-black-beans','豆豉',ARRAY[]::text[],null);
    INSERT INTO recipe_ingredients(id,recipe_id,ingredient_id,unit_id,quantity,prep_note)
      VALUES ('${id(72)}','${id(30)}','${id(70)}','${id(20)}',12,'沖洗後切碎');
    INSERT INTO ingredient_substitutions VALUES ('${id(73)}','${id(10)}','${id(70)}');`);
  await db.exec(catalogSql); await db.exec(catalogSql);
  expect((await db.query('SELECT ingredient_id,quantity,prep_note FROM recipe_ingredients WHERE id=$1',[id(72)])).rows[0])
    .toEqual({ingredient_id:id(71),quantity:'12',prep_note:'沖洗後切碎'});
  expect((await db.query('SELECT is_active FROM ingredients WHERE id=$1',[id(70)])).rows[0]).toEqual({is_active:false});
  expect((await db.query<{aliases:string[]}>('SELECT aliases FROM ingredients WHERE id=$1',[id(71)])).rows[0].aliases).toContain('黑豆豉');
  expect((await db.query<{substitute_ingredient_id:string}>('SELECT substitute_ingredient_id FROM ingredient_substitutions')).rows[0].substitute_ingredient_id).toBe(id(71));
});
it('unifies egg counts without converting grams or counts for unrelated ingredients', async () => {
  await db.exec(`INSERT INTO ingredients(id,slug,name) VALUES ('${id(70)}','egg','雞蛋');
    INSERT INTO units VALUES ('${id(22)}','egg','count','egg','隻'),('${id(23)}','pc','count','pc','個');
    INSERT INTO recipe_ingredients(id,recipe_id,ingredient_id,unit_id,quantity) VALUES
    ('${id(72)}','${id(30)}','${id(70)}','${id(23)}',2),
    ('${id(73)}','${id(30)}','${id(70)}','${id(20)}',50),
    ('${id(74)}','${id(30)}','${id(10)}','${id(23)}',1);`);
  await db.exec(catalogSql);
  const rows = (await db.query('SELECT unit_id,quantity FROM recipe_ingredients WHERE id IN ($1,$2,$3) ORDER BY id',[id(72),id(73),id(74)])).rows;
  expect(rows).toEqual([{unit_id:id(22),quantity:'2'},{unit_id:id(20),quantity:'50'},{unit_id:id(23),quantity:'1'}]);
});
