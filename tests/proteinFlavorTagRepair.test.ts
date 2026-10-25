import { PGlite } from '@electric-sql/pglite';
import { readFileSync,readdirSync } from 'node:fs';
import { expect,it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterHomeCatalog } from '@/features/home/filterHomeCatalog';
import { recipeMatchesFilters } from '@/constants/filters';
import { useFilteredRecipes } from '@/features/generate/hooks/useFilteredRecipes';
type Tags={protein:string[];flavor:string[]};
type Patch={id:string;slug:string;name:string;primary_unchanged:string;ingredients:{slug:string;optional:boolean}[];before:Tags;after:Tags};
const patches:Patch[]=JSON.parse(readFileSync('docs/qa/protein-flavor-tags-20261025.json','utf8'));
const sql=readFileSync(`supabase/migrations/${readdirSync('supabase/migrations').find(f=>f.endsWith('_complete_recipe_protein_flavor_tags.sql'))}`,'utf8');
async function setup(){
 const db=new PGlite();await db.exec(`CREATE TABLE recipes(id uuid primary key,slug text unique,is_public boolean default true,primary_protein text,protein text[],flavor text[],updated_at timestamptz,nutrition jsonb default '{"kcal":123}',source_data jsonb default '{"source":"preserve"}',image_url text default 'approved.jpg');
 CREATE TABLE ingredients(id uuid primary key default gen_random_uuid(),slug text unique);
 CREATE TABLE recipe_ingredients(recipe_id uuid,ingredient_id uuid,is_optional boolean,quantity numeric default 123.45);
 CREATE TABLE recipe_steps(recipe_id uuid,text text);`);
 for(const s of new Set(patches.flatMap(p=>p.ingredients.map(i=>i.slug))))await db.query('INSERT INTO ingredients(slug) VALUES($1)',[s]);
 for(const p of patches){
 await db.query('INSERT INTO recipes(id,slug,primary_protein,protein,flavor) VALUES($1,$2,$3,$4,$5)',[p.id,p.slug,p.primary_unchanged,p.before.protein,p.before.flavor]);
 for(const i of p.ingredients)await db.query('INSERT INTO recipe_ingredients(recipe_id,ingredient_id,is_optional) SELECT $1,id,$2 FROM ingredients WHERE slug=$3',[p.id,i.optional,i.slug]);
 await db.query("INSERT INTO recipe_steps VALUES($1,'preserve method')",[p.id]);
 }
 return db;
}
it('applies all reviewed tags and preserves primary grouping, ingredient amounts, nutrition, evidence and images',async()=>{
 const db=await setup();try{
 const before=(await db.query("SELECT to_jsonb(r)-'protein'-'flavor'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows;
 const ingredients=(await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id,ingredient_id')).rows;
 const steps=(await db.query('SELECT * FROM recipe_steps ORDER BY recipe_id')).rows;
 await db.exec(sql);
 expect((await db.query("SELECT to_jsonb(r)-'protein'-'flavor'-'updated_at' AS row FROM recipes r ORDER BY slug")).rows).toEqual(before);
 expect((await db.query('SELECT * FROM recipe_ingredients ORDER BY recipe_id,ingredient_id')).rows).toEqual(ingredients);
 expect((await db.query('SELECT * FROM recipe_steps ORDER BY recipe_id')).rows).toEqual(steps);
 for(const p of patches)expect((await db.query<Tags>('SELECT protein,flavor FROM recipes WHERE slug=$1',[p.slug])).rows[0]).toEqual(p.after);
 await expect(db.exec(sql)).rejects.toThrow('Recipe precondition changed');
 }finally{await db.close();}
},30000);
it('rolls back the whole batch when ingredient optionality changed after review',async()=>{
 const db=await setup();try{
 await db.query('UPDATE recipe_ingredients SET is_optional=NOT is_optional WHERE recipe_id=$1',[patches.at(-1)!.id]);
 await expect(db.exec(sql)).rejects.toThrow('Ingredient precondition changed');
 for(const p of patches)expect((await db.query<Tags>('SELECT protein,flavor FROM recipes WHERE slug=$1',[p.slug])).rows[0]).toEqual(p.before);
 }finally{await db.close();}
},30000);
function generate(slug:string,exclude:string[]){
 const p=patches.find(p=>p.slug===slug)!;
 function Probe(){const r=useFilteredRecipes({allRecipes:[{id:p.id,primary_protein:p.primary_unchanged,...p.after}],filters:{},exclusions:exclude});return createElement('output',null,r.length);}
 return renderToStaticMarkup(createElement(Probe));
}
it('makes completed flavors searchable on the homepage and shared recipe filters',()=>{
 const catalog=patches.map(p=>({id:p.id,primary_protein:p.primary_unchanged,...p.after}));
 for(const p of patches)for(const flavor of p.after.flavor){
 expect(filterHomeCatalog(catalog,{flavor:[flavor]},'','newest').some(r=>r.id===p.id)).toBe(true);
 expect(recipeMatchesFilters({primary_protein:p.primary_unchanged,...p.after},{flavor:[flavor]})).toBe(true);
 }
 const sweet=patches.find(p=>p.slug==='sweet-and-sour-pork')!;
 expect(sweet.after.flavor).toEqual(expect.arrayContaining(['sour','sweet']));
 const fish=patches.find(p=>p.slug==='corn-fish-fillet-sauce')!;
 expect(recipeMatchesFilters({primary_protein:fish.primary_unchanged,...fish.after},{protein:['fish']})).toBe(true);
 expect(recipeMatchesFilters({primary_protein:fish.primary_unchanged,...fish.after},{protein:['egg']})).toBe(false);
});
it('honors repaired secondary protein exclusions without treating scallops or chicken as shrimp',()=>{
 expect(generate('minced-pork-tofu',['pork'])).toBe('<output>0</output>');
 expect(generate('salted-fish-steamed-pork-patty',['fish'])).toBe('<output>0</output>');
 expect(generate('corn-fish-fillet-sauce',['egg'])).toBe('<output>0</output>');
 expect(generate('pan-fried-scallops',['shrimp'])).toBe('<output>1</output>');
 expect(generate('pan-fried-scallops',['seafood'])).toBe('<output>0</output>');
 expect(generate('singapore-fried-rice-vermicelli',['chicken'])).toBe('<output>0</output>');
 expect(generate('singapore-fried-rice-vermicelli',['shrimp'])).toBe('<output>1</output>');
});
