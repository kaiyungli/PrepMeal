import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { editorialRecipeFingerprint } from '@/features/recipes/mappers/recipeEditorialGuidance';
import { normalizeRecipeDetail } from '@/features/recipes/mappers/normalizeRecipeDetail';
import type { RecipeDetailRow } from '@/features/recipes/services/getRecipeDetail';

const root = 'docs/qa/recipe-review-next-thirty/cream-seasoning/';
const patch = JSON.parse(readFileSync(root + 'data-patch.json', 'utf8'));
const apply = readFileSync(root + 'apply.sql', 'utf8');
const rollback = readFileSync(root + 'rollback.sql', 'utf8');
const quote = (v: unknown) => "'" + JSON.stringify(v).replaceAll("'", "''") + "'::jsonb";
let db: PGlite;
const sqlType = (v: unknown) => typeof v === 'boolean' ? 'boolean' : typeof v === 'number' ? 'numeric' : typeof v === 'object' && v !== null ? 'jsonb' : 'text';
async function seed(table: string, rows: Record<string, unknown>[]) {
  await db.exec(`create table ${table} (${Object.entries(rows[0]).map(([key, value]) => `"${key}" ${sqlType(value)}`).join(',')})`);
  // IDs are UUIDs in the hosted schema and must exercise the same casts.
  for (const key of ['id', 'recipe_id', 'ingredient_id', 'unit_id']) if (key in rows[0]) {
    await db.exec(`alter table ${table} alter column ${key} type uuid using ${key}::uuid`);
  }
  await db.exec(`insert into ${table} select * from jsonb_populate_recordset(null::${table},${quote(rows)})`);
}
async function state() {
  return (await db.query(`select
    (select jsonb_agg(to_jsonb(r)) from recipes r) recipe,
    (select jsonb_agg(to_jsonb(i) order by id) from recipe_ingredients i) ingredients,
    (select jsonb_agg(to_jsonb(s) order by id) from recipe_steps s) steps`)).rows;
}
let original: unknown;
beforeAll(async () => {
  db = new PGlite();
  await seed('recipes', [patch.before.recipe]);
  await seed('recipe_ingredients', patch.before.ingredients);
  await seed('recipe_steps', patch.before.steps);
  original = await state();
}, 30000);
afterAll(async () => { await db?.close(); });

describe.sequential('approved cream rice seasoning reference reformulation', () => {
  it('binds old and new fingerprints to exact material and step inputs', () => {
    for (const side of [patch.before, patch.after]) {
      const r = { ...side.recipe, ingredients: side.ingredients.map((i: { id: string; ingredient_id: string }) => {
        const m = patch.ingredientMetadata[i.id];
        return { ...i, id: i.ingredient_id, name: m.ingredient.name, unit: m.unit };
      }), steps: side.steps } as RecipeDetailRow;
      expect(editorialRecipeFingerprint(r)).toBe(side.recipe.source_data.editorial_guidance.source_fingerprint);
      expect(normalizeRecipeDetail(r).cooking_tips).toEqual(side.recipe.source_data.editorial_guidance.cooking_tips);
    }
  });
  it('recomputes full-listed-input nutrition from existing evidence and keeps the stated rounding', () => {
    const r = patch.after.recipe;
    expect([r.calories_per_serving, r.protein_g, r.carbs_g, r.fat_g]).toEqual([839, 40.2, 80.8, 39.2]);
    for (const k of ['kcal', 'protein_g', 'carbs_g', 'fat_g']) {
      const total = r.source_data.nutrition.components.reduce((sum: number, c: { nutrition_amount: number; per_100: Record<string, number>; contribution: Record<string, number> }) => {
        expect(c.contribution[k]).toBeCloseTo(c.nutrition_amount * c.per_100[k] / 100, 10);
        return sum + c.nutrition_amount * c.per_100[k] / 100;
      }, 0);
      expect(r.source_data.nutrition.unrounded_totals[k]).toBeCloseTo(total, 10);
    }
    for (const c of r.source_data.nutrition.components) {
      const old = patch.before.recipe.source_data.nutrition.components.find((x: { ingredient: string }) => x.ingredient === c.ingredient);
      expect(c.per_100).toEqual(old.per_100); expect(c.source_url).toBe(old.source_url); expect(c.conversion).toBe(old.conversion);
    }
    expect(r.source_data.nutrition.limitations.at(-1)).toContain('全份鹽及黑胡椒');
  });
  it('applies only the approved child values and recipe ledger, preserving unrelated fields and live view counts', async () => {
    await db.exec('update recipes set times_shown=7');
    await db.exec(apply);
    const r = (await db.query<{ recipe: Record<string, unknown> }>('select to_jsonb(r) recipe from recipes r')).rows[0].recipe;
    const expected = { ...patch.after.recipe, times_shown: 7 };
    expect(r).toEqual(expected);
    expect((await db.query<{ row: unknown }>('select to_jsonb(i) row from recipe_ingredients i order by id')).rows.map(x => x.row)).toEqual(patch.after.ingredients);
    expect((await db.query<{ row: unknown }>('select to_jsonb(s) row from recipe_steps s order by id')).rows.map(x => x.row)).toEqual(patch.after.steps);
  });
  it('refuses repeated apply without partial changes', async () => {
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
  });
  it('rolls back exact material quantities, step identities, nutrition and source metadata', async () => {
    await db.exec(rollback);
    await db.exec('update recipes set times_shown=0');
    expect(await state()).toEqual(original);
  });
  it('refuses later edits on rollback', async () => {
    await db.exec(apply);
    await db.exec("update recipe_steps set text=text||' changed' where step_no=6");
    const before = await state();
    await expect(db.exec(rollback)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
    await db.query('update recipe_steps set text=$1 where step_no=6', [patch.after.steps.find((s: { step_no: number }) => s.step_no === 6).text]);
    await db.exec(rollback);
  });
  it('refuses stale ingredient input before any write', async () => {
    await db.exec("update recipe_ingredients set quantity=quantity+1 where ingredient_id='92a6a27a-ad0b-4375-b166-935d7455c9ff'");
    const before = await state();
    await expect(db.exec(apply)).rejects.toThrow(/precondition changed/);
    await db.exec('ROLLBACK'); expect(await state()).toEqual(before);
  });
});
