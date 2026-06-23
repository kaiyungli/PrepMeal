// Dynamic sitemap with recipe URLs
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://eatwhathk.com';

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

function escapeXml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toAbsoluteUrl(loc) {
  if (!loc) return BASE_URL;
  if (loc.startsWith('http')) return loc;
  return `${BASE_URL}${loc.startsWith('/') ? loc : '/' + loc}`;
}

function generateUrlEntry(url) {
  return `  <url>
    <loc>${escapeXml(toAbsoluteUrl(url.loc))}</loc>
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${url.priority}</priority>
  </url>`;
}

function generateSitemap(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(generateUrlEntry).join('\n')}
</urlset>`;
}

async function fetchRecipeSlugs() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      console.log('[sitemap] no supabase key');
      return [];
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('recipes')
      .select('slug')
      .eq('is_public', true)
      .limit(500);
    
    if (error) {
      console.log('[sitemap] query error:', error.message);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.log('[sitemap] exception:', err.message);
    return [];
  }
}

export async function getServerSideProps({ res }) {
  const urls = [...STATIC_URLS];
  
  // Fetch recipe slugs
  const recipes = await fetchRecipeSlugs();
  
  // Add recipe URLs
  if (recipes && recipes.length > 0) {
    for (const recipe of recipes) {
      if (recipe.slug) {
        urls.push({
          loc: `/recipes/${recipe.slug}`,
          changefreq: 'weekly',
          priority: 0.8,
        });
      }
    }
  }
  
  const sitemap = generateSitemap(urls);
  
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.end(sitemap);
  
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
