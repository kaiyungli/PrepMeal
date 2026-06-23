// Dynamic sitemap - returns static URLs
// Recipe URLs can be added when Supabase is properly configured in Vercel

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

export async function getServerSideProps({ res }) {
  const sitemap = generateSitemap(STATIC_URLS);
  
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.end(sitemap);
  
  return { props: {} };
}

export default function Sitemap() {
  return null;
}