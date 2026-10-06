// Retired endpoint. Without this static route, /api/recipes/recommend would
// fall through to ./[id].js as a recipe slug lookup, so a recipe published
// with the slug "recommend" would silently answer the old URL.
export default function handler(req, res) {
  return res.status(404).json({ error: 'Not found' });
}
