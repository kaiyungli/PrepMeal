import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { editorialRecipeFingerprint } from '@/features/recipes/mappers/recipeEditorialGuidance';
import { normalizeRecipeDetail } from '@/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';

const root = 'docs/qa/recipe-review-batch-four/';
const patches = JSON.parse(readFileSync(root + 'data-patch.json', 'utf8'));
const apply = readFileSync(root + 'apply.sql', 'utf8');
const rollback = readFileSync(root + 'rollback.sql', 'utf8');
const quote = (value: unknown) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
let db: PGlite;
async function state() {
  return (await db.query(`select
    (select jsonb_agg(to_jsonb(r) order by id) from recipes r) recipes,
    (select jsonb_agg(to_jsonb(i) order by id) from recipe_ingredients i) ingredients,
    (select jsonb_agg(to_jsonb(s) order by id) from recipe_steps s) steps`)).rows;
}
let original: unknown;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create table recipes(id uuid primary key,slug text,name text,description text,method text,
    meal_role text,is_complete_meal boolean,primary_protein text,base_servings int,total_time_minutes int,
    diet jsonb,flavor jsonb,is_public boolean default true,source_data jsonb,
    calories_per_serving numeric default 123.45,protein_g numeric default 12.3,carbs_g numeric default 23.4,fat_g numeric default 4.5);
    create table units(id uuid primary key default gen_random_uuid(),code text unique);
    create table ingredients(id uuid primary key,name text);
    create table recipe_steps(id uuid primary key default gen_random_uuid(),recipe_id uuid references recipes,step_no int,text text);
    create table recipe_ingredients(id uuid primary key default gen_random_uuid(),recipe_id uuid references recipes,
      ingredient_id uuid references ingredients,quantity numeric,unit_id uuid references units,is_optional boolean,prep_note text);
    create temp table fixture as select value p from jsonb_array_elements(${quote(patches)});
    insert into recipes(id,slug,name,description,method,meal_role,is_complete_meal,primary_protein,base_servings,total_time_minutes,diet,flavor,source_data)
      select (r->>'id')::uuid,r->>'slug',r->>'name',r->>'description',r->>'method',r->>'meal_role',(r->>'is_complete_meal')::boolean,
      r->>'primary_protein',(r->>'base_servings')::int,(r->>'total_time_minutes')::int,r->'diet',r->'flavor',
      jsonb_build_object('internal_ledger','preserve','editorial_guidance',p->'guidanceBefore') from fixture cross join lateral (select p->'before' r) q;
    insert into units(code) select distinct i->>'unit' from fixture cross join lateral jsonb_array_elements(p->'after'->'ingredients') i;
    insert into ingredients select distinct (i->>'id')::uuid,i->>'name' from fixture cross join lateral jsonb_array_elements(p->'after'->'ingredients') i;
    insert into recipe_steps(recipe_id,step_no,text) select (p->'before'->>'id')::uuid,(s->>'step_no')::int,s->>'text' from fixture cross join lateral jsonb_array_elements(p->'before'->'steps') s;
    insert into recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,is_optional,prep_note)
      select (p->'before'->>'id')::uuid,(i->>'id')::uuid,(i->>'quantity')::numeric,u.id,(i->>'optional')::boolean,i->>'note'
      from fixture cross join lateral jsonb_array_elements(p->'before'->'ingredients') i join units u on u.code=i->>'unit';`);
  original = await state();
}, 30000);
afterAll(async () => { await db?.close(); });

describe.sequential('prepared fourth-batch data correction', () => {
  it('keeps reviewed tips and pairings valid before and after all three data changes', () => {
    for (const p of patches) for (const [key, guidance] of [['before', p.guidanceBefore], ['after', p.guidanceAfter]] as const) {
      const r = { ...p[key], source_data: { editorial_guidance: guidance }, ingredients: p[key].ingredients.map(
        (i: { unit: string; note: string; optional: boolean }) => ({ ...i, unit: { code: i.unit }, prep_note: i.note, is_optional: i.optional })) } as RecipeDetailRow;
      expect(editorialRecipeFingerprint(r)).toBe(guidance.source_fingerprint);
      expect(normalizeRecipeDetail(r).cooking_tips).toEqual(guidance.cooking_tips);
      expect(normalizeRecipeDetail(r).pairing_suggestions).toEqual(guidance.pairing_suggestions);
    }
  });
  it('adds the existing 30ml cooking water and marks only the two salts optional', async () => {
    await db.exec(apply);
    expect((await db.query("select quantity::float q from recipe_ingredients where id='35340291-bba4-43ea-9a4d-38b79b809618'")).rows).toEqual([{ q: 30 }]);
    expect((await db.query("select count(*)::int n from recipe_ingredients where is_optional and ingredient_id='92a6a27a-ad0b-4375-b166-935d7455c9ff'")).rows).toEqual([{ n: 2 }]);
    for (const p of patches) {
      const row = (await db.query<{ source_data: { internal_ledger: string; editorial_guidance: unknown }; calories_per_serving: string }>('select source_data,calories_per_serving from recipes where id=$1', [p.after.id])).rows[0];
      expect(row.source_data.internal_ledger).toBe('preserve');
      expect(row.source_data.editorial_guidance).toEqual(p.guidanceAfter);
      expect(Number(row.calories_per_serving)).toBe(123.45);
    }
  });
  it('rejects repeated application without partial changes', async () => {
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
  });
  it('rolls back exactly, retaining original row identities and metadata', async () => {
    await db.exec(rollback); expect(await state()).toEqual(original);
  });
  it('refuses a missing ml unit without partial changes', async () => {
    await db.exec("update units set code='missing-ml' where code='ml'");
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/water\/unit identity changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
    await db.exec("update units set code='ml' where code='missing-ml'");
  });
  it('refuses to roll back over a subsequent water-quantity edit', async () => {
    await db.exec(apply);
    await db.exec("update recipe_ingredients set quantity=31 where id='35340291-bba4-43ea-9a4d-38b79b809618'");
    const before = await state();
    await expect(db.exec(rollback)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
    await db.exec("update recipe_ingredients set quantity=30 where id='35340291-bba4-43ea-9a4d-38b79b809618'");
    await db.exec(rollback); expect(await state()).toEqual(original);
  });
  it('rejects a concurrent step change before applying any patch', async () => {
    await db.query('update recipe_steps set text=text||$1 where recipe_id=$2 and step_no=1', [' edited', patches[2].before.id]);
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
  });
});
