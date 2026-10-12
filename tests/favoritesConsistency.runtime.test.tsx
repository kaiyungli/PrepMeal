import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,renderHook} from '@testing-library/react';
import {createElement, type ReactNode} from 'react';
type Recipe = {id:string;name:string};
type Reply = {ok:boolean;status:number;json:()=>Promise<unknown>};
import {SWRConfig} from 'swr';
import FavoritesPage from '@/pages/favorites';
import {useFavorites} from '@/hooks/useFavorites';

const {auth} = vi.hoisted(()=>({auth:{loading:false,isAuthenticated:true,user:{id:'synthetic-A'} as {id:string}|null,getAccessToken:async():Promise<string|null>=>'synthetic-token-A'}}));
vi.mock('@/hooks/useAuthGuard',()=>({useAuthGuard:()=>auth}));
vi.mock('@/features/layout/hooks/useHeaderController',()=>({useHeaderController:()=>({})}));
vi.mock('@/components/layout/Header',()=>({default:()=>null}));
vi.mock('next/head',()=>({default:()=>null}));
vi.mock('@/components/recipes/RecipeFilters',()=>({default:()=>null}));
vi.mock('@/hooks/useRecipeFilters',()=>({useRecipeFilters:()=>({filterRecipes:(rs:Recipe[])=>rs})}));
vi.mock('@/components/RecipeList',()=>({default:({recipes,onFavoriteClick}:{recipes:Recipe[];onFavoriteClick:(id:string)=>Promise<boolean>})=>createElement('div',{},...recipes.map((r:Recipe)=>createElement('button',{key:r.id,onClick:()=>onFavoriteClick(r.id)},r.name)))}));
const RECIPES=['A','B','C'].map(id=>({id,name:`Recipe ${id}`}));
const pending=new Map<string,(r:Reply)=>void>();
let deletes:string[];
let listResult:Reply;
let tokenB=false;
function reply(status=200,data:unknown={success:true}){return {ok:status>=200&&status<300,status,json:async()=>data};}
function list(rs=RECIPES){return {success:true,data:{favorites:rs.map(r=>r.id),recipes:rs}};}
function cards(){return screen.queryAllByRole('button').map(b=>b.textContent).sort();}
async function open(){const view=render(createElement(FavoritesPage));await waitFor(()=>expect(cards()).toEqual(['Recipe A','Recipe B','Recipe C']));return view;}
async function remove(id:string){fireEvent.click(screen.getByRole('button',{name:`Recipe ${id}`}));await waitFor(()=>expect(deletes).toContain(id));}
async function settle(id:string,status:number){await act(async()=>pending.get(id)!(reply(status)));}
beforeEach(()=>{
  pending.clear();deletes=[];listResult=reply(200,list());tokenB=false;sessionStorage.clear();
  auth.loading=false;auth.isAuthenticated=true;auth.user={id:'synthetic-A'};auth.getAccessToken=async()=>tokenB?'synthetic-token-B':'synthetic-token-A';
  vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
    if(init?.method==='DELETE') {const id=url.split('recipe_id=')[1];deletes.push(id);return new Promise(resolve=>pending.set(id,resolve));}
    return listResult;
  }));
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('control: normal list loads and a successful removal keeps the other cards',async()=>{
  await open();await remove('A');await settle('A',200);expect(cards()).toEqual(['Recipe B','Recipe C']);
});
it('control: a genuine empty account shows the empty state',async()=>{
  listResult=reply(200,list([]));render(createElement(FavoritesPage));
  await screen.findByText('你仲未收藏任何食譜');expect(cards()).toEqual([]);
});
it('unchanged renders retain recipe results while an actual favorite change invalidates them',async()=>{
  const hook=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A',{includeRecipes:true}));
  await waitFor(()=>expect(hook.result.current.recipes).toHaveLength(3));
  const initial=hook.result.current.recipes;
  hook.rerender();expect(hook.result.current.recipes).toBe(initial);
  act(()=>{void hook.result.current.setFavorite('A',false);});
  const optimistic=hook.result.current.recipes;
  expect(optimistic).not.toBe(initial);expect(optimistic.map((r:Recipe)=>r.id)).toEqual(['B','C']);
  await settle('A',200);
  expect(hook.result.current.recipes).toBe(optimistic);
  expect(hook.result.current.isPending('A')).toBe(false);
});
it('failure rollback invalidates the memoized recipe list and restores the failed recipe',async()=>{
  const hook=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A',{includeRecipes:true}));
  await waitFor(()=>expect(hook.result.current.recipes).toHaveLength(3));
  act(()=>{void hook.result.current.setFavorite('A',false);});
  const optimistic=hook.result.current.recipes;
  await settle('A',500);
  expect(hook.result.current.recipes).not.toBe(optimistic);
  expect(hook.result.current.recipes.map((r:Recipe)=>r.id)).toEqual(['A','B','C']);
  expect(hook.result.current.mutationError).toBe('收藏更新失敗，請重試');
});
it('control: a 404 removal is treated as already absent',async()=>{
  await open();await remove('A');await settle('A',404);expect(cards()).toEqual(['Recipe B','Recipe C']);
});
it('control: both successful parallel removals stay removed',async()=>{
  await open();await remove('A');await remove('B');await settle('B',200);await settle('A',200);
  expect(cards()).toEqual(['Recipe C']);
});
it('control: an isolated failed removal restores its own card',async()=>{
  await open();await remove('A');await settle('A',500);expect(cards()).toEqual(['Recipe A','Recipe B','Recipe C']);
});
it('list HTTP failure must show failure and retry rather than claim the account is empty',async()=>{
  listResult=reply(500);render(createElement(FavoritesPage));
  await screen.findByText('收藏載入失敗，請重試');
  expect(screen.queryByText('你仲未收藏任何食譜')).toBeNull();
  listResult=reply(200,list());fireEvent.click(screen.getByRole('button',{name:'重試'}));
  await waitFor(()=>expect(cards()).toEqual(['Recipe A','Recipe B','Recipe C']));
});
it('a failed A removal must not resurrect B after B succeeds',async()=>{
  await open();await remove('A');await remove('B');await settle('B',200);await settle('A',500);
  expect(cards()).toEqual(['Recipe A','Recipe C']);
});
it('two failed removals must restore both A and B',async()=>{
  await open();await remove('A');await remove('B');await settle('A',500);await settle('B',500);
  expect(cards()).toEqual(['Recipe A','Recipe B','Recipe C']);
});
it('old removal failure must not replace account B cards with account A snapshot',async()=>{
  const view=await open();await remove('A');
  tokenB=true;auth.user={id:'synthetic-B'};listResult=reply(200,list([{id:'Z',name:'Recipe Z'}]));view.rerender(createElement(FavoritesPage));
  await waitFor(()=>expect(cards()).toEqual(['Recipe Z']));await settle('A',500);
  expect(cards()).toEqual(['Recipe Z']);
});
it('logout then same account login must refresh the list',async()=>{
  const view=await open();auth.isAuthenticated=false;auth.user=null;view.rerender(createElement(FavoritesPage));
  listResult=reply(200,list([{id:'Z',name:'Recipe Z'}]));auth.isAuthenticated=true;auth.user={id:'synthetic-A'};view.rerender(createElement(FavoritesPage));
  await waitFor(()=>expect(cards()).toEqual(['Recipe Z']));
});
it('missing DELETE token must not send Bearer null',async()=>{
  const view=await open();const oldButton=screen.getByRole('button',{name:'Recipe A'});
  auth.getAccessToken=async()=>null;view.rerender(createElement(FavoritesPage));await act(async()=>{});
  fireEvent.click(oldButton);await act(async()=>{});
  expect(deletes).toEqual([]);
});

