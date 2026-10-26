// Verified against the owner's AdSense account on 2026-10-27.
// This is a public publisher identifier, not a secret or environment credential.
export const ADSENSE_CLIENT_ID = 'ca-pub-7449807224140811';

// No real ad unit was present in the reviewed account. Activation requires a
// reviewed code change adding the exact account-owned unit, not just an env edit.
export const VERIFIED_AD_SLOT_IDS: readonly string[] = [];

export function isVerifiedAdSlot(value: unknown, verified = VERIFIED_AD_SLOT_IDS): value is string {
  return typeof value === 'string' && /^\d{10}$/.test(value)
    && value !== '1234567890' && verified.includes(value);
}

const configuredSlot = (value: string | undefined) => isVerifiedAdSlot(value) ? value : '';
export const AD_SLOT_IDS = {
  recipeDetailInArticle: configuredSlot(process.env.NEXT_PUBLIC_AD_SLOT_IN_ARTICLE),
  recipeDetailBelowContent: configuredSlot(process.env.NEXT_PUBLIC_AD_SLOT_BELOW_CONTENT),
};

export const ADS_CONFIG = {
  pubId: ADSENSE_CLIENT_ID,
  isEnabled: Object.values(AD_SLOT_IDS).some(Boolean),
  pages: {
    home: false, recipes: false, recipeDetail: true, guides: true,
    generate: false, myPlans: false, favorites: false, profile: false,
  },
};

const PUBLIC_GUIDES = new Set([
  '/30-minute-dinner-recipes', '/50-classic-hk-recipes',
  '/7-day-dinner-plan', '/hong-kong-market-shopping-guide',
]);

// Use Next's route-file pathname, not a URL containing a query, private id or
// browser-controlled redirect. Unknown routes fail closed, including 404/500.
export function isPublicAdPage(pathname: string): boolean {
  return (pathname === '/recipes/[id]' && ADS_CONFIG.pages.recipeDetail)
    || (PUBLIC_GUIDES.has(pathname) && ADS_CONFIG.pages.guides);
}

export function isAdSenseEnabled(): boolean {
  return ADS_CONFIG.isEnabled;
}
