// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import {recipeMatchesFilters} from '@/constants/filters';
import {renderHook,act,cleanup} from '@testing-library/react';
import {useRecipeFilters} from '@/hooks/useRecipeFilters';
type Recipe = Record<string, unknown>;
const mocks=vi.hoisted(()=>({selected:'',rows:[] as Recipe[]}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({from:()=>({select:(fields:string)=>{
  mocks.selected=fields;
  const columns=fields.slice(fields.indexOf('recipes (')+9,fields.lastIndexOf(')')).split(',').map(s=>s.trim());
  return {eq:async()=>({error:null,data:mocks.rows.map(r=>({recipe_id:r.id,recipes:Object.fromEntries(columns.map(k=>[k,r[k]]))}))})};
}})})}));
vi.mock('@/pages/api/user/_auth',()=>({requireAuth:async()=> 'synthetic-A',ApiResponse:{success:(data:unknown)=>({success:true,data}),error:(error:unknown)=>({success:false,error})}}));
import handler from '@/pages/api/user/favorites/index';
beforeEach(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-key';mocks.selected='';mocks.rows=[];});
async function get(rs:Recipe[]){
  mocks.rows=rs;
  const response={body:{data:{recipes:[] as Recipe[]}},status(){return this;},json(body:{data:{recipes:Recipe[]}}){this.body=body;return this;}};
  await handler({method:'GET',headers:{authorization:'Bearer synthetic-token'},query:{include:'recipes'}} as never,response);
  return response.body.data.recipes;
}
it('diet tags must survive the real favorites API projection for local filtering',async()=>{
  const full={id:'A',name:'A',diet:['vegetarian']};
  expect(recipeMatchesFilters(full,{diet:['vegetarian']})).toBe(true);
  const projected=await get([full]);
  expect(recipeMatchesFilters(projected[0],{diet:['vegetarian']})).toBe(true);
});
it('flavor tags must survive the real favorites API projection for local filtering',async()=>{
  const full={id:'A',name:'A',flavor:['spicy']};
  expect(recipeMatchesFilters(full,{flavor:['spicy']})).toBe(true);
  const projected=await get([full]);
  expect(recipeMatchesFilters(projected[0],{flavor:['spicy']})).toBe(true);
});
it('popular sort must receive its ranking field from the favorites API',async()=>{
  const projected=await get([{id:'A',name:'popular',times_shown:99},{id:'Z',name:'rare',times_shown:1}]);
  const h=renderHook(()=>useRecipeFilters());
  act(()=>h.result.current.setSortBy('popular'));
  expect(h.result.current.filterRecipes(projected).map((r:Recipe)=>r.id)).toEqual(['A','Z']);cleanup();
});
it('control: primary protein filtering works with the current favorites projection',async()=>{
  const projected=await get([{id:'A',primary_protein:'chicken'}]);
  expect(recipeMatchesFilters(projected[0],{protein:['chicken']})).toBe(true);
});
