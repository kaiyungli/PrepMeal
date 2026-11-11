// This same file is bundled for client navigation and inlined before the SSR
// cards. Only an unmanaged, scoped stylesheet changes: React hydrates identical
// card markup, with no post-paint replacement or per-visitor catalogue request.
// Selection controls visibility only: visual, reading and keyboard order all
// follow the server-rendered DOM rather than the randomized draw order.
(function installHomeFeatured() {
  if (typeof window === 'undefined' || window.__prepmealHomeFeatured) return;
  const channels = new Map();
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
  function choose(pool, priors, count) {
    const shuffled = shuffle(pool);
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
    // If two tabs exhaust a tiny pool, prioritize this tab's previous choice.
    if (pool.length > count && same(chosen, priors[0])) {
      const replacement = shuffled.find(slug => !chosen.includes(slug));
      if (replacement) chosen[0] = replacement;
    }
    return chosen;
  }
  function mount(input, newDocument, channel = 'featured', excluded = []) {
    channel = channel === 'hero' ? 'hero' : 'featured';
    const sessionKey = `prepmeal:home-${channel}:v1`, previousKey = `prepmeal:home-${channel}:last:v1`;
    const hero = channel === 'hero';
    const pool = Array.from(new Set(input.filter(value => typeof value === 'string' && value)));
    const eligible = pool.filter(slug => !excluded.includes(slug)), count = Math.min(hero ? 1 : 3, eligible.length);
    let current = channels.get(channel);
    const session = storage('sessionStorage'), local = storage('localStorage');
    const saved = read(session, sessionKey), previous = read(local, previousKey);
    const usable = values => values && values.length === count && new Set(values).size === values.length && values.every(value => eligible.includes(value));
    const back = window.performance?.getEntriesByType('navigation')[0]?.type === 'back_forward';
    if (!(usable(current) && !newDocument)) {
      current = (!newDocument || back) && usable(saved) ? saved : choose(eligible, [saved, previous], count);
    }
    channels.set(channel, current);
    write(session, sessionKey, current); write(local, previousKey, current);
    const id = `home-${channel}-visibility`, selector = hero ? '#home-hero-list>.pm-hero-item' : '#home-featured-list>.pm-recipe-card';
    let style = document.getElementById(id);
    if (!style) { style = document.createElement('style'); style.id = id; document.head.appendChild(style); }
    style.textContent = selector + '{display:none}' + current.map(slug =>
      `${selector}:nth-child(${pool.indexOf(slug) + 1}){display:block}`).join('');
    return current.slice();
  }
  window.__prepmealHomeFeatured = { mount };
})();
