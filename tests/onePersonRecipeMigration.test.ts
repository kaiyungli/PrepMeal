import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../supabase/migrations/20261029052157_enforce_one_person_recipe_basis.sql', import.meta.url), 'utf8');

describe('one-person recipe database boundary', () => {
  it('blocks raw inserts and updates to multiple people without modifying stored inputs', async () => {
    const db = new PGlite();
    try {
      await db.exec('create table recipes (id int primary key, base_servings int not null default 1, amount numeric, source_data jsonb); insert into recipes (id,base_servings,amount) values (1,1,150);');
      await db.exec(sql);
      await db.exec('insert into recipes (id,amount) values (2,80);');
      await expect(db.exec('insert into recipes (id,base_servings,amount) values (3,2,300);')).rejects.toThrow();
      await expect(db.exec('update recipes set base_servings=4 where id=1;')).rejects.toThrow();
      await expect(db.exec(`update recipes set source_data='{"base_servings":2}' where id=1;`)).rejects.toThrow();
      await expect(db.exec(`update recipes set source_data='{"nutrition":{"servings":2}}' where id=1;`)).rejects.toThrow();
      await db.exec(`update recipes set source_data='{"base_servings":1,"nutrition":{"servings":1},"history":{"base_servings":4}}' where id=1;`);
      expect((await db.query('select base_servings,amount from recipes where id=1')).rows).toEqual([{ base_servings: 1, amount: '150' }]);
    } finally { await db.close(); }
  });
  it('refuses to validate a catalogue that still contains a multi-person original', async () => {
    const db = new PGlite();
    try {
      await db.exec('create table recipes (base_servings int not null, source_data jsonb); insert into recipes (base_servings) values (2);');
      await expect(db.exec(sql)).rejects.toThrow();
      expect((await db.query('select base_servings from recipes')).rows).toEqual([{ base_servings: 2 }]);
    } finally { await db.close(); }
  });
});
