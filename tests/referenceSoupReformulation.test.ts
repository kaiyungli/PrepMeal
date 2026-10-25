import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { recipeProvenance } from '@/features/recipes/mappers/recipeProvenance';
import { buildShoppingList } from '@/lib/shoppingList';

type Nutrients = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
type Component = { ingredient: string; input_quantity: number; edible_fraction: number; nutrition_amount: number; per_100: Nutrients; contribution: Nutrients; reference_id: string };
type Nutrition = { components: Component[]; servings: number; whole_pot_unrounded_totals: Nutrients; unrounded_totals: Nutrients; limitations: string[] };
type State = Record<string, unknown> & { name: string; base_servings: number; source_data: Record<string, unknown>; calories_per_serving: number; protein_g: number; carbs_g: number; fat_g: number };
type Ingredient = { id: string; recipe_id: string; slug: string; quantity: number; unit: string; prep_note: string | null; is_optional: boolean; group_key: string | null };
type Step = { id: string; recipe_id: string; step_no: number; text: string; time_seconds: number; image_url: string | null };
type Patch = { slug: string; before: State; after: State; ingredients_before: Ingredient[]; ingredients_after: { old_slug: string; slug: string; quantity: number; unit: string; prep_note: string }[]; steps_before: Step[]; steps_after: Omit<Step, 'id' | 'recipe_id' | 'image_url'>[] };
const patches: Patch[] = JSON.parse(readFileSync('docs/qa/reference-soup-reformulation-20261025.json', 'utf8'));
const registry: { profiles: Record<string, { values: Nutrients }> } = JSON.parse(readFileSync('docs/qa/reference-soup-profiles-20261025.json', 'utf8'));
const sql = readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f => f.endsWith('_reformulate_three_reference_soups.sql'))}`, 'utf8');

async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE TABLE recipes(id uuid primary key,slug text unique,is_public boolean default true,name text,description text,base_servings numeric,servings_unit text,prep_time_minutes integer,cook_time_minutes integer,total_time_minutes integer,calories_per_serving integer,protein_g numeric,carbs_g numeric,fat_g numeric,diet text[],protein text[],primary_protein text,source_data jsonb,updated_at timestamptz,image_url text default 'approved.jpg',flavor text[] default ARRAY['salty'],budget_level text default 'normal');
    CREATE TABLE ingredients(id uuid primary key default gen_random_uuid(),slug text unique,name text,name_zh text,name_en text,category text,shopping_category text,aliases text[],is_active boolean default true,is_pantry_default boolean);
    CREATE TABLE units(id uuid primary key default gen_random_uuid(),code text unique);
    CREATE TABLE recipe_ingredients(id uuid primary key,recipe_id uuid,ingredient_id uuid,quantity numeric,unit_id uuid,prep_note text,is_optional boolean,group_key text);
    CREATE TABLE recipe_steps(id uuid primary key,recipe_id uuid,step_no integer,text text,time_seconds integer,image_url text);`);
  for (const slug of new Set(['pork-ribs', ...patches.flatMap(p => p.ingredients_before.map(i => i.slug))])) await db.query('INSERT INTO ingredients(slug,name) VALUES($1,$1)', [slug]);
  for (const u of ['g', 'ml', 'tsp']) await db.query('INSERT INTO units(code) VALUES($1)', [u]);
  const fields = Object.keys(patches[0].before);
  for (const p of patches) {
    const rid = p.ingredients_before[0].recipe_id;
    await db.query(`INSERT INTO recipes(id,slug,${fields.join(',')}) SELECT $1,$2,${fields.map(f => `r.${f}`).join(',')} FROM jsonb_populate_record(NULL::recipes,$3::jsonb) r`, [rid, p.slug, JSON.stringify(p.before)]);
    for (const i of p.ingredients_before) await db.query('INSERT INTO recipe_ingredients SELECT $1,$2,g.id,$3,u.id,$4,$5,$6 FROM ingredients g CROSS JOIN units u WHERE g.slug=$7 AND u.code=$8', [i.id, rid, i.quantity, i.prep_note, i.is_optional, i.group_key, i.slug, i.unit]);
    for (const s of p.steps_before) await db.query('INSERT INTO recipe_steps VALUES($1,$2,$3,$4,$5,$6)', [s.id, rid, s.step_no, s.text, s.time_seconds, s.image_url]);
  }
  return db;
}

