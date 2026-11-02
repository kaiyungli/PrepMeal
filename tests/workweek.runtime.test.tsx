import { useState } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ShoppingListV2 from '@/components/shopping/ShoppingListV2';
import { emptyProgress } from '@/features/shopping-list/progress/model';
import { mapShoppingListResponseToViewModel } from '@/features/shopping-list/mappers';
import type { ShoppingListResponse } from '@/features/shopping-list/types';
import { useGeneratedShoppingList } from '@/features/generate/hooks/useGeneratedShoppingList';
import { fetchGeneratedPlanShoppingList } from '@/features/generate/services/fetchGeneratedPlanShoppingList';
vi.mock('@/hooks/useAuth', () => ({useAuth: () => ({user:null,isAuthenticated:false,getAccessToken: async()=>null})}));
const getAccessToken = async () => null;
const api = { pantry:[], toBuy:[{category:'vegetable',items:[{ingredientId:'onion',name:'洋蔥',quantity:300,unit:'g'}]}],
  byRecipe:[{recipeId:'a',recipeName:'飯 A',pantry:[],toBuy:[{ingredientId:'onion',name:'洋蔥',quantity:100,unit:'克',unitCode:'g'}]},
  {recipeId:'b',recipeName:'飯 B',pantry:[],toBuy:[{ingredientId:'onion',name:'洋蔥',quantity:200,unit:'克',unitCode:'g'}]}] };
const view = mapShoppingListResponseToViewModel(api as unknown as ShoppingListResponse);
function Workspace() { const [p,setP]=useState(emptyProgress);return <ShoppingListV2 view={view} progress={p} onChange={setP} status="草稿保留7日" batches={[{label:'第一批',recipeShares:{a:1}},{label:'第二批',recipeShares:{b:1}}]} />; }
beforeEach(()=>{localStorage.clear();sessionStorage.clear();});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('workweek interface and request boundaries',()=>{
  it('shows each recipe quantity and keeps the full-week purchase checkbox shared',()=>{
    render(<Workspace/>);
    expect(screen.getByRole('checkbox',{name:'洋蔥 300 g'})).toBeTruthy();
    fireEvent.change(screen.getByLabelText('清單排列'),{target:{value:'recipe'}});
    expect(screen.getByRole('checkbox',{name:'洋蔥 100 克'})).toBeTruthy();
    expect(screen.getByRole('checkbox',{name:'洋蔥 200 克'})).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox',{name:'洋蔥 100 克'}));
    expect(screen.queryByRole('checkbox',{name:/洋蔥/})).toBeNull();
    expect(screen.getByText('已買 1／共 1 項')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'撤銷'}));
    expect(screen.getByRole('checkbox',{name:'洋蔥 200 克'})).toBeTruthy();
  });
  it('splits purchase references without clearing the global purchase checks',()=>{
    render(<Workspace/>);fireEvent.click(screen.getByRole('checkbox',{name:/洋蔥/}));
    fireEvent.click(screen.getByText('分批買餸參考'));
    expect(screen.getByText('100 克')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('採購批次'),{target:{value:'1'}});
    expect(screen.getByText('200 克')).toBeTruthy();
    expect(screen.getByText('已買 1／共 1 項')).toBeTruthy();
    expect(screen.getByText('食材與草稿資訊')).toBeTruthy();
    expect(screen.getByText('食物保存及帶飯提示')).toBeTruthy();
    expect(screen.queryByText('食材與保存資訊')).toBeNull();
  });
  it('aligns lunch portions to recipe occurrence order even when plan keys are reordered',async()=>{
    const fetch=vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async ()=>new Response(JSON.stringify(api)));vi.stubGlobal('fetch',fetch);
    const weeklyPlan={fri:[{id:'b'}],mon:[{id:'a'}]};
    const hook=renderHook(()=>useGeneratedShoppingList({weeklyPlan,pantryIngredients:[],servings:2,daysPerWeek:5,packLunch:true,isAuthenticated:false,userId:null,getAccessToken}));
    await act(async()=>hook.result.current.handleOpenShoppingList());
    const body=JSON.parse(fetch.mock.calls[0][1]?.body as string);
    expect(body.recipeIds).toEqual(['b','a']);expect(body.recipeServings).toEqual([2,4]);
  });
  it('invalidates cache when the same recipes move between double-portion and final single-portion days',async()=>{
    const fetch=vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async ()=>new Response(JSON.stringify(api)));vi.stubGlobal('fetch',fetch);
    const hook=renderHook(({plan})=>useGeneratedShoppingList({weeklyPlan:plan,pantryIngredients:[],servings:1,daysPerWeek:5,packLunch:true,isAuthenticated:false,userId:null,getAccessToken}),{initialProps:{plan:{mon:[{id:'a'}],fri:[{id:'b'}]}}});
    await act(async()=>hook.result.current.handleOpenShoppingList());
    hook.rerender({plan:{mon:[{id:'b'}],fri:[{id:'a'}]}});
    expect(hook.result.current.shoppingListView).toBeNull();
    await act(async()=>hook.result.current.handleOpenShoppingList());
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string).recipeIds).toEqual(['b','a']);
  });
  it('never uses a cache entry with the same sorted ids but different id-to-portion assignments',async()=>{
    const fetch=vi.fn<(url: string, options?: RequestInit) => Promise<Response>>(async ()=>new Response(JSON.stringify(api)));vi.stubGlobal('fetch',fetch);
    await fetchGeneratedPlanShoppingList({mon:[{id:'a'},{id:'b'}]},[],1,{token:null,cacheScope:'guest',recipeServings:[2,1]});
    await fetchGeneratedPlanShoppingList({mon:[{id:'b'},{id:'a'}]},[],1,{token:null,cacheScope:'guest',recipeServings:[2,1]});
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
