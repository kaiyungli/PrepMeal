import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { matchesSlotRole } from '../src/lib/slotRoles';
import { isRecipeHighProtein, isRecipeLowFat } from '../src/constants/nutritionRules';
const sql = readFileSync('supabase/migrations/20261025052638_repair_recipe_nutrition_and_roles.sql','utf8');
const roles = [...sql.matchAll(/\('(prepmeal[^']+)','(protein_side|veg_side|complete_meal)'\)/g)].map(m=>({slug:m[1],role:m[2]}));
it('repairs ten roles and chicken nutrition atomically, preserving evidence and guarding replay', async()=>{
 const db=new PGlite();
 try {
 await db.exec(`CREATE TABLE recipes(slug text PRIMARY KEY,is_public boolean default true, meal_role text,is_complete_meal boolean default false,source_data jsonb, updated_at timestamptz, base_servings int default 1,calories_per_serving int default 300,protein_g numeric default 35,carbs_g numeric default 2,fat_g numeric default 10,diet text[] default ARRAY['high_protein','low_fat','low_calorie']);`);
 for(const r of roles) await db.query("INSERT INTO recipes(slug,source_data) VALUES ($1,'{\"source_attribution\":{\"website\":\"preserved\"}}')",[r.slug]);
 await db.exec("INSERT INTO recipes(slug,meal_role) VALUES ('garlic-chicken-xhs','protein_main');");
 await db.exec(sql);
 const rows=(await db.query<{meal_role:string,is_complete_meal:boolean,source_data:{source_attribution?:{website:string}},slug:string}>('SELECT * FROM recipes')).rows;
 expect(roles).toHaveLength(10);
 for(const r of rows.filter(r=>r.slug!=='garlic-chicken-xhs')){
 expect(r.source_data.source_attribution?.website).toBe('preserved');
 expect(r.is_complete_meal).toBe(r.meal_role==='complete_meal');
 expect(matchesSlotRole(r,'protein_main')).toBe(false);
 expect(matchesSlotRole(r,r.meal_role)).toBe(r.meal_role!=='protein_side');
 }
 const chicken=(await db.query<{protein_g:string,carbs_g:string,fat_g:string,diet:string[]}>('SELECT * FROM recipes WHERE slug=\'garlic-chicken-xhs\'')).rows[0];
 expect(chicken).toMatchObject({protein_g:'37.4',carbs_g:'8.0',fat_g:'12.3',diet:['high_protein','low_calorie']});
 expect(isRecipeHighProtein({...chicken,dish_type:'main',calories_per_serving:300})).toBe(true);
 expect(isRecipeLowFat({...chicken,dish_type:'main',calories_per_serving:300})).toBe(false);
 await expect(db.exec(sql)).rejects.toThrow('Expected 10');
 } finally {await db.close();}
},30000);
it('nutrient estimate includes all six ingredients and agrees with rounded catalogue values',()=>{
 const e=JSON.parse(readFileSync('docs/qa/garlic-chicken-nutrition-20261025.json','utf8'));
 expect(e.profiles).toHaveLength(6);
 for(const k of ['kcal','protein_g','carbs_g','fat_g']){
 const sum=e.profiles.reduce((v:number,p:{grams:number,per_100g:Record<string,number>})=>v+p.grams*p.per_100g[k]/100,0);
 expect(sum).toBeCloseTo(e.per_serving_unrounded[k],5);
 }
});
