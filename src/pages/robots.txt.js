/**
 * robots.txt for search engine crawlers
 */
export default function RobotsTxt() {
  return null;
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /

Sitemap: https://eatwhathk.com/sitemap.xml
`);
  return { props: {} };
}
