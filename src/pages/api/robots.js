/**
 * robots.txt API
 */
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: https://eatwhathk.com/sitemap.xml
`);
}
