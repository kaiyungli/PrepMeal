import { afterEach, describe, expect, it, vi } from 'vitest';
import { ADSENSE_CLIENT_ID, ADS_CONFIG, AD_SLOT_IDS, isAdSenseEnabled, isPublicAdPage, isVerifiedAdSlot } from '@/constants/ads';

afterEach(() => { vi.unstubAllGlobals(); });

describe('reviewed advertising policy', () => {
  it('uses the owner-verified publisher and keeps unreviewed units off', () => {
    expect(ADSENSE_CLIENT_ID).toBe('ca-pub-7449807224140811');
    expect(ADS_CONFIG.pubId).toBe(ADSENSE_CLIENT_ID);
    expect(isAdSenseEnabled()).toBe(false);
    expect(Object.values(AD_SLOT_IDS).every(value => value === '')).toBe(true);
    expect(isVerifiedAdSlot('9876543210')).toBe(false);
  });
  it('rejects the known sample and malformed ids even if mistakenly reviewed', () => {
    for (const value of ['', '1234567890', ' 9876543210', '9876543210 ', 'x9876543210', '98765', '9876543210/']) {
      expect(isVerifiedAdSlot(value, [value])).toBe(false);
    }
    expect(isVerifiedAdSlot('9876543210', ['9876543210'])).toBe(true);
  });
  it.each(['/login', '/auth/callback', '/account-help', '/generate', '/my-plans', '/my-plans/private', '/favorites', '/profile', '/admin', '/api/shopping-list', '/404', '/500', '/_error', '/', '/recipes', '/privacy', '/new-page', '/recipes/[id]?redirect=/login'])('denies %s', route => {
    expect(isPublicAdPage(route)).toBe(false);
  });
  it.each(['/recipes/[id]', '/30-minute-dinner-recipes', '/50-classic-hk-recipes', '/7-day-dinner-plan', '/hong-kong-market-shopping-guide'])('permits only designated public route %s', route => {
    expect(isPublicAdPage(route)).toBe(true);
  });
});

describe('lazy SDK loading', () => {
  function browserDocument() {
    const scripts: Array<{ dataset: Record<string, string>; remove: ReturnType<typeof vi.fn>; onload?: () => void; onerror?: () => void; src?: string }> = [];
    vi.stubGlobal('document', {
      createElement: vi.fn(() => { const script = { dataset: {}, remove: vi.fn() }; scripts.push(script); return script; }),
      head: { appendChild: vi.fn() },
    });
    return scripts;
  }
  it('deduplicates simultaneous slots and uses only the verified publisher', async () => {
    vi.resetModules();
    const scripts = browserDocument();
    const { loadAdSense } = await import('@/components/ads/loadAdSense');
    const a = loadAdSense(); const b = loadAdSense();
    expect(a).toBe(b); expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`);
    scripts[0].onload?.();
    await expect(a).resolves.toBeUndefined();
    expect(scripts[0].dataset.prepmealAdsense).toBe('ready');
  });
  it('removes a failed script and allows a later mount to retry', async () => {
    vi.resetModules();
    const scripts = browserDocument();
    const { loadAdSense } = await import('@/components/ads/loadAdSense');
    const a = loadAdSense(); const rejected = expect(a).rejects.toThrow('AdSense unavailable');
    scripts[0].onerror?.(); await rejected;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    const b = loadAdSense(); expect(scripts).toHaveLength(2);
    scripts[1].onload?.(); await b;
  });
});
