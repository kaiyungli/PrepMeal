// Dynamic sitemap with recipe URLs
// Use Supabase directly to avoid import issues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co';
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hivnajhqqvaokthzhugx.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY 
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return null;
  return createClient(url, key);
};

async function fetchRecipeSlugs() {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('[sitemap] no supabase client');
    return [];
  }
  
  try {
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

function toAbsoluteUrl(loc) {
  if (!loc) return BASE_URL;
  if (loc.startsWith('http')) return loc;
  return `${BASE_URL}${loc.startsWith('/') ? loc : '/' + loc}`;
}

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
    <loc>${escapeXml(toAbsoluteUrl(url.loc))}</loc>
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
      const recipes = await fetchRecipeSlugs();
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
    res.statusCode = 200; res.setHeader("Content-Type", "application/xml"); res.end(sitemap);
  } catch (err) {
    console.error('[sitemap] total error:', err.message);
    res.setHeader('Content-Type', 'application/xml');
    res.statusCode = 200; res.setHeader("Content-Type", "application/xml"); res.end(generateSitemap(STATIC_URLS));
  }
  
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
