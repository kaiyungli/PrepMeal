import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261104100500_unify_ingredient_units.sql', 'utf8');
const UNITS = ['g', 'ml', 'tsp', 'tbsp', 'cup', 'pc', 'piece', 'clove', 'slice', 'stick', 'egg'];
const unitId = (i: number) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
const OTHER_ROW = '00000000-0000-4000-9000-000000000001';
const STEP = 'd28fc96e-9b57-4af9-8841-815baeae11fa';
let db: PGlite;

// Real row ids and values from the reviewed table.
const ROWS: Array<[string, string, number, string, number]> = [
  ['22edbe87-6070-4db2-bc72-f382546b7c2f', 'g', 2.5, 'tsp', 0.5],
  ['1393337e-189a-41da-8a04-12c96fab8b0b', 'pc', 0.125, 'g', 25],
  ['c44e8bfe-805e-4bb0-ba62-6842f6728790', 'g', 480, 'ml', 480],
  ['48c638aa-7aef-4fee-aa99-e3b9cb489930', 'g', 112.5, 'piece', 3],
  ['0cb6b4bf-6748-4986-9f32-05caca4d0398', 'tbsp', 0.3333333333333333, 'tsp', 1],
  ['8d5b1f2f-eaa2-4e5d-b78f-431fade5fe41', 'cup', 0.246875, 'tbsp', 4],
];

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE units(id uuid PRIMARY KEY, code text UNIQUE);
    CREATE TABLE recipe_ingredients(id uuid PRIMARY KEY, unit_id uuid, quantity numeric, prep_note text);
    CREATE TABLE recipe_steps(id uuid PRIMARY KEY, text text);
    INSERT INTO recipe_steps VALUES ('${STEP}', '加入生抽6克，快速拌勻。'), ('${OTHER_ROW}', '加入清水15毫升。');
    INSERT INTO units VALUES ${UNITS.map((c, i) => `('${unitId(i)}','${c}')`).join(',')};
    INSERT INTO recipe_ingredients VALUES
      ${ROWS.map(([id, code, q]) => `('${id}','${unitId(UNITS.indexOf(code))}',${q},'note')`).join(',')},
      ('${OTHER_ROW}','${unitId(0)}',12,null);
  `);
}, 30000);
afterEach(async () => { await db?.close(); });

const read = async () => (await db.query<{ id: string; code: string; quantity: number; prep_note: string | null }>(
  `SELECT ri.id, u.code, ri.quantity::float AS quantity, ri.prep_note FROM recipe_ingredients ri JOIN units u ON u.id = ri.unit_id ORDER BY ri.id`)).rows;

it('moves each listed row to its single unit, leaves other rows alone, and can run twice', async () => {
  await db.exec(sql);
  await db.exec(sql);
  const rows = await read();
  for (const [id, , , code, quantity] of ROWS) {
    expect(rows.find(r => r.id === id)).toEqual({ id, code, quantity, prep_note: 'note' });
  }
  expect(rows.find(r => r.id === OTHER_ROW)).toEqual({ id: OTHER_ROW, code: 'g', quantity: 12, prep_note: null });
  const steps = (await db.query<{ id: string; text: string }>('SELECT id, text FROM recipe_steps ORDER BY id')).rows;
  expect(steps).toEqual([
    { id: OTHER_ROW, text: '加入清水15毫升。' },
    { id: STEP, text: '加入生抽1茶匙，快速拌勻。' },
  ]);
});

it('refuses to overwrite a step whose text changed after review', async () => {
  await db.exec(`UPDATE recipe_steps SET text = '加入生抽7克。' WHERE id = '${STEP}'`);
  await expect(db.exec(sql)).rejects.toThrow(/changed since review/);
});

it('refuses to overwrite a row that changed after the table was reviewed', async () => {
  await db.exec(`UPDATE recipe_ingredients SET quantity = 3 WHERE id = '${ROWS[0][0]}'`);
  await expect(db.exec(sql)).rejects.toThrow(/expected 2.5 g/);
  expect((await read()).find(r => r.id === ROWS[1][0])?.code).toBe('pc');
});
