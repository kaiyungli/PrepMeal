import { describe, expect, it } from 'vitest';
import { generateCookingTips as cooking, generatePairingSuggestions as pairing, generateStorageTips as storage } from '../src/lib/recipes/recipeGuidance';

describe('recipe guidance uses catalogue values',()=>{
 it.each(['stir_fry','fried','steamed','baked','braised','boiled','no_cook'])('provides applicable cooking advice for %s',method=>{
   const tips=cooking({method}); expect(tips).toHaveLength(1);
   expect(tips.join('')).not.toMatch(/等油出煙|過冷河|反轉一次/);
 });
 it('distinguishes steaming and baking and omits unknown method filler',()=>{
   expect(cooking({method:'steamed'}).join('')).toContain('水滾');
   expect(cooking({method:'baked'}).join('')).toContain('預熱');
   expect(cooking({method:'unknown'})).toEqual([]);
 });
 it.each([{meal_role:'complete_meal'},{is_complete_meal:true},{dish_type:'staple'}])('does not recommend extra starch for a staple: %o',r=>{
   expect(pairing(r).join('')).toContain('蔬菜或清湯');
   expect(pairing(r).join('')).not.toContain('配適量白飯');
 });
 it('keeps protein side distinct from main and vegetable sides',()=>{
   expect(pairing({meal_role:'protein_main'}).join('')).toContain('再加一份蔬菜');
   expect(pairing({meal_role:'protein_side'}).join('')).toContain('是否另加主菜');
   expect(pairing({meal_role:'veg_side'}).join('')).toContain('豆腐');
 });
 it('accounts for the protein already in soup and limits suggestions',()=>{
   expect(pairing({meal_role:'soup',primary_protein:'chicken'}).join('')).toContain('份量較少');
   expect(pairing({dish_type:'soup',primary_protein:'vegetarian'}).join('')).toContain('主菜');
   expect(pairing({})).toEqual([]);
 });
 it('keeps cooling deadlines and single reheating visible for cooked dishes',()=>{
   for(const method of ['boiled','steamed','baked','fried','stir_fry','braised',undefined]) {
     const tips=storage({method}).join('');
     expect(tips).toContain('兩小時內'); expect(tips).toContain('4度或以下');
     expect(tips).toContain('只翻熱一次'); expect(tips).not.toContain('自然冷卻');
   }
 });
 it('keeps cold salads chilled rather than instructing reheating',()=>{
   const tips=storage({method:'no_cook'}).join('');
   expect(tips).toContain('保持冷藏'); expect(tips).toContain('兩小時內');
   expect(tips).not.toContain('徹底翻熱');
 });
});