it('applies the three full reformulations, preserving identity, images and historical provenance', async () => {
  const db = await setup();
  try {
    const identity = (await db.query('SELECT id,slug,image_url,flavor,budget_level FROM recipes ORDER BY slug')).rows;
    const stepIdentity = (await db.query('SELECT id,recipe_id,step_no,image_url FROM recipe_steps ORDER BY id')).rows;
    const ingredientIdentity = (await db.query('SELECT id,recipe_id,is_optional,group_key FROM recipe_ingredients ORDER BY id')).rows;
    await db.exec(sql);
    expect((await db.query('SELECT id,slug,image_url,flavor,budget_level FROM recipes ORDER BY slug')).rows).toEqual(identity);
    expect((await db.query('SELECT id,recipe_id,step_no,image_url FROM recipe_steps ORDER BY id')).rows).toEqual(stepIdentity);
    expect((await db.query('SELECT id,recipe_id,is_optional,group_key FROM recipe_ingredients ORDER BY id')).rows).toEqual(ingredientIdentity);
    for (const p of patches) {
      const row = (await db.query<Record<string, unknown>>('SELECT to_jsonb(r) AS row FROM recipes r WHERE slug=$1', [p.slug])).rows[0].row as State;
      for (const [key, value] of Object.entries(p.after)) expect(row[key]).toEqual(value);
      const ingredients = (await db.query('SELECT g.slug,ri.quantity::float8 AS quantity,u.code AS unit,ri.prep_note FROM recipe_ingredients ri JOIN ingredients g ON g.id=ri.ingredient_id JOIN units u ON u.id=ri.unit_id JOIN recipes r ON r.id=ri.recipe_id WHERE r.slug=$1 ORDER BY g.slug', [p.slug])).rows;
      expect(ingredients).toEqual(p.ingredients_after.map(({ slug, quantity, unit, prep_note }) => ({ slug, quantity, unit, prep_note })).sort((a, b) => a.slug.localeCompare(b.slug)));
      expect((await db.query('SELECT step_no,text,time_seconds FROM recipe_steps s JOIN recipes r ON r.id=s.recipe_id WHERE r.slug=$1 ORDER BY step_no', [p.slug])).rows).toEqual(p.steps_after);
      expect(row.source_data.nutrition_review_20261025).toEqual(p.before.source_data.nutrition_review_20261025);
      expect(recipeProvenance(row.source_data).nutrition_is_estimate).toBe(true);
      expect(recipeProvenance(row.source_data).data_quality_notes?.join('')).toContain('未經試煮');
    }
    const fresh = (await db.query<{ name: string; shopping_category: string; aliases: string[] }>('SELECT name,shopping_category,aliases FROM ingredients WHERE slug=$1', ['fresh-duck-gizzard'])).rows[0];
    expect(fresh).toMatchObject({ name: '鮮鴨腎', shopping_category: 'meat_seafood' });
    expect(fresh.aliases).not.toContain('陳腎');
    await expect(db.exec(sql)).rejects.toThrow('Recipe precondition changed');
  } finally { await db.close(); }
}, 30000);

it('rolls back all changes and the new ingredient when a reviewed instruction has changed', async () => {
  const db = await setup();
  try {
    await db.query("UPDATE recipe_steps SET text='concurrent edit' WHERE id=$1", [patches.at(-1)!.steps_before[0].id]);
    await expect(db.exec(sql)).rejects.toThrow('Step precondition changed');
    expect((await db.query('SELECT 1 FROM recipes WHERE calories_per_serving IS NOT NULL')).rows).toHaveLength(0);
    expect((await db.query("SELECT 1 FROM ingredients WHERE slug='fresh-duck-gizzard'")).rows).toHaveLength(0);
  } finally { await db.close(); }
}, 30000);

it('calculates traceable edible inputs for two portions without counting bones, cobs or an entire pot per bowl', () => {
  expect(patches).toHaveLength(3);
  for (const p of patches) {
    const n = p.after.source_data.nutrition as Nutrition;
    expect(n.servings).toBe(2);
    expect(p.after.base_servings).toBe(2);
    expect(n.components.map(c => c.ingredient).sort()).toEqual(p.ingredients_after.map(i => i.slug).sort());
    for (const c of n.components) {
      expect(c.per_100).toEqual(registry.profiles[c.ingredient].values);
      expect(c.reference_id).toBeTruthy();
      expect(c.nutrition_amount).toBeCloseTo(c.input_quantity * c.edible_fraction, 8);
      for (const k of ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const) expect(c.contribution[k]).toBeCloseTo(c.nutrition_amount * c.per_100[k] / 100, 8);
    }
    for (const k of ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const) {
      const pot = n.components.reduce((sum, c) => sum + c.contribution[k], 0);
      expect(n.whole_pot_unrounded_totals[k]).toBeCloseTo(pot, 8);
      expect(n.unrounded_totals[k]).toBeCloseTo(pot / 2, 8);
      const rounded = k === 'kcal' ? Math.floor(pot / 2 + 0.500000001) : Math.floor(pot / 2 * 10 + 0.500000001) / 10;
      expect(p.after[k === 'kcal' ? 'calories_per_serving' : k]).toBe(rounded);
    }
    expect(n.limitations.join('')).toContain('只飲湯時不適用');
    expect(n.limitations.join('')).toContain('並非試煮量度');
    expect(p.after.diet).toEqual([]);
  }
  const corn = patches.find(p => p.slug.startsWith('corn-'))!;
  const components = (corn.after.source_data.nutrition as Nutrition).components;
  expect(components.find(c => c.ingredient === 'pork-ribs')?.nutrition_amount).toBe(177.3);
  expect(components.find(c => c.ingredient === 'corn')?.nutrition_amount).toBe(122.6);
  expect(patches.find(p => p.slug.startsWith('watercress-'))!.after.name).toContain('鮮鴨腎');
});

it('scales and merges purchased weights through the actual shopping list helper', () => {
  const recipes = patches.map(p => ({ base_servings: 2, ingredients: p.ingredients_after.map(i => ({ ingredient_id: i.slug, display_name: i.slug, quantity: i.quantity, unit: { name: i.unit }, shopping_category: 'meat_seafood' })) }));
  const one = buildShoppingList(recipes, [], 1);
  const four = buildShoppingList(recipes, [], 4);
  const all = (r: ReturnType<typeof buildShoppingList>) => r.toBuy;
  expect(all(one).find(i => i.name === 'pork-ribs')?.quantity).toBe(420);
  expect(all(four).find(i => i.name === 'pork-ribs')?.quantity).toBe(1680);
  expect(all(one).find(i => i.name === 'fresh-duck-gizzard')?.quantity).toBe(50);
  expect(all(one).find(i => i.name === 'corn')?.quantity).toBe(100);
  expect(all(one).some(i => i.name === 'pork-bones' || i.name === 'preserved-duck-gizzard')).toBe(false);
});