it('successful FavoritesPage removal must invalidate the shared favorite IDs',async()=>{
  const cache=new Map();const wrapper=({children}:{children:ReactNode})=>createElement(SWRConfig,{value:{provider:()=>cache}},children);
  const first=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'),{wrapper});
  await waitFor(()=>expect(first.result.current.favorites).toEqual(['A','B','C']));first.unmount();
  const page=render(createElement(FavoritesPage),{wrapper});await screen.findByRole('button',{name:'Recipe A'});
  await remove('A');listResult=reply(200,list(RECIPES.filter(r=>r.id!=='A')));await settle('A',200);page.unmount();
  const next=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'),{wrapper});
  await act(async()=>{await new Promise(r=>setTimeout(r,180));});
  expect(next.result.current.favorites).toEqual(['B','C']);
});

it('rapid add then remove must preserve the final intent even if writes finish in reverse order',async()=>{
  const cache=new Map();const wrapper=({children}:{children:ReactNode})=>createElement(SWRConfig,{value:{provider:()=>cache}},children);
  let saved=false;const writes=new Map<string,()=>void>();
  vi.stubGlobal('fetch',vi.fn((url:string,init?:RequestInit)=>{
    if(init?.method) return new Promise(resolve=>writes.set(init.method!,()=>{saved=init.method==='POST';resolve(reply(200));}));
    return Promise.resolve(reply(200,{success:true,data:{favorites:saved?['A']:[]}}));
  }));
  const hook=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'),{wrapper});
  await act(async()=>{await new Promise(r=>setTimeout(r,160));});
  let add:Promise<boolean>,remove:Promise<boolean>;
  act(()=>{add=hook.result.current.toggleFavorite('A');remove=hook.result.current.toggleFavorite('A');});
  expect([...writes.keys()]).toEqual(['POST']);
  await act(async()=>{writes.get('POST')!();});
  await waitFor(()=>expect(writes.has('DELETE')).toBe(true));
  await act(async()=>{writes.get('DELETE')!();await Promise.all([add!,remove!]);});
  expect(saved).toBe(false);
});

