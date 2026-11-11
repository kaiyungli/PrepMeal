import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
const source = readFileSync('src/features/home/featuredBootstrap.js', 'utf8');
function store(initial: Record<string, string> = {}, blocked = false) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key: string) => { if (blocked) throw Error('blocked'); return data.get(key) ?? null; },
    setItem: (key: string, value: string) => { if (blocked) throw Error('blocked'); data.set(key, value); } };
}
function browser(session = store(), local = store(), navigation = 'navigate') {
  const styles: Record<string, { id?: string; textContent?: string }> = {};
  const window = { sessionStorage: session, localStorage: local, performance: { getEntriesByType: () => [{ type: navigation }] },
    __prepmealHomeFeatured: undefined as undefined | { mount: (pool: string[], fresh: boolean, channel?: 'hero' | 'featured', excluded?: string[]) => string[] } };
  const document = { getElementById: (id: string) => styles[id], createElement: () => ({}), head: { appendChild: (style: { id: string }) => { styles[style.id] = style; } } };
  vm.runInNewContext(source, { window, document });
  return { api: window.__prepmealHomeFeatured!, window, document, styles };
}
const pool = Array.from({ length: 12 }, (_, i) => `recipe-${i}`);
const key = 'prepmeal:home-featured:v1';

describe('featured recipes have a document lifetime, not a render/focus lifetime', () => {
  it('chooses three unique recipes, preferring a disjoint group on reload and a new tab', () => {
    const session = store(), local = store();
    const first = browser(session, local).api.mount(pool, true);
    const reload = browser(session, local, 'reload').api.mount(pool, true);
    expect(new Set(first).size).toBe(3); expect(new Set(reload).size).toBe(3);
    expect(reload.filter(slug => first.includes(slug))).toHaveLength(0);
    const newTab = browser(store({ [key]: JSON.stringify(reload) }), local).api.mount(pool, true);
    expect(newTab.filter(slug => reload.includes(slug))).toHaveLength(0);
  });
  it('keeps the same group on rerenders, client return, and browser back even if the pool order changes', () => {
    const session = store(), b = browser(session);
    const first = b.api.mount(pool, true);
    for (let i = 0; i < 10; i++) expect(b.api.mount(pool.slice().reverse(), false)).toEqual(first);
    expect(browser(session, store(), 'back_forward').api.mount(pool, true)).toEqual(first);
  });
  it.each([0, 1, 2, 3, 4, 5])('handles %i candidates without duplicate cards or an impossible retry loop', count => {
    const session = store(), local = store(), small = pool.slice(0, count);
    const first = browser(session, local).api.mount(small, true);
    const second = browser(session, local, 'reload').api.mount(small, true);
    expect(new Set(second).size).toBe(Math.min(3, count));
    if (count > 3) expect(second.slice().sort()).not.toEqual(first.slice().sort());
  });
  it('recovers from corrupt/blocked storage and a vanished selected recipe', () => {
    const b = browser(store({}, true), store({}, true));
    const first = b.api.mount(pool, true);
    expect(b.api.mount(pool, false)).toEqual(first);
    const replacement = b.api.mount(pool.filter(slug => slug !== first[0]), false);
    expect(replacement).toHaveLength(3); expect(replacement).not.toContain(first[0]);
    expect(browser(store({ [key]: 'invalid json' })).api.mount(pool, true)).toHaveLength(3);
  });
  it('only writes scoped numeric nth-child rules, never recipe strings into CSS', () => {
    const b = browser(); b.api.mount(pool, true);
    expect(b.styles['home-featured-visibility'].textContent).toContain('#home-featured-list>');
    expect(b.styles['home-featured-visibility'].textContent).not.toMatch(/(?:^|[;{])\s*order\s*:/);
    for (const slug of pool) expect(b.styles['home-featured-visibility'].textContent).not.toContain(slug);
  });
});


describe('the shared picker has independent hero and featured lifetimes', () => {
  it('picks one hero on new documents, remembers returns, and does not touch the featured group', () => {
    const session = store(), local = store(), b = browser(session, local);
    const hero = b.api.mount(pool, true, 'hero'), featured = b.api.mount(pool, true);
    expect(hero).toHaveLength(1);
    expect(b.api.mount(pool, false, 'hero')).toEqual(hero);
    expect(b.api.mount(pool, false)).toEqual(featured);
    const reload = browser(session, local, 'reload');
    expect(reload.api.mount(pool, true, 'hero')).not.toEqual(hero);
    expect(browser(session, local, 'back_forward').api.mount(pool, true, 'hero')).toEqual(reload.api.mount(pool, false, 'hero'));
  });
  it('changes only the failed hero, maps back to the full SSR positions and stops when exhausted', () => {
    const b = browser(); const first = b.api.mount(pool, true, 'hero');
    const second = b.api.mount(pool, false, 'hero', first);
    expect(second).toHaveLength(1); expect(second).not.toEqual(first);
    expect(b.styles['home-hero-visibility'].textContent).toContain(`nth-child(${pool.indexOf(second[0]) + 1})`);
    expect(b.api.mount(pool, false, 'hero', pool)).toEqual([]);
    expect(b.styles['home-hero-visibility'].textContent).toBe('#home-hero-list>.pm-hero-item{display:none}');
  });
  it.each([0,1,2])('handles %i hero candidates with blocked storage and stable SPA returns', count => {
    const b = browser(store({}, true), store({}, true)), small = pool.slice(0, count);
    const first = b.api.mount(small, true, 'hero');
    expect(first).toHaveLength(Math.min(1,count)); expect(b.api.mount(small, false, 'hero')).toEqual(first);
  });
  it("avoids this tab's previous hero even if another tab chose the other of two candidates", () => {
    const session = store({ 'prepmeal:home-hero:v1': JSON.stringify([pool[0]]) }), local = store({ 'prepmeal:home-hero:last:v1': JSON.stringify([pool[1]]) });
    expect(browser(session, local, 'reload').api.mount(pool.slice(0,2), true, 'hero')).toEqual([pool[1]]);
  });
});
