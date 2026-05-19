// AdSense / Google Ads configuration
// Only enable when PUB_ID is set in environment

export const ADS_CONFIG = {
  // Publisher ID from AdSense - set via NEXT_PUBLIC_ADSENSE_PUB_ID
  pubId: process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || '',
  
  // Whether ads are enabled (requires valid pubId)
  isEnabled: Boolean(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID),
  
  // Ad placement flags per page
  pages: {
    home: false,
    recipes: false,
    recipeDetail: true,
    generate: false,
    myPlans: false,
    favorites: false,
    profile: false,
  },
  
  // Ad slot IDs (replace with actual IDs from AdSense)
  slots: {
    recipeDetailInArticle: '1234567890',
    recipeDetailBelowContent: '0987654321',
  },
};

export function isAdSenseEnabled(): boolean {
  return ADS_CONFIG.isEnabled && Boolean(ADS_CONFIG.pubId);
}
