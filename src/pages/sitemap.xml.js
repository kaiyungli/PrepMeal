// Dynamic sitemap with recipe URLs
import { fetchRecipesForServer } from '@/lib/recipesServer';

export const dynamic = 'force-dynamic';

// Static pages to always include
const STATIC_URLS = [
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/generate', changefreq: 'weekly', priority: 0.9 },
  { loc: '/recipes', changefreq: 'daily', priority: 0.9 },
  { loc: '/contact', changefreq: 'monthly', priority: 0.6 },
  { loc: '/about', changefreq: 'monthly', priority: 0.6 },
  { loc: '/privacy', changefreq: 'monthly', priority: 0.5 },
  { loc: '/terms', changefreq: 'monthly', priority: 0.5 },
  { loc: '/faq', changefreq: 'monthly', priority: 0.6 },
  { loc: '/meal-plan-example', changefreq: 'weekly', priority: 0.8 },
  { loc: '/hk-dinner-ideas', changefreq: 'weekly', priority: 0.8 },
  { loc: '/ingredient-pairing-guide', changefreq: 'weekly', priority: 0.8 },
  { loc: '/healthy-dinner-guide', changefreq: 'weekly', priority: 0.8 },
];

const BASE_URL = 'https://eatwhathk.com';

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateUrlEntry(url) {
  return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
}

function generateSitemap(urls) {
  const urlEntries = urls.map(generateUrlEntry).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  try {
    const urls = [...STATIC_URLS];
    
    try {
      const recipes = await fetchRecipesForServer(500);
      if (recipes && Array.isArray(recipes)) {
        for (const recipe of recipes) {
          if (recipe.slug && typeof recipe.slug === 'string') {
            urls.push({
              loc: `${BASE_URL}/recipes/${recipe.slug}`,
              changefreq: 'weekly',
              priority: 0.8,
            });
          }
        }
      }
    } catch (fetchErr) {
      console.error('[sitemap] recipe fetch error:', fetchErr.message);
    }
    
    const sitemap = generateSitemap(urls);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    res.status(200).send(sitemap);
  } catch (err) {
    console.error('[sitemap] total error:', err.message);
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(generateSitemap(STATIC_URLS));
  }
  
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