it.each([
  {success:false,data:{favorites:[],recipes:[]}},
  {success:true,data:{favorites:'bad',recipes:[]}},
  {success:true,data:{favorites:[],recipes:'bad'}},
  {success:true,data:{favorites:['A'],recipes:[null]}},
])('invalid list response shows failure and never claims the account is empty: %j',async body=>{
  listResult=reply(200,body);render(createElement(FavoritesPage));
  await screen.findByText('收藏載入失敗，請重試');
  expect(screen.queryByText('你仲未收藏任何食譜')).toBeNull();
});

it('rejected token retrieval shows an error and can retry without an anonymous GET',async()=>{
  const getter=vi.fn().mockRejectedValueOnce(new Error('synthetic failure')).mockResolvedValue('synthetic-token-A');
  auth.getAccessToken=getter;const fetchSpy=vi.mocked(fetch);
  render(createElement(FavoritesPage));await screen.findByText('無法取得登入資料，請重新登入');
  expect(fetchSpy).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'重試'}));
  await screen.findByRole('button',{name:'Recipe A'});expect(getter).toHaveBeenCalledTimes(2);
});

it('two mounted consumers share optimistic updates and pending state',async()=>{
  const first=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'));
  const second=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'));
  await waitFor(()=>expect(first.result.current.favorites).toEqual(['A','B','C']));
  let operation:Promise<boolean>;
  act(()=>{operation=first.result.current.setFavorite('A',false);});
  expect(second.result.current.favorites).toEqual(['B','C']);expect(second.result.current.isPending('A')).toBe(true);
  await settle('A',200);await operation!;
  expect(second.result.current.isPending('A')).toBe(false);expect(second.result.current.favorites).toEqual(['B','C']);
});

it('a retired consumer callback cannot write after the same account mounts again',async()=>{
  const first=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'));
  await waitFor(()=>expect(first.result.current.favorites).toEqual(['A','B','C']));
  const retired=first.result.current.toggleFavorite;first.unmount();
  const second=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'));
  await waitFor(()=>expect(second.result.current.favorites).toEqual(['A','B','C']));
  expect(await retired('A')).toBe(false);expect(deletes).toEqual([]);
});

it('a delayed pre-write list cannot restore a successfully removed favorite',async()=>{
  let completeList!:(r:Reply)=>void;let delayed=false;
  vi.stubGlobal('fetch',vi.fn((url:string,init?:RequestInit)=>{
    if(init?.method==='DELETE') {listResult=reply(200,list(RECIPES.filter(r=>r.id!=='A')));return Promise.resolve(reply());}
    if(delayed) {delayed=false;return new Promise(resolve=>{completeList=resolve;});}
    return Promise.resolve(listResult);
  }));
  const hook=renderHook(()=>useFavorites('synthetic-token-A','synthetic-A'));
  await waitFor(()=>expect(hook.result.current.favorites).toEqual(['A','B','C']));
  delayed=true;let refresh:Promise<boolean>;
  act(()=>{refresh=hook.result.current.retry();});
  await act(async()=>{await hook.result.current.setFavorite('A',false);});
  await act(async()=>{completeList(reply(200,list()));await refresh!;});
  await waitFor(()=>expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.favorites).toEqual(['B','C']);
});

it('token refresh keeps the current list and uses the new token for subsequent writes',async()=>{
  const hook=renderHook(({token})=>useFavorites(token,'synthetic-A'),{initialProps:{token:'synthetic-token-A'}});
  await waitFor(()=>expect(hook.result.current.favorites).toEqual(['A','B','C']));
  const before=vi.mocked(fetch).mock.calls.length;hook.rerender({token:'synthetic-token-B'});
  expect(hook.result.current.favorites).toEqual(['A','B','C']);expect(vi.mocked(fetch).mock.calls.length).toBe(before);
  let operation:Promise<boolean>;act(()=>{operation=hook.result.current.setFavorite('A',false);});
  const init=vi.mocked(fetch).mock.calls.at(-1)![1];
  expect((init?.headers as Record<string,string>).Authorization).toBe('Bearer synthetic-token-B');
  await settle('A',200);await operation!;
});
