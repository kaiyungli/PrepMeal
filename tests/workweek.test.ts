import { describe, expect, it } from 'vitest';
import { dayPortions, planPortions, shoppingBatches, isLunchboxCandidate } from '@/features/generate/workweek';
import { normalizePlanForSave } from '@/features/generate/mappers/normalizePlanForSave';
import { batchQuantities, sameGrocery } from '@/features/shopping-list/recipeQuantities';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse } from '@/features/shopping-list/types';
const plan = { mon: [{id:'a'}], tue: [{id:'b'}], wed: [{id:'a'}], thu: [{id:'c'}], fri: [{id:'a'}] };
describe('workweek meal portions and purchases', () => {
  it('covers four next-day lunches without inventing Monday lunch or Saturday lunch', () => {
    expect(planPortions(plan,5,1,true).map(meal => meal.portions)).toEqual([2,2,2,2,1]);
    expect(planPortions(plan,5,2,true).reduce((sum,meal) => sum+meal.portions,0)).toBe(18);
    expect(dayPortions('fri',5,4,true)).toBe(4);
    expect(planPortions(plan,5,2,false).map(meal=>meal.portions)).toEqual([2,2,2,2,2]);
    expect(normalizePlanForSave(plan,2,5,true).items.map(item => item.servings)).toEqual([4,4,4,4,2]);
  });
  it('keeps the selected day portions when saving a plan with empty slots', () => {
    const saved = normalizePlanForSave({mon:[null,{id:'a'}], fri:[{id:'b'}]},1,5,true);
    expect(saved.items.map(item => [item.recipe_id,item.servings])).toEqual([['a',2],['b',1]]);
  });
  it('does not certify unknown recipes or immediate-service carbonara for lunch', () => {
    expect(isLunchboxCandidate({slug:'carbonara-pasta'})).toBe(false);
    expect(isLunchboxCandidate({slug:'unreviewed-future-recipe'})).toBe(false);
    expect(isLunchboxCandidate({slug:'garlic-chicken-pasta'})).toBe(true);
    expect(isLunchboxCandidate({slug:null})).toBe(false);
  });
  it('allocates a repeated recipe in proportion to actual portions in each batch', () => {
    const batches = shoppingBatches(plan,5,1,true,2);
    expect(batches[0].recipeShares.a).toBeCloseTo(4/5);
    expect(batches[1].recipeShares.a).toBeCloseTo(1/5);
    expect(batches[0].recipeShares.b).toBe(1);
    expect(batches[1].recipeShares.c).toBe(1);
    expect(shoppingBatches(plan,5,1,true,1)).toEqual([]);
  });
  it('uses recipe quantities, fixed-ratio conversion, and IDs rather than display-name overlap', () => {
    const view = mapShoppingListResponseToViewModel({pantry:[],toBuy:[],byRecipe:[
      {recipeId:'a',recipeName:'A',pantry:[],toBuy:[{ingredientId:'onion',name:'洋蔥',quantity:500,unit:'克',unitCode:'g'}]},
      {recipeId:'b',recipeName:'B',pantry:[],toBuy:[{ingredientId:'onion',name:'洋蔥',quantity:0.2,unit:'千克',unitCode:'kg'}]},
    ],summary:{pantryCount:0,toBuyCount:0,sectionCount:0}} as ShoppingListResponse);
    const batches = shoppingBatches(plan,5,1,true,2);
    expect(batchQuantities(view,batches[0])[0].quantity).toBeCloseTo(600);
    expect(batchQuantities(view,batches[1])[0].quantity).toBeCloseTo(100);
    expect(batchQuantities(view,batches[0])[0].quantityText).toBe('600 克');
    expect(sameGrocery({ingredientId:'onion',name:'洋蔥',unit:'g'},{ingredientId:'other',name:'洋蔥',unit:'g'})).toBe(false);
    expect(sameGrocery({ingredientId:'oil',unit:'g'},{ingredientId:'oil',unit:'ml'})).toBe(false);
    expect(sameGrocery({ingredientId:'oil',unit:'tsp'},{ingredientId:'oil',unit:'湯匙'})).toBe(true);
  });
});
