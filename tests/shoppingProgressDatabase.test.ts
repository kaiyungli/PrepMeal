import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const plan = '33333333-3333-4333-8333-333333333333';
const progress = JSON.stringify({ version: 1, items: {}, extras: [] });
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
    create table public.menu_plans(id uuid primary key, user_id uuid not null);
    alter table public.menu_plans enable row level security;
    create policy owner on public.menu_plans for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    grant select,insert,delete on public.menu_plans to authenticated;
    create function public.create_menu_plan_atomic(text,date,integer,jsonb) returns uuid language plpgsql security invoker as $$
    begin insert into public.menu_plans values ('${plan}', auth.uid()); return '${plan}'::uuid; end; $$;
  `);
  await db.exec(readFileSync('supabase/migrations/20261025194734_shopping_list_progress_v2.sql', 'utf8'));
}, 20000);
afterAll(async () => { await db.close(); });
const asUser = async (user: string) => { await db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`); };
describe('private shopping progress database', () => {
  it('atomically creates plan and progress; rolls back both on invalid progress', async () => {
    await asUser(owner);
    await expect(db.query(`select create_menu_plan_with_shopping('x','2026-10-26',3,'[]', '{}')`)).rejects.toThrow();
    expect((await db.query('select * from menu_plans')).rows).toEqual([]);
    await db.query(`select create_menu_plan_with_shopping('x','2026-10-26',3,'[]', $1)`, [progress]);
    expect((await db.query('select revision from menu_plan_shopping_progress')).rows).toEqual([{ revision: 1 }]);
  });
  it('denies other accounts and anonymous access', async () => {
    await asUser(other);
    expect((await db.query('select * from menu_plan_shopping_progress')).rows).toEqual([]);
    expect((await db.query(`update menu_plan_shopping_progress set revision=2 where plan_id='${plan}' returning revision`)).rows).toEqual([]);
    await expect(db.query(`insert into menu_plan_shopping_progress(plan_id) values('${plan}')`)).rejects.toThrow();
    await db.exec('reset role; set role anon;');
    await expect(db.query('select * from menu_plan_shopping_progress')).rejects.toThrow();
  });
  it('compare-and-swap rejects an outdated device revision and plan deletion cascades', async () => {
    await asUser(owner);
    expect((await db.query(`update menu_plan_shopping_progress set revision=2 where plan_id='${plan}' and revision=1 returning revision`)).rows).toEqual([{ revision: 2 }]);
    expect((await db.query(`update menu_plan_shopping_progress set revision=2 where plan_id='${plan}' and revision=1 returning revision`)).rows).toEqual([]);
    await db.exec(`delete from menu_plans where id='${plan}'; reset role;`);
    expect((await db.query('select * from menu_plan_shopping_progress')).rows).toEqual([]);
  });
});
