// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { SWRConfig } from 'swr';
import { useUserState } from '@/hooks/useUserState';
import { invalidateFavoritesCache } from '@/hooks/useFavorites';

const { auth } = vi.hoisted(() => ({ auth: {
  loading: false, isAuthenticated: true, user: { id: 'synthetic-A' } as {id:string}|null,
  getAccessToken: (() => Promise.resolve('synthetic-token-A')) as () => Promise<string|null>,
}}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
const calls: string[] = [];
function deferred() {
  let resolve!: (v:string|null)=>void;
  const promise = new Promise<string|null>(r => { resolve = r; });
  return {promise,resolve};
}
function setup() {
  const cache = new Map();
  return renderHook(() => useUserState(), {
    wrapper: ({children}) => createElement(SWRConfig,{value:{provider:()=>cache}},children),
  });
}
beforeEach(() => {
  invalidateFavoritesCache();
  calls.length = 0; sessionStorage.clear();
  auth.loading = false; auth.isAuthenticated = true; auth.user = {id:'synthetic-A'};
  auth.getAccessToken = () => Promise.resolve('synthetic-token-A');
  vi.stubGlobal('fetch',vi.fn(async (_url,init) => {
    const bearer = init?.headers?.Authorization as string;
    calls.push(bearer);
    return {ok:true,json:async()=>({success:true,data:{favorites:[bearer === 'Bearer synthetic-token-A' ? 'A-only-recipe' : 'B-only-recipe']}})};
  }));
});
afterEach(() => { cleanup(); invalidateFavoritesCache(); vi.unstubAllGlobals(); });

it('control: normal login loads the current account favorites', async () => {
  const {result} = setup();
  await waitFor(()=>expect(result.current.favorites).toEqual(['A-only-recipe']));
  expect(calls).toEqual(['Bearer synthetic-token-A']);
});

it('a delayed pre-logout token must not load or reveal favorites after logout',async()=>{
  const a = deferred(); auth.getAccessToken = () => a.promise;
  const {result,rerender} = setup();
  auth.isAuthenticated = false; auth.user = null; rerender();
  await act(async()=>a.resolve('synthetic-token-A'));
  await new Promise(r=>setTimeout(r,250));
  expect({calls,favorites:result.current.favorites}).toEqual({calls:[],favorites:[]});
});

it('late account A token must not overwrite a resolved account B token',async()=>{
  const a = deferred(); auth.getAccessToken = () => a.promise;
  const {result,rerender} = setup();
  auth.user = {id:'synthetic-B'}; auth.getAccessToken = () => Promise.resolve('synthetic-token-B'); rerender();
  await waitFor(()=>expect(result.current.favorites).toEqual(['B-only-recipe']));
  await act(async()=>a.resolve('synthetic-token-A'));
  await act(async()=>{await new Promise(r=>setTimeout(r,20));});
  expect(calls).not.toContain('Bearer synthetic-token-A');
  expect(result.current.favorites).toEqual(['B-only-recipe']);
});

