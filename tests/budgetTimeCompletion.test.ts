import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { expect,it } from 'vitest';
import { matchesBudgetPreference,preferBudgetRecipes } from '@/features/generate/engine/budgetPreference';
import { recipeProvenance } from '@/features/recipes/mappers/recipeProvenance';
type State={budget_level:string|null;prep_time_minutes:number|null;cook_time_minutes:number|null;total_time_minutes:number};
type Patch={id:string;slug:string;name:string;before:State;after:State;ingredients:{slug:string;quantity:number;unit:string;optional:boolean}[];steps:{step_no:number;text:string;time_seconds:number|null}[];time_public_note:string|null};
const patches:Patch[]=JSON.parse(readFileSync('docs/qa/budget-time-completion-20261025.json','utf8'));
const sql=readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.endsWith('_complete_recipe_budget_time_fields.sql'))}`,'utf8');
const source={nutrition:{status:'reference_based_estimate',components:['preserve nutrition evidence']},consistency_review:{status:'preserve',public_notes:['previous source warning']},other:['preserve']};
async function setup(){
 const db=new PGlite();await db.exec(`CREATE TABLE recipes(id uuid primary key,slug text unique,is_public boolean default true,budget_level text,prep_time_minutes integer,cook_time_minutes integer,total_time_minutes integer,source_data jsonb,updated_at timestamptz,name text default 'preserve',image_url text default 'approved.jpg',calories_per_serving integer default 123,diet text[] default ARRAY['preserve']);
 CREATE TABLE ingredients(id uuid primary key default gen_random_uuid(),slug text unique);CREATE TABLE units(id uuid primary key default gen_random_uuid(),code text unique);
 CREATE TABLE recipe_ingredients(recipe_id uuid,ingredient_id uuid,unit_id uuid,quantity numeric,is_optional boolean,prep_note text default 'preserve note');
 CREATE TABLE recipe_steps(recipe_id uuid,step_no integer,text text,time_seconds integer);`);
 for(const s of new Set(patches.flatMap(p=>p.ingredients.map(i=>i.slug))))await db.query('INSERT INTO ingredients(slug) VALUES($1)',[s]);
 for(const u of new Set(patches.flatMap(p=>p.ingredients.map(i=>i.unit))))await db.query('INSERT INTO units(code) VALUES($1)',[u]);
 for(const p of patches){const b=p.before;
 await db.query('INSERT INTO recipes(id,slug,budget_level,prep_time_minutes,cook_time_minutes,total_time_minutes,source_data) VALUES($1,$2,$3,$4,$5,$6,$7)',[p.id,p.slug,b.budget_level,b.prep_time_minutes,b.cook_time_minutes,b.total_time_minutes,JSON.stringify(source)]);
 for(const i of p.ingredients)await db.query('INSERT INTO recipe_ingredients(recipe_id,ingredient_id,unit_id,quantity,is_optional) SELECT $1,g.id,u.id,$2,$3 FROM ingredients g CROSS JOIN units u WHERE g.slug=$4 AND u.code=$5',[p.id,i.quantity===1/3?'0.33333333333333333333':i.quantity,i.optional,i.slug,i.unit]);
 for(const s of p.steps)await db.query('INSERT INTO recipe_steps VALUES($1,$2,$3,$4)',[p.id,s.step_no,s.text,s.time_seconds]);
 }return db;
}
it('completes all 47 records atomically without changing totals, nutrition, ingredients or methods',async()=>{
 const db=await setup();try{
 const untouched=(await db.query("SELECT to_jsonb(r)-'budget_level'-'prep_time_minutes'-'cook_time_minutes'-'source_data'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows;
 const ingredients=(await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id,ingredient_id')).rows;const steps=(await db.query('SELECT * FROM recipe_steps ORDER BY recipe_id,step_no')).rows;
 await db.exec(sql);
 expect((await db.query("SELECT to_jsonb(r)-'budget_level'-'prep_time_minutes'-'cook_time_minutes'-'source_data'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows).toEqual(untouched);
 expect((await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id,ingredient_id')).rows).toEqual(ingredients);expect((await db.query('SELECT * FROM recipe_steps ORDER BY recipe_id,step_no')).rows).toEqual(steps);
 for(const p of patches){
 expect((await db.query<State>('SELECT budget_level,prep_time_minutes,cook_time_minutes,total_time_minutes FROM recipes WHERE id=$1',[p.id])).rows[0]).toEqual(p.after);
 const sd=(await db.query<{source_data:Record<string,unknown>}>('SELECT source_data FROM recipes WHERE id=$1',[p.id])).rows[0].source_data;
 expect(sd.nutrition).toEqual(source.nutrition);expect(sd.other).toEqual(source.other);
 const notes=recipeProvenance(sd).data_quality_notes!;expect(notes).toEqual(p.time_public_note?[...source.consistency_review.public_notes,p.time_public_note]:source.consistency_review.public_notes);
 }
 await expect(db.exec(sql)).rejects.toThrow('Recipe precondition changed');
 }finally{await db.close();}
},30000);
it('rolls back earlier repairs when a reviewed cooking instruction changed',async()=>{
 const db=await setup();try{
 await db.query("UPDATE recipe_steps SET text='concurrent edit' WHERE recipe_id=$1 AND step_no=1",[patches.at(-1)!.id]);
 await expect(db.exec(sql)).rejects.toThrow('Step precondition changed');
 expect((await db.query("SELECT 1 FROM recipes WHERE source_data ? 'budget_time_review_20261025'")).rows).toHaveLength(0);
 }finally{await db.close();}
},30000);
it('fills exactly the missing groups and preserves already classified values and total durations',()=>{
 expect(patches).toHaveLength(47);expect(patches.filter(p=>p.before.budget_level===null)).toHaveLength(31);expect(patches.filter(p=>p.before.prep_time_minutes===null)).toHaveLength(16);
 for(const p of patches){expect(['budget','normal','premium']).toContain(p.after.budget_level);expect(p.after.prep_time_minutes!+p.after.cook_time_minutes!).toBe(p.before.total_time_minutes);expect(p.after.total_time_minutes).toBe(p.before.total_time_minutes);
 if(p.before.budget_level!==null)expect(p.after.budget_level).toBe(p.before.budget_level);
 if(p.before.prep_time_minutes!==null){expect(p.after.prep_time_minutes).toBe(p.before.prep_time_minutes);expect(p.after.cook_time_minutes).toBe(p.before.cook_time_minutes);}
 }
 const find=(s:string)=>patches.find(p=>p.slug===s)!;
 expect(find('honey-chicken-wings').after).toMatchObject({prep_time_minutes:20,cook_time_minutes:15});expect(find('honey-chicken-wings').time_public_note).toContain('醃製15分鐘');
 expect(find('cucumber-vermicelli-salad').time_public_note).toContain('冷藏10分鐘');expect(find('curry-beef-brisket-rice').after.cook_time_minutes).toBe(80);expect(find('pan-fried-scallops').time_public_note).toContain('解凍時間不包括');
});
it('makes new budget classifications available to the real generator preference helpers',()=>{
 const recipes=patches.map(p=>({id:p.id,...p.after}));const preferred=preferBudgetRecipes(recipes,'budget');expect(preferred.length).toBeGreaterThan(0);expect(preferred.every(r=>matchesBudgetPreference(r,'budget'))).toBe(true);
 expect(preferred.some(r=>r.id===patches.find(p=>p.slug==='minced-pork-tofu')!.id)).toBe(true);expect(preferred.some(r=>r.id===patches.find(p=>p.slug==='garlic-beef-cubes-slices')!.id)).toBe(false);
 expect(preferBudgetRecipes(recipes,'normal')).toEqual(recipes);
});
