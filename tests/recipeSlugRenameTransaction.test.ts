import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { RECIPE_SLUG_RENAMES } from '@/constants/recipeSlugRenames';

const source = readFileSync('docs/qa/slug-rename-20261114/rename.sql', 'utf8');
const report = JSON.parse(readFileSync('docs/qa/slug-rename-20261114/preflight.json', 'utf8'));
type Row = { id: string; name: string; old_slug: string; new_slug: string; content_md5: string };
const rows: Row[] = [...report.rows].sort((a: Row, b: Row) => a.old_slug.localeCompare(b.old_slug));
let db: PGlite;
let sql: string;
let verifySql: string;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE recipes(id uuid PRIMARY KEY, name text NOT NULL, slug text UNIQUE, is_public boolean NOT NULL,
    updated_at timestamptz NOT NULL, times_shown integer, content text NOT NULL);
    CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now(); RETURN NEW; END$$;
    CREATE TRIGGER trg_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
  const fixtures = [];
  verifySql = readFileSync('docs/qa/slug-rename-20261114/verify.sql', 'utf8');
  for (const r of rows) {
    await db.query('INSERT INTO recipes VALUES ($1,$2,$3,true,$4,0,$5)', [r.id, r.name, r.old_slug, '2026-01-01Z', 'recipe-content']);
    const hash = await db.query<{ hash: string }>(`SELECT md5((to_jsonb(r)-'slug'-'updated_at'-'times_shown')::text) AS hash FROM recipes r WHERE id=$1`, [r.id]);
    fixtures.push({ ...r, content_md5: hash.rows[0].hash });
    verifySql = verifySql.replaceAll(r.content_md5, hash.rows[0].hash);
  }
  // Substitute only hashes for the synthetic schema; execute the exact reviewed SQL guards.
  sql = source.replace(/\$rename_payload\$[\s\S]*?\$rename_payload\$/, `$rename_payload$${JSON.stringify(fixtures)}$rename_payload$`);
  await db.exec(`INSERT INTO recipes VALUES ('00000000-0000-4000-8000-000000000001','unrelated','unrelated',false,'2026-01-01Z',0,'unrelated-content')`);
}, 30000);
afterEach(async () => { await db?.close(); });
type FixtureRow = { id: string; name: string; slug: string; is_public: boolean; updated_at: Date; times_shown: number; content: string };
const state = async () => (await db.query<FixtureRow>('SELECT * FROM recipes ORDER BY id')).rows;
async function rejectsUnchanged(pattern: RegExp) {
  const before = await state();
  await expect(db.exec(sql)).rejects.toThrow(pattern);
  await db.exec('ROLLBACK');
  expect(await state()).toEqual(before);
}

it('uses the exact 100 deployed mappings and IDs, renames atomically, preserves other fields and safely reruns', async () => {
  expect(Object.fromEntries(rows.map(r => [r.old_slug, r.new_slug]))).toEqual(RECIPE_SLUG_RENAMES);
  expect(new Set(rows.map(r => r.id)).size).toBe(100);
  const before = await state();
  const preflight = (await db.query<{ rename_state: Record<string, number> }>(verifySql)).rows[0].rename_state;
  expect(preflight).toMatchObject({old_rows: 100, new_rows: 0, missing_ids: 0, changed_rows: 0, collisions: 0});
  await db.exec(sql);
  const postflight = (await db.query<{ rename_state: Record<string, number> }>(verifySql)).rows[0].rename_state;
  expect(postflight).toMatchObject({old_rows: 0, new_rows: 100, missing_ids: 0, changed_rows: 0, collisions: 0});
  const after = await state();
  expect(after).toHaveLength(101);
  for (const row of after) {
    const old = before.find(r => r.id === row.id)!;
    const expected = rows.find(r => r.id === row.id);
    expect(row).toEqual(expected ? { ...old, slug: expected.new_slug, updated_at: row.updated_at } : old);
    if (expected) expect(row.updated_at).not.toEqual(old.updated_at);
  }
  await db.exec(sql);
  expect(await state()).toEqual(after);
});
it('rejects a target occupied by a private recipe without changing any row', async () => {
  await db.query(`UPDATE recipes SET slug=$1 WHERE slug='unrelated'`, [rows[0].new_slug]);
  await rejectsUnchanged(/Target occupied/);
});
it('rejects changed recipe content', async () => {
  await db.query(`UPDATE recipes SET content='changed' WHERE id=$1`, [rows[0].id]);
  await rejectsUnchanged(/reviewed content changed/);
});
it('rejects changed public visibility', async () => {
  await db.query('UPDATE recipes SET is_public=false WHERE id=$1', [rows[0].id]);
  await rejectsUnchanged(/visibility/);
});
it('rejects an unexpected ID or missing recipe', async () => {
  await db.query('DELETE FROM recipes WHERE id=$1', [rows[0].id]);
  await rejectsUnchanged(/identity/);
});
it('rejects a partial rename instead of continuing silently', async () => {
  await db.query('UPDATE recipes SET slug=$1 WHERE id=$2', [rows[0].new_slug, rows[0].id]);
  await rejectsUnchanged(/partial rename state/);
});
it('rolls back all slugs when a trigger changes unrelated content during the update', async () => {
  await db.exec(`CREATE FUNCTION damage_content() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.content='changed-by-trigger'; RETURN NEW; END$$;
    CREATE TRIGGER unexpected_change BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION damage_content();`);
  await rejectsUnchanged(/Post-update validation failed/);
});
it('tolerates a view-count update before execution without resetting that count', async () => {
  await db.query('UPDATE recipes SET times_shown=99 WHERE id=$1', [rows[0].id]);
  await db.exec(sql);
  const result = await db.query<{ times_shown: number }>('SELECT times_shown FROM recipes WHERE id=$1', [rows[0].id]);
  expect(result.rows[0].times_shown).toBe(99);
});
