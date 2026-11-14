import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const root = 'docs/qa/editorial-guidance-20261113/';
const snapshot = JSON.parse(readFileSync(root + 'recipe-snapshot.json', 'utf8'));
const payload = JSON.parse(readFileSync(root + 'payload.json', 'utf8'));
const apply = readFileSync(root + 'apply.sql', 'utf8');
const rollback = readFileSync(root + 'rollback.sql', 'utf8');
const coldFollowup = readFileSync(root + 'cold-dish-followup.sql', 'utf8');
const servingFollowup = readFileSync(root + 'serving-style-followup.sql', 'utf8');
const servingRollback = readFileSync(root + 'serving-style-followup-rollback.sql', 'utf8');
const catalogue = readFileSync(root + 'catalogue-query.sql', 'utf8').trim().replace(/;$/, '');
const quote = (value: unknown) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
let db: PGlite;
let original: unknown;
async function state() {
  return (await db.query(`select
    (select jsonb_agg(to_jsonb(r) order by id) from recipes r) recipes,
    (select jsonb_agg(to_jsonb(s) order by id) from recipe_steps s) steps,
    (select jsonb_agg(to_jsonb(i) order by id) from recipe_ingredients i) ingredients`)).rows;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create table recipes(id uuid primary key,slug text,name text,description text,method text,
    meal_role text,is_complete_meal boolean,primary_protein text,base_servings int,total_time_minutes int,
    diet jsonb,flavor jsonb,is_public boolean default true,source_data jsonb default '{"internal_ledger":"preserve"}',
    calories_per_serving numeric default 123.45,protein_g numeric default 12.3,carbs_g numeric default 23.4,fat_g numeric default 4.5);
    create table units(id uuid primary key default gen_random_uuid(),code text unique);
    create table ingredients(id uuid primary key,name text);
    create table recipe_steps(id uuid primary key default gen_random_uuid(),recipe_id uuid,step_no int,text text,time_seconds int);
    create table recipe_ingredients(id uuid primary key default gen_random_uuid(),recipe_id uuid,ingredient_id uuid,
      quantity numeric,unit_id uuid,is_optional boolean,prep_note text);
    create temp table fixture as select value r from jsonb_array_elements(${quote(snapshot)});
    insert into recipes(id,slug,name,description,method,meal_role,is_complete_meal,primary_protein,base_servings,total_time_minutes,diet,flavor)
    select (r->>'id')::uuid,r->>'slug',r->>'name',r->>'description',r->>'method',r->>'meal_role',(r->>'is_complete_meal')::boolean,
      r->>'primary_protein',(r->>'base_servings')::int,(r->>'total_time_minutes')::int,r->'diet',r->'flavor' from fixture;
    insert into units(code) select distinct i->>'unit' from fixture cross join lateral jsonb_array_elements(r->'ingredients') i;
    insert into ingredients select distinct (i->>'id')::uuid,i->>'name' from fixture cross join lateral jsonb_array_elements(r->'ingredients') i;
    insert into recipe_steps(recipe_id,step_no,text) select (r->>'id')::uuid,(s->>'step_no')::int,s->>'text' from fixture cross join lateral jsonb_array_elements(r->'steps') s;
    insert into recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,is_optional,prep_note)
      select (r->>'id')::uuid,(i->>'id')::uuid,(i->>'quantity')::numeric,u.id,(i->>'optional')::boolean,i->>'note'
      from fixture cross join lateral jsonb_array_elements(r->'ingredients') i join units u on u.code=i->>'unit';`);
  original = await state();
}, 30000);
afterAll(async () => { await db?.close(); });

describe.sequential('303-recipe content transaction', () => {
  it('matches the actual database precondition hashes before touching content', async () => {
    const result = await db.query<{ id: string; hash: string }>(`select x.id,md5(to_jsonb(x)::text) hash from (${catalogue}) x`);
    for (const p of payload) expect(result.rows.find(r => r.id === p.id)?.hash, p.slug).toBe(p.expected_hash);
  });
  it('applies all content, preserving nutrition, edible quantities, row identities and existing metadata', async () => {
    await db.exec(apply);
    expect((await db.query('select count(*)::int n from recipes where source_data ? \'editorial_guidance\'')).rows).toEqual([{ n: 303 }]);
    const rows = (await db.query<{ id: string; source_data: { internal_ledger: string; editorial_guidance: unknown } }>('select id,source_data from recipes')).rows;
    for (const p of payload) {
      const row = rows.find(r => r.id === p.id)!;
      expect(row.source_data.internal_ledger).toBe('preserve');
      expect(row.source_data.editorial_guidance).toEqual(p.guidance);
    }
    expect((await db.query('select count(*)::int n from recipe_ingredients')).rows).toEqual([{ n: snapshot.reduce((n: number, r: { ingredients: unknown[] }) => n + r.ingredients.length, 0) + 10 }]);
    // SQL itself compares every protected recipe field, including all four nutrition columns.
    const originalIngredients = (original as { ingredients: { id: string; ingredient_id: string }[] }[])[0].ingredients;
    const now = (await state() as { ingredients: { id: string; ingredient_id: string }[] }[])[0].ingredients;
    for (const ingredient of originalIngredients.filter(i => i.ingredient_id !== '4d32e561-50ac-4bb4-be6e-43c12a72e397')) {
      expect(now.find(i => i.id === ingredient.id)).toEqual(ingredient);
    }
  }, 30000);
  it('replays the browser-discovered cold-dish follow-up to the exact final content', async () => {
    const final = await state();
    const coldPatches = JSON.parse(coldFollowup.split('$cold_patch$')[1]);
    expect(coldPatches).toHaveLength(13);
    for (const p of coldPatches) await db.query("update recipes set source_data=jsonb_set(source_data,'{editorial_guidance}',$1::jsonb,true) where id=$2", [JSON.stringify(p.old), p.id]);
    const salad = snapshot.find((r: { slug: string }) => r.slug === 'prepmeal-25-14-som-tam');
    await db.query('update recipe_steps set text=$1 where recipe_id=$2 and step_no=4', [salad.steps.find((s: { step_no: number }) => s.step_no === 4).text, salad.id]);
    await db.exec(coldFollowup);
    expect(await state()).toEqual(final);
  });
  it('rejects repeated cold-dish patches atomically', async () => {
    const before = await state();
    await expect(db.exec(coldFollowup)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK');
    expect(await state()).toEqual(before);
  });
  it('applies and rolls back the four missing cold markers without changing other data', async () => {
    const final = await state();
    const patches = JSON.parse(servingFollowup.split('$serving_patch$')[1]);
    expect(patches).toHaveLength(4);
    for (const p of patches) await db.query("update recipes set source_data=jsonb_set(source_data,'{editorial_guidance}',$1::jsonb,true) where id=$2", [JSON.stringify(p.old), p.id]);
    const initial = await state();
    await db.exec(servingFollowup);
    expect(await state()).toEqual(final);
    await db.exec(servingRollback);
    expect(await state()).toEqual(initial);
    await db.exec(servingFollowup);
    expect(await state()).toEqual(final);
  });
  it('rejects repeated serving-style patches atomically', async () => {
    const before = await state();
    await expect(db.exec(servingFollowup)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK');
    expect(await state()).toEqual(before);
  });
  it('rejects a repeated apply without partially overwriting content', async () => {
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK');
    expect(await state()).toEqual(before);
  });
  it('rolls back precisely to the original recipes, steps and ingredient rows', async () => {
    await db.exec(rollback);
    expect(await state()).toEqual(original);
  }, 30000);
  it('rejects a concurrent step edit and leaves all 303 entries untouched', async () => {
    await db.query('update recipe_steps set text=text||$1 where recipe_id=$2 and step_no=1', [' concurrent edit', snapshot[302].id]);
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK');
    expect(await state()).toEqual(before);
    expect((await db.query('select count(*)::int n from recipes where source_data ? \'editorial_guidance\'')).rows).toEqual([{ n: 0 }]);
  });
});
