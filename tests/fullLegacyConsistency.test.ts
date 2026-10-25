import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
const sql=readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.endsWith('_complete_legacy_text_consistency.sql'))}`,'utf8');
type Patch={slug:string,step:number,old:string,text:string};
type Review={slug:string,source_before:unknown,pending:string[],changed_steps:Patch[]};
const ledger:Review[]=JSON.parse(readFileSync('docs/qa/full-legacy-consistency-20261025.json','utf8'));
async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE TABLE recipes(id serial primary key,slug text unique,is_public boolean default true,source_data jsonb,updated_at timestamptz,calories_per_serving int default 300); CREATE TABLE recipe_steps(recipe_id int references recipes,step_no int,text text); CREATE TABLE recipe_ingredients(recipe_id int,quantity numeric);`);
 for(const row of ledger){
  const id=(await db.query<{id:number}>('INSERT INTO recipes(slug,source_data) VALUES($1,$2) RETURNING id',[row.slug,row.source_before===null?null:JSON.stringify(row.source_before)])).rows[0].id;
  for(const p of row.changed_steps) await db.query('INSERT INTO recipe_steps VALUES($1,$2,$3)',[id,p.step,p.old]);
  await db.query('INSERT INTO recipe_ingredients VALUES($1,123.45)',[id]);
 }
 return db;
}
it('applies every reviewed step and preserves existing evidence, nutrition and amounts',async()=>{
 const db=await setup();try{
 const before=(await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id')).rows;
 await db.exec(sql);
 expect((await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id')).rows).toEqual(before);
 expect((await db.query<{n:number}>('SELECT count(*) AS n FROM recipes WHERE calories_per_serving<>300')).rows[0].n).toBe(0);
 for(const r of ledger){
  const source=(await db.query<{source_data:Record<string,unknown>}>('SELECT source_data FROM recipes WHERE slug=$1',[r.slug])).rows[0].source_data;
  if(r.source_before) expect(source).toMatchObject(r.source_before);
  expect(source.consistency_review).toBeTruthy();
  const steps=(await db.query<{step_no:number,text:string}>('SELECT s.* FROM recipe_steps s JOIN recipes r ON r.id=s.recipe_id WHERE r.slug=$1',[r.slug])).rows;
  for(const p of r.changed_steps) expect(steps.find(s=>s.step_no===p.step)?.text).toBe(p.text);
 }
 expect(ledger).toHaveLength(187);
 await expect(db.exec(sql)).rejects.toThrow('precondition changed');
 }finally{await db.close();}
},30000);
it('rolls back all recipe and step updates when any original step changed',async()=>{
 const db=await setup();try{
 await db.exec("UPDATE recipe_steps SET text='edited concurrently' WHERE recipe_id=(SELECT id FROM recipes WHERE slug='cold-tossed-baby-napa-cabbage') AND step_no=6;");
 await expect(db.exec(sql)).rejects.toThrow('Step precondition changed');
 expect((await db.query<{n:number}>("SELECT count(*) AS n FROM recipes WHERE source_data ? 'consistency_review'")).rows[0].n).toBe(0);
 const first=ledger.flatMap(r=>r.changed_steps)[0];
 expect((await db.query<{text:string}>('SELECT s.text FROM recipe_steps s JOIN recipes r ON r.id=s.recipe_id WHERE r.slug=$1 AND s.step_no=$2',[first.slug,first.step])).rows[0].text).toBe(first.old);
 }finally{await db.close();}
},30000);
