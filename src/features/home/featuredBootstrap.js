// This same file is bundled for client navigation and inlined before the SSR
// cards. Only an unmanaged, scoped stylesheet changes: React hydrates identical
// card markup, with no post-paint replacement or per-visitor catalogue request.
// Selection controls visibility only: visual, reading and keyboard order all
// follow the server-rendered DOM rather than the randomized draw order.
(function installHomeFeatured() {
  if (typeof window === 'undefined' || window.__prepmealHomeFeatured) return;
  const sessionKey = 'prepmeal:home-featured:v1';
  const previousKey = 'prepmeal:home-featured:last:v1';
  let current = null;
  function read(store, key) {
    try { const value = JSON.parse(store.getItem(key)); return Array.isArray(value) ? value.filter(v => typeof v === 'string') : []; }
    catch { return []; }
  }
  function write(store, key, value) { try { store.setItem(key, JSON.stringify(value)); } catch { /* Memory still preserves SPA returns. */ } }
  function storage(name) { try { return window[name]; } catch { return null; } }
  function same(a, b) { return a.length === b.length && a.every(value => b.includes(value)); }
  function shuffle(values) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      let random;
      try { random = window.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; } catch { random = Math.random(); }
      const j = Math.floor(random * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function choose(pool, priors) {
    const shuffled = shuffle(pool), count = Math.min(3, pool.length);
    const previous = new Set(priors.flat());
    const ordered = shuffled.filter(slug => !previous.has(slug)).concat(shuffled.filter(slug => previous.has(slug)));
    const chosen = ordered.slice(0, count);
    if (pool.length > count && priors.some(prior => same(chosen, prior))) {
      for (const slug of shuffled.filter(value => !chosen.includes(value))) {
        for (let i = 0; i < chosen.length; i++) {
          const alternative = chosen.slice(); alternative[i] = slug;
          if (!priors.some(prior => same(alternative, prior))) return alternative;
        }
      }
    }
    return chosen;
  }
  function mount(input, newDocument) {
    const pool = Array.from(new Set(input.filter(value => typeof value === 'string' && value)));
    if (!pool.length) return [];
    const session = storage('sessionStorage'), local = storage('localStorage');
    const saved = read(session, sessionKey), previous = read(local, previousKey);
    const usable = values => values && values.length === Math.min(3, pool.length) && new Set(values).size === values.length && values.every(value => pool.includes(value));
    const back = window.performance?.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (!(usable(current) && !newDocument)) {
      current = (!newDocument || back) && usable(saved) ? saved : choose(pool, [saved, previous]);
    }
    write(session, sessionKey, current); write(local, previousKey, current);
    let style = document.getElementById('home-featured-visibility');
    if (!style) { style = document.createElement('style'); style.id = 'home-featured-visibility'; document.head.appendChild(style); }
    style.textContent = '#home-featured-list>.pm-recipe-card{display:none}' + current.map(slug =>
      `#home-featured-list>.pm-recipe-card:nth-child(${pool.indexOf(slug) + 1}){display:grid}`).join('');
    return current.slice();
  }
  window.__prepmealHomeFeatured = { mount };
})();
