/**
 * sitemap.xml for SEO
 */
import { fetchRecipesForServer } from '@/lib/recipesServer';

const BASE_URL = 'https://eatwhathk.com';

const STATIC_PAGES = [
  { path: '/', priority: '1.0', freq: 'weekly' },
  { path: '/generate', priority: '0.8', freq: 'weekly' },
  { path: '/recipes', priority: '0.8', freq: 'daily' },
  { path: '/my-plans', priority: '0.8', freq: 'weekly' },
  { path: '/favorites', priority: '0.8', freq: 'weekly' },
  { path: '/privacy', priority: '0.5', freq: 'monthly' },
];

export default function SitemapXml() {
  return null;
}

export async function getServerSideProps({ res }) {
  let recipes = [];
  try {
    recipes = await fetchRecipesForServer(500) || [];
  } catch (e) {
    recipes = [];
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of STATIC_PAGES) {
    xml += `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  for (const recipe of recipes) {
    if (recipe.slug) {
      xml += `
  <url>
    <loc>${BASE_URL}/recipes/${recipe.slug}</loc>
    <lastmod>${(recipe.created_at || '2026-01-01').split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }
  }

  xml += `
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(xml);
  return { props: {} };
}
