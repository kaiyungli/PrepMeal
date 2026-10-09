import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildRecipeAtomicParams } from '@/lib/adminRecipeAtomicParams';

// Embedded PostgreSQL only: no network, credentials or Production connection.
// Use the actual baseline table definitions and canonical create function.
const root = path.resolve(__dirname, '..');
const db = new PGlite();
const metadata = { protein: ['fish', 'custom-tag'], diet: [], flavor: ['savory'], protein_g: 21.5, carbs_g: null, fat_g: 0, total_time_minutes: 40 };
const ingredientId = '00000000-0000-0000-0000-000000000001';
const unitId = '00000000-0000-0000-0000-000000000002';
const params = (slug: string) => {
  const built = buildRecipeAtomicParams({ name: 'Fish', slug, cuisine: 'chinese', dish_type: 'main', difficulty: 'easy', ingredients: [{ ingredient_id: ingredientId, unit_id: unitId, quantity: 2 }], steps: [{ step_no: 1, text: 'Cook', time_seconds: 30 }] });
  if ('error' in built) throw new Error(built.error);
  return built.params;
};
const importRecipe = (slug: string, data: unknown = metadata) => db.query<{ result: { recipe: Record<string, unknown> } }>('select public.admin_import_recipe_atomic_v2($1::jsonb, $2::jsonb) as result', [JSON.stringify(params(slug)), JSON.stringify(data)]);

beforeAll(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  const baseline = fs.readFileSync(path.join(root, 'supabase/migrations/20260904060000_baseline_core_recipe_catalog_schema.sql'), 'utf8');
  for (const table of ['ingredients', 'units', 'recipes', 'recipe_ingredients', 'recipe_steps']) {
    const match = baseline.match(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table} \\([\\s\\S]*?\\n\\);`));
    if (!match) throw new Error(`Missing baseline table ${table}`);
    await db.exec(match[0]);
  }
  await db.query('insert into ingredients (id, name, slug) values ($1, $2, $3)', [ingredientId, 'Fish', 'fish']);
  await db.query("insert into units (id, name, code, unit_type, to_base) values ($1, $2, $3, 'mass', 1)", [unitId, 'Gram', 'g']);
  const canonical = fs.readFileSync(path.join(root, 'supabase/migrations/20260910060642_reconcile_admin_recipe_rpc_contract.sql'), 'utf8');
  const create = canonical.match(/CREATE OR REPLACE FUNCTION public\.admin_create_recipe_atomic\([\s\S]*?\n\$fn\$;/);
  if (!create) throw new Error('Missing canonical create');
  await db.exec(create[0]);
  const migration = fs.readdirSync(path.join(root, 'supabase/migrations')).find((name) => name.endsWith('_admin_import_recipe_metadata_v2.sql'))!;
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', migration), 'utf8'));
}, 20000);
afterAll(() => db.close());

describe('atomic v2 SQL import', () => {
  it('persists tags, nullable/zero/decimal nutrition, time and children', async () => {
    const result = await importRecipe('round-trip');
    expect(result.rows[0].result.recipe).toMatchObject(metadata);
    const children = await db.query<{ quantity: string }>('select quantity from recipe_ingredients where recipe_id = $1', [result.rows[0].result.recipe.id]);
    expect(Number(children.rows[0].quantity)).toBe(2);
  });
  it('rejects invalid metadata and leaves no recipe', async () => {
    await expect(importRecipe('bad-tags', { ...metadata, protein: [null] })).rejects.toThrow(/Invalid tag/);
    const count = await db.query<{ n: number }>("select count(*)::int as n from recipes where slug = 'bad-tags'");
    expect(count.rows[0].n).toBe(0);
  });
  it('rolls back recipe and both child tables if metadata update fails after create', async () => {
    // A disposable constraint forces a failure specifically in the second write.
    await db.exec("alter table recipes add constraint test_metadata_failure check (slug <> 'rollback' or protein_g is null or protein_g < 20)");
    try {
      await expect(importRecipe('rollback')).rejects.toThrow(/test_metadata_failure/);
      const counts = await db.query<{ recipes: number; ingredients: number; steps: number }>(`select
        (select count(*)::int from recipes where slug='rollback') as recipes,
        (select count(*)::int from recipe_ingredients) as ingredients,
        (select count(*)::int from recipe_steps) as steps`);
      expect(counts.rows[0]).toEqual({ recipes: 0, ingredients: 1, steps: 1 });
    } finally { await db.exec('alter table recipes drop constraint test_metadata_failure'); }
  });
  it('preserves empty tags and all nullable metadata', async () => {
    const empty = { protein: [], diet: [], flavor: [], protein_g: null, carbs_g: null, fat_g: null, total_time_minutes: null };
    expect((await importRecipe('empty-metadata', empty)).rows[0].result.recipe).toMatchObject(empty);
  });
  it.each([
    { ...metadata, protein_g: -1 },
    { ...metadata, carbs_g: '20' },
    { ...metadata, total_time_minutes: 1.5 },
    { ...metadata, total_time_minutes: 2147483648 },
  ])('rejects malformed numeric metadata %# at the SQL boundary', async (invalid) => {
    await expect(importRecipe('invalid-number', invalid)).rejects.toThrow();
  });
  it('allows service_role only and uses SECURITY INVOKER with a pinned search_path', async () => {
    const result = await db.query<{ anon: boolean; authenticated: boolean; service: boolean; definer: boolean; config: string[] }>(`select
      has_function_privilege('anon', oid, 'execute') as anon,
      has_function_privilege('authenticated', oid, 'execute') as authenticated,
      has_function_privilege('service_role', oid, 'execute') as service,
      prosecdef as definer, proconfig as config
      from pg_proc where proname='admin_import_recipe_atomic_v2'`);
    expect(result.rows[0]).toEqual({ anon: false, authenticated: false, service: true, definer: false, config: ['search_path=pg_catalog, public, pg_temp'] });
  });
});
