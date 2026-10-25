import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { isRecipeHighProtein,isRecipeLowFat,isRecipeLowCalorie } from '../src/constants/nutritionRules';
const ledger=JSON.parse(readFileSync('docs/qa/remaining31-repair-20261025.json','utf8'));
const sql=readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.endsWith('_resolve_remaining_recipe_records.sql'))}`,'utf8');
type Ingredient={id:string|null;slug:string;quantity:number;unit:string;optional:boolean;note:string|null};
type Recipe={id:string;slug:string;name:string;description:string;calories_per_serving:number;protein_g:number;carbs_g:number;fat_g:number;diet:string[];flavor:string[];protein:string[];primary_protein:string;dish_type:string;is_complete_meal:boolean;source_data:Record<string,unknown>};
type Row={recipe:Recipe;ingredients:Ingredient[];steps:{id:string;text:string;step_no:number}[]};
const before=ledger.before as Row[],after=ledger.after as Row[];
async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE TABLE recipes(id uuid primary key,slug text unique,is_public boolean default true,name text,description text,calories_per_serving integer,protein_g numeric,carbs_g numeric,fat_g numeric,diet text[],flavor text[],protein text[],primary_protein text,source_data jsonb,updated_at timestamptz);
 CREATE TABLE ingredients(id uuid primary key default gen_random_uuid(),slug text unique,name text,name_en text,name_zh text,shopping_category text,is_active boolean default true,is_pantry_default boolean,aliases text[]);
 CREATE TABLE units(id uuid primary key default gen_random_uuid(),code text unique);
 CREATE TABLE recipe_ingredients(id uuid primary key default gen_random_uuid(),recipe_id uuid references recipes,ingredient_id uuid references ingredients,quantity numeric,unit_id uuid references units,is_optional boolean,prep_note text);
 CREATE TABLE recipe_steps(id uuid primary key,recipe_id uuid references recipes,step_no integer,text text);`);
 for(const slug of new Set([...before,...after].flatMap(a=>a.ingredients.map(i=>i.slug)).filter(s=>s!=='pasteurised-egg')))await db.query('INSERT INTO ingredients(slug) VALUES($1)',[slug]);
 for(const code of new Set([...before,...after].flatMap(a=>a.ingredients.map(i=>i.unit))))await db.query('INSERT INTO units(code) VALUES($1)',[code]);
 for(const row of before){
 const r=row.recipe;
 await db.query('INSERT INTO recipes(id,slug,name,description,calories_per_serving,protein_g,carbs_g,fat_g,diet,flavor,protein,primary_protein,source_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[r.id,r.slug,r.name,r.description,r.calories_per_serving,r.protein_g,r.carbs_g,r.fat_g,r.diet,r.flavor,r.protein,r.primary_protein,JSON.stringify(r.source_data)]);
 for(const i of row.ingredients)await db.query('INSERT INTO recipe_ingredients SELECT $1,$2,i.id,$3,u.id,$4,$5 FROM ingredients i CROSS JOIN units u WHERE i.slug=$6 AND u.code=$7',[i.id,r.id,i.quantity===1/3?'0.33333333333333333333':i.quantity,i.optional,i.note,i.slug,i.unit]);
 for(const s of row.steps)await db.query('INSERT INTO recipe_steps VALUES($1,$2,$3,$4)',[s.id,r.id,s.step_no,s.text]);
 }
 return db;
}
it('repairs all 31 atomically, preserves identities, and provides shopping ingredients with correct units',async()=>{
 const db=await setup();try{
 await db.exec(sql);
 for(const a of after){
 const r=(await db.query<Recipe>('SELECT *,protein_g::float8 AS protein_g,carbs_g::float8 AS carbs_g,fat_g::float8 AS fat_g FROM recipes WHERE slug=$1',[a.recipe.slug])).rows[0];
 for(const key of ['id','name','description','calories_per_serving','protein_g','carbs_g','fat_g','diet','flavor','protein','primary_protein','source_data'] as const)expect(r[key]).toEqual(a.recipe[key]);
 const ingredients=(await db.query<Ingredient>('SELECT i.slug,ri.quantity::float8 AS quantity,u.code AS unit,ri.is_optional AS optional,ri.prep_note AS note FROM recipe_ingredients ri JOIN ingredients i ON i.id=ri.ingredient_id JOIN units u ON u.id=ri.unit_id WHERE ri.recipe_id=$1 ORDER BY i.slug',[r.id])).rows;
 expect(ingredients).toEqual(a.ingredients.map(({slug,quantity,unit,optional,note})=>({slug,quantity,unit,optional,note})).sort((a,b)=>a.slug.localeCompare(b.slug)));
 for(const s of a.steps)expect((await db.query<{text:string}>('SELECT text FROM recipe_steps WHERE id=$1',[s.id])).rows[0].text).toBe(s.text);
 }
 expect((await db.query('SELECT id FROM recipes')).rows).toHaveLength(31);
 await expect(db.exec(sql)).rejects.toThrow('precondition changed');
 }finally{await db.close();}
},30000);
it('rejects concurrent ingredient edits and rolls the entire batch back',async()=>{
 const db=await setup();try{
 await db.query('UPDATE recipe_ingredients SET quantity=999 WHERE id=$1',[before.at(-1)!.ingredients[0].id]);
 await expect(db.exec(sql)).rejects.toThrow('Ingredient precondition changed');
 expect((await db.query<{name:string}>('SELECT name FROM recipes WHERE slug=$1',[before[0].recipe.slug])).rows[0].name).toBe(before[0].recipe.name);
 expect((await db.query("SELECT 1 FROM recipes WHERE source_data ? 'repair_20261025'")).rows).toHaveLength(0);
 expect((await db.query("SELECT 1 FROM ingredients WHERE slug='pasteurised-egg'")).rows).toHaveLength(0);
 }finally{await db.close();}
},30000);
it('estimates every required ingredient once, excludes options, and removes unsupported nutrition claims',()=>{
 expect(after).toHaveLength(31);
 for(const a of after){
 const r=a.recipe;
 const n=r.source_data.nutrition as {components:{ingredient:string;nutrition_basis_amount:number;profile:{values:Record<string,number>};contribution:Record<string,number>}[];unrounded_totals:Record<string,number>};
 expect(n.components.map(c=>c.ingredient).sort()).toEqual(a.ingredients.filter(i=>!i.optional).map(i=>i.slug).sort());
 for(const k of ['kcal','protein_g','fat_g','carbs_g']){
 const total=n.components.reduce((sum,c)=>sum+c.nutrition_basis_amount/100*c.profile.values[k],0);
 expect(total).toBeCloseTo(n.unrounded_totals[k],8);
 expect(k==='kcal'?r.calories_per_serving:r[k as 'protein_g']).toBe(k==='kcal'?Math.round(total):Math.round(total*10)/10);
 }
 if(r.diet.includes('high_protein'))expect(isRecipeHighProtein(r)).toBe(true);
 if(r.diet.includes('low_fat'))expect(isRecipeLowFat(r)).toBe(true);
 if(r.diet.includes('low_calorie'))expect(isRecipeLowCalorie(r)).toBe(true);
 expect((r.source_data.consistency_review as {original_source_verified:boolean}).original_source_verified).toBe(false);
 }
 const find=(s:string)=>after.find(a=>a.recipe.slug===s)!;
 expect(find('minced-pork-with-green-beans').ingredients.find(i=>i.slug==='minced-pork')?.quantity).toBe(88);
 expect(find('sesame-oil-mushroom-chicken-rice').ingredients.map(i=>i.slug)).toEqual(expect.arrayContaining(['rice','boneless-chicken-thigh']));
 expect(find('cold-seaweed-xhs').ingredients.map(i=>i.slug)).not.toContain('seaweed');
 expect(find('carbonara-pasta').ingredients.map(i=>i.slug)).toContain('pasteurised-egg');
 expect(find('garlic-chicken-wings').ingredients.find(i=>i.slug==='chicken-wings')?.quantity).toBe(150);
});
