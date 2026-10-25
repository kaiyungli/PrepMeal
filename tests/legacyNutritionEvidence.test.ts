import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { expect,it } from 'vitest';
import { isRecipeHighProtein,isRecipeLowFat,isRecipeLowCalorie } from '@/constants/nutritionRules';
import { recipeProvenance } from '@/features/recipes/mappers/recipeProvenance';
type Nutrients={kcal:number;protein_g:number;carbs_g:number;fat_g:number};
type Component={ingredient:string;input_quantity:number;nutrition_amount:number;nutrition_unit:string;source_url:string;reference_id:string;per_100:Nutrients;contribution:Nutrients};
type Nutrition={status:string;components:Component[];optional_ingredients_excluded:string[];unrounded_totals:Nutrients|null;missing_evidence:{ingredient:string}[];limitations:string[]};
type State={calories_per_serving:number|null;protein_g:number|null;carbs_g:number|null;fat_g:number|null;diet:string[];source_data:Record<string,unknown>;base_servings?:number;dish_type?:string;is_complete_meal?:boolean};
type Ingredient={id:string;slug:string;name:string;quantity:number;unit:string;optional:boolean;note:string|null};
type Step={id:string;step_no:number;text:string};
type Patch={id:string;slug:string;name:string;before:State;after:State;ingredients_before:Ingredient[];ingredient_note_changes:Record<string,{before:string|null;after:string}>;steps_before:Step[];step_changes:{id:string;before:string;after:string}[]};
const patches:Patch[]=JSON.parse(readFileSync('docs/qa/legacy-nutrition-review-20261025.json','utf8'));
const registry=JSON.parse(readFileSync('docs/qa/legacy-nutrition-reference-profiles-20261025.json','utf8'));
const sql=readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.endsWith('_substantiate_legacy_recipe_nutrition.sql'))}`,'utf8');
async function setup(){
 const db=new PGlite();
 await db.exec(`CREATE TABLE recipes(id uuid primary key,slug text unique,is_public boolean default true,calories_per_serving integer,protein_g numeric,carbs_g numeric,fat_g numeric,diet text[],source_data jsonb,base_servings numeric,dish_type text,is_complete_meal boolean,updated_at timestamptz,name text default 'preserve name',protein text[] default ARRAY['preserve protein'],flavor text[] default ARRAY['preserve flavor'],primary_protein text default 'preserve',image_url text default 'approved.jpg');
 CREATE TABLE ingredients(id uuid primary key default gen_random_uuid(),slug text unique);
 CREATE TABLE units(id uuid primary key default gen_random_uuid(),code text unique);
 CREATE TABLE recipe_ingredients(id uuid primary key,recipe_id uuid,ingredient_id uuid,quantity numeric,unit_id uuid,is_optional boolean,prep_note text);
 CREATE TABLE recipe_steps(id uuid primary key,recipe_id uuid,step_no integer,text text,time_seconds integer default 77,image_url text default 'preserve-step-image');`);
 for(const slug of new Set(patches.flatMap(p=>p.ingredients_before.map(i=>i.slug))))await db.query('INSERT INTO ingredients(slug) VALUES($1)',[slug]);
 for(const code of new Set(patches.flatMap(p=>p.ingredients_before.map(i=>i.unit))))await db.query('INSERT INTO units(code) VALUES($1)',[code]);
 for(const p of patches){
 const b=p.before;await db.query('INSERT INTO recipes(id,slug,calories_per_serving,protein_g,carbs_g,fat_g,diet,source_data,base_servings,dish_type,is_complete_meal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[p.id,p.slug,b.calories_per_serving,b.protein_g,b.carbs_g,b.fat_g,b.diet,JSON.stringify(b.source_data),b.base_servings,b.dish_type,b.is_complete_meal]);
 for(const i of p.ingredients_before)await db.query('INSERT INTO recipe_ingredients SELECT $1,$2,g.id,$3,u.id,$4,$5 FROM ingredients g CROSS JOIN units u WHERE g.slug=$6 AND u.code=$7',[i.id,p.id,i.quantity===1/3?'0.33333333333333333333':i.quantity,i.optional,i.note,i.slug,i.unit]);
 for(const s of p.steps_before)await db.query('INSERT INTO recipe_steps(id,recipe_id,step_no,text) VALUES($1,$2,$3,$4)',[s.id,p.id,s.step_no,s.text]);
 }
 return db;
}
it('applies all 156 records, preserves every non-nutrition field and all shopping quantities, and withholds unknown totals',async()=>{
 const db=await setup();try{
 const before=(await db.query("SELECT to_jsonb(r)-'calories_per_serving'-'protein_g'-'carbs_g'-'fat_g'-'diet'-'source_data'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows;
 const amounts=(await db.query("SELECT to_jsonb(i)-'prep_note' AS row FROM recipe_ingredients i ORDER BY id")).rows;
 const steps=(await db.query("SELECT to_jsonb(s)-'text' AS row FROM recipe_steps s ORDER BY id")).rows;
 await db.exec(sql);
 expect((await db.query("SELECT to_jsonb(r)-'calories_per_serving'-'protein_g'-'carbs_g'-'fat_g'-'diet'-'source_data'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows).toEqual(before);
 expect((await db.query("SELECT to_jsonb(i)-'prep_note' AS row FROM recipe_ingredients i ORDER BY id")).rows).toEqual(amounts);
 expect((await db.query("SELECT to_jsonb(s)-'text' AS row FROM recipe_steps s ORDER BY id")).rows).toEqual(steps);
 for(const p of patches){
 const r=(await db.query<State>('SELECT calories_per_serving,protein_g::float8 AS protein_g,carbs_g::float8 AS carbs_g,fat_g::float8 AS fat_g,diet,source_data FROM recipes WHERE id=$1',[p.id])).rows[0];expect(r).toEqual(p.after);
 for(const i of p.ingredients_before)expect((await db.query<{prep_note:string|null}>('SELECT prep_note FROM recipe_ingredients WHERE id=$1',[i.id])).rows[0].prep_note).toBe(p.ingredient_note_changes[i.id]?.after??i.note);
 for(const s of p.steps_before)expect((await db.query<{text:string}>('SELECT text FROM recipe_steps WHERE id=$1',[s.id])).rows[0].text).toBe(p.step_changes.find(c=>c.id===s.id)?.after??s.text);
 }
 expect((await db.query('SELECT 1 FROM recipes WHERE calories_per_serving IS NULL AND protein_g IS NULL AND carbs_g IS NULL AND fat_g IS NULL')).rows).toHaveLength(3);
 await expect(db.exec(sql)).rejects.toThrow('Recipe precondition changed');
 }finally{await db.close();}
},90000);
it('rolls back the entire update when the last recipe preparation changed after review',async()=>{
 const db=await setup();try{
 await db.query("UPDATE recipe_steps SET text='concurrent edit' WHERE id=$1",[patches.at(-1)!.steps_before[0].id]);
 await expect(db.exec(sql)).rejects.toThrow('Step precondition changed');
 expect((await db.query("SELECT 1 FROM recipes WHERE source_data ? 'nutrition'")).rows).toHaveLength(0);
 const p=patches[0];expect((await db.query<{calories_per_serving:number}>('SELECT calories_per_serving FROM recipes WHERE id=$1',[p.id])).rows[0].calories_per_serving).toBe(p.before.calories_per_serving);
 }finally{await db.close();}
},90000);
it('accounts for every required ingredient, uses traceable profiles and excludes optional ingredients from totals',()=>{
 expect(patches).toHaveLength(156);
 for(const p of patches){
 const n=p.after.source_data.nutrition as Nutrition;
 expect(n.components.map(c=>c.ingredient).concat(n.missing_evidence.map(m=>m.ingredient)).sort()).toEqual(p.ingredients_before.filter(i=>!i.optional).map(i=>i.slug).sort());
 expect(n.optional_ingredients_excluded.sort()).toEqual(p.ingredients_before.filter(i=>i.optional).map(i=>i.slug).sort());
 for(const c of n.components){
 const profile=registry.profiles[c.ingredient];expect(c.per_100).toEqual(profile.values);expect(c.source_url).toMatch(/^https:\/\//);expect(c.reference_id).toBeTruthy();
 for(const k of ['kcal','protein_g','carbs_g','fat_g'] as const)expect(c.contribution[k]).toBeCloseTo(c.nutrition_amount*c.per_100[k]/100,8);
 }
 if(n.unrounded_totals){
 for(const k of ['kcal','protein_g','carbs_g','fat_g'] as const){
 const sum=n.components.reduce((s,c)=>s+c.contribution[k],0);expect(n.unrounded_totals[k]).toBeCloseTo(sum,8);
 const rounded=k==='kcal'?Math.floor(sum+0.500000001):Math.floor(sum*10+0.500000001)/10;
 expect(k==='kcal'?p.after.calories_per_serving:p.after[k]).toBe(rounded);
 }
 }else expect([p.after.calories_per_serving,p.after.protein_g,p.after.carbs_g,p.after.fat_g]).toEqual([null,null,null,null]);
 const state={...p.before,...p.after};
 if(state.diet.includes('high_protein'))expect(isRecipeHighProtein(state)).toBe(true);
 if(state.diet.includes('low_fat'))expect(isRecipeLowFat({...state,fat_g:state.fat_g??null})).toBe(true);
 if(state.diet.includes('low_calorie'))expect(isRecipeLowCalorie(state)).toBe(true);
 expect(p.after.diet.every(t=>p.before.diet.includes(t))).toBe(true);
 }
});
const component=(slug:string,i:string)=>(patches.find(p=>p.slug===slug)!.after.source_data.nutrition as Nutrition).components.find(c=>c.ingredient===i)!;
it('distinguishes bone/shell yield, count masses and dry/cooked weights in realistic examples',()=>{
 expect(component('black-bean-clams','clams').nutrition_amount).toBe(61.25);
 expect(component('black-bean-steamed-pork-ribs','pork-ribs').nutrition_amount).toBe(106.38);
 expect(component('honey-chicken-wings','chicken-wings').nutrition_amount).toBe(60);
 expect(component('pan-fried-scallops','scallop').nutrition_amount).toBe(65);
 expect(component('french-toast-scrambled-egg','white-bread').nutrition_amount).toBe(58);
 expect(component('creamy-spinach-mushroom-chicken-rice','rice').contribution.kcal).toBe(322.2);
 expect(component('thai-chicken-vermicelli','rice-vermicelli').contribution.kcal).toBe(355);
 expect(component('vegetable-udon','dark-soy-sauce').nutrition_unit).toBe('ml');
 expect(component('vegetable-udon','dark-soy-sauce').contribution.kcal).toBe(12);
 expect(component('cold-black-fungus-xhs','black-fungus').per_100.kcal).toBe(38);
 expect(component('kelp-tofu-soup-xhs','kelp').per_100.kcal).toBe(22);
 expect(component('garlic-chicken-xhs','chicken-breast').contribution.kcal).toBe(192);
});
it('exposes estimate limitations and never displays partial sums as complete bone-soup totals',()=>{
 for(const p of patches){
 const v=recipeProvenance(p.after.source_data);const n=p.after.source_data.nutrition as Nutrition;
 expect(v.nutrition_is_estimate).toBe(n.status==='reference_based_estimate');expect(v.nutrition_notes.length).toBeGreaterThan(1);
 expect(v.data_quality_notes?.join('')).toContain('未經試煮');
 if(n.status==='insufficient_evidence'){expect(v.data_quality_notes?.join('')).toContain('撤下');expect(n.unrounded_totals).toBeNull();expect(p.after.diet.some(t=>['low_calorie','low_fat','high_protein'].includes(t))).toBe(false);}
 }
});
