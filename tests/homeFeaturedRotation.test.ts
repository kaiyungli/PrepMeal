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
    __prepmealHomeFeatured: undefined as undefined | { mount: (pool: string[], fresh: boolean) => string[] } };
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
