import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261104092100_egg_rows_to_count.sql', 'utf8');
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE ingredients(id uuid PRIMARY KEY, slug text UNIQUE);
    CREATE TABLE units(id uuid PRIMARY KEY, code text UNIQUE, unit_type text);
    CREATE TABLE recipe_ingredients(id uuid PRIMARY KEY, ingredient_id uuid, unit_id uuid, quantity numeric, prep_note text, is_optional boolean);
    INSERT INTO ingredients VALUES ('${id(1)}','egg'),('${id(2)}','raw-egg-white');
    INSERT INTO units VALUES ('${id(10)}','g','mass'),('${id(11)}','egg','count');
    INSERT INTO recipe_ingredients VALUES
      ('${id(20)}','${id(1)}','${id(10)}',25,'約半隻',false),
      ('${id(21)}','${id(1)}','${id(10)}',50,'去殼後稱重',true),
      ('${id(22)}','${id(1)}','${id(10)}',75,null,false),
      ('${id(23)}','${id(1)}','${id(11)}',2,null,false),
      ('${id(24)}','${id(2)}','${id(10)}',30,null,false);
  `);
}, 30000);
afterAll(async () => { await db?.close(); });

it('converts shelled egg grams to eggs at 50 g each, leaving other rows alone', async () => {
  await db.exec(sql);
  await db.exec(sql); // idempotent: converted rows are no longer in grams
  const rows = (await db.query<{ id: string; code: string; quantity: string; prep_note: string | null; is_optional: boolean }>(
    `SELECT ri.id, u.code, ri.quantity::float::text AS quantity, ri.prep_note, ri.is_optional
     FROM recipe_ingredients ri JOIN units u ON u.id = ri.unit_id ORDER BY ri.id`)).rows;
  expect(rows).toEqual([
    { id: id(20), code: 'egg', quantity: '0.5', prep_note: '約半隻', is_optional: false },
    { id: id(21), code: 'egg', quantity: '1', prep_note: '去殼後稱重', is_optional: true },
    { id: id(22), code: 'egg', quantity: '1.5', prep_note: null, is_optional: false },
    { id: id(23), code: 'egg', quantity: '2', prep_note: null, is_optional: false },
    { id: id(24), code: 'g', quantity: '30', prep_note: null, is_optional: false },
  ]);
});
