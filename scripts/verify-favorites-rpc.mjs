// Isolated PostgreSQL (PGlite) validation; never connects to a hosted project.
// Install PGlite in a scratch directory, then set PGLITE_MODULE to its index.js.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const api = readFileSync(new URL('src/pages/api/user/favorites/index.js', root), 'utf8');
const fields = api.match(/recipes \(\s*([\s\S]*?)\s*\)/)[1].split(',').map(s => s.trim());
const ints = new Set(['prep_time_minutes','cook_time_minutes','total_time_minutes','calories_per_serving','times_shown']);
const nums = new Set(['protein_g','carbs_g','fat_g']);
const arrays = new Set(['diet','flavor']);
const type = f => f === 'id' ? 'uuid PRIMARY KEY' : f === 'created_at' ? 'timestamptz' :
  f === 'is_complete_meal' ? 'boolean' : ints.has(f) ? 'integer' : nums.has(f) ? 'numeric' : arrays.has(f) ? 'text[]' : 'text';
const A='00000000-0000-4000-8000-000000000001', B='00000000-0000-4000-8000-000000000002';
const R='00000000-0000-4000-8000-000000000011', S='00000000-0000-4000-8000-000000000012';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.recipes (${fields.map(f => f+' '+type(f)).join(',')});
CREATE TABLE public.user_favorites (user_id uuid, recipe_id uuid);
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_favorites, public.recipes TO service_role;
INSERT INTO public.recipes(id, name, diet, flavor, times_shown, protein_g, is_complete_meal)
VALUES ('${R}','fixture-A',ARRAY['vegan'],ARRAY['spicy'],7,12.34,true),('${S}','fixture-B',NULL,NULL,0,NULL,false);
INSERT INTO public.user_favorites VALUES ('${A}','${R}'), ('${A}','00000000-0000-4000-8000-000000000099'), ('${B}','${S}');`);
const migrations = new URL('supabase/migrations/', root);
const matches = readdirSync(migrations).filter(name => /^\d{14}_favorites_rpc_comparison\.sql$/.test(name));
assert.equal(matches.length, 1, 'exactly one comparison migration');
await db.exec(readFileSync(new URL(matches[0], migrations),'utf8'));
const meta = (await db.query(`SELECT prosecdef, provolatile, proconfig,
has_function_privilege('anon',oid,'EXECUTE') AS anon_exec,
has_function_privilege('authenticated',oid,'EXECUTE') AS auth_exec,
has_function_privilege('service_role',oid,'EXECUTE') AS service_exec
FROM pg_proc WHERE oid='public.get_favorites_recipes_comparison(uuid)'::regprocedure`)).rows[0];
assert.equal(meta.prosecdef,false); assert.equal(meta.provolatile,'s');
assert.deepEqual(meta.proconfig,['search_path=""']);
assert.equal(meta.anon_exec,false); assert.equal(meta.auth_exec,false); assert.equal(meta.service_exec,true);
for (const role of ['anon','authenticated']) {
  await db.exec('SET ROLE '+role);
  await assert.rejects(db.query('SELECT * FROM public.get_favorites_recipes_comparison($1)',[A]), /permission denied/);
  await db.exec('RESET ROLE');
}
await db.exec('SET ROLE service_role');
const get = async owner => (await db.query('SELECT * FROM public.get_favorites_recipes_comparison($1)',[owner])).rows;
const a=await get(A), b=await get(B);
assert.equal(a.length,2); assert.equal(b.length,1); assert.equal(b[0].recipe_id,S);
assert.equal(a.find(x=>x.recipe_id.endsWith('0099')).recipes,null);
const recipe=a.find(x=>x.recipe_id===R).recipes;
assert.deepEqual(Object.keys(recipe).sort(),fields.slice().sort());
assert.equal(recipe.protein_g,12.34); assert.deepEqual(recipe.diet,['vegan']);
assert.deepEqual(recipe.flavor,['spicy']); assert.equal(recipe.times_shown,7);
assert.equal(recipe.is_complete_meal,true);
assert.equal(b[0].recipes.diet,null);
assert.deepEqual(await get('00000000-0000-4000-8000-000000000088'),[]);
assert.deepEqual(await get(null),[]);
// Compare the full baseline nested REST SQL shape on the same fixtures.
for (const owner of [A,B]) {
 const old = (await db.query(`SELECT f.recipe_id,row_to_json(recipe.*)::jsonb AS recipes
 FROM public.user_favorites f LEFT JOIN LATERAL
 (SELECT ${fields.map(f=>'r.'+f).join(',')} FROM public.recipes r WHERE r.id=f.recipe_id LIMIT NULL OFFSET 0)
 AS recipe ON true WHERE f.user_id=$1 LIMIT NULL OFFSET 0`,[owner])).rows;
 const sort = rows => rows.sort((x,y)=>x.recipe_id.localeCompare(y.recipe_id));
 assert.deepEqual(sort(await get(owner)),sort(old));
}
await db.exec('RESET ROLE'); await db.close();
console.log('PASS: actual PostgreSQL migration, invoker/ACL, both client-role denials, user isolation, empty/null/missing join, full projection and baseline parity');
