import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it } from 'vitest';

// The migration was checked against a copy of every affected production row
// (822 rows, 117 steps, 24 notes, matching hashes). These tests cover its
// guards: it never applies part of the change, and re-running it is a no-op.
const sql = readFileSync('supabase/migrations/20261104122554_unify_ingredient_units.sql', 'utf8');
const STEP = 'd28fc96e-9b57-4af9-8841-815baeae11fa';
const ROW = '22edbe87-6070-4db2-bc72-f382546b7c2f';
let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE units(id uuid PRIMARY KEY, code text UNIQUE);
    CREATE TABLE ingredients(id uuid PRIMARY KEY, slug text UNIQUE);
    CREATE TABLE recipes(id uuid PRIMARY KEY, is_public boolean);
    CREATE TABLE recipe_ingredients(id uuid PRIMARY KEY, recipe_id uuid, ingredient_id uuid, unit_id uuid, quantity numeric, prep_note text);
    CREATE TABLE recipe_steps(id uuid PRIMARY KEY, text text);
    INSERT INTO units VALUES ('00000000-0000-4000-8000-000000000001','g'), ('00000000-0000-4000-8000-000000000002','tsp');
    INSERT INTO ingredients VALUES ('00000000-0000-4000-8000-000000000011','american-yellow-mustard');
    INSERT INTO recipes VALUES ('00000000-0000-4000-8000-000000000021', true);
    INSERT INTO recipe_ingredients VALUES ('${ROW}','00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001',2.5,null);
    INSERT INTO recipe_steps VALUES ('${STEP}', '加入生抽6克，快速拌勻。');
  `);
}, 30000);
afterEach(async () => { await db?.close(); });

const state = async () => ({
  row: (await db.query<{ code: string; quantity: number }>(`SELECT u.code, ri.quantity::float AS quantity FROM recipe_ingredients ri JOIN units u ON u.id = ri.unit_id`)).rows,
  step: (await db.query<{ text: string }>('SELECT text FROM recipe_steps')).rows,
});

it('changes nothing when the data is not exactly what was reviewed', async () => {
  const before = await state();
  await expect(db.exec(sql)).rejects.toThrow(/Expected 822 recipe ingredient rows to change, found 1/);
  expect(await state()).toEqual(before);
});

it('does nothing when the units were already unified', async () => {
  await db.exec(`UPDATE recipe_steps SET text = '加入生抽1茶匙，快速拌勻。'`);
  const before = await state();
  await db.exec(sql);
  expect(await state()).toEqual(before);
});
