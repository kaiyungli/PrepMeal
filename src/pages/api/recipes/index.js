// Ultra minimal - 3 recipes, just essential fields
const recipes = [
  { id: 1, name: "壽喜燒牛丼", cooking_time: 15, image_url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=300" },
  { id: 2, name: "咖喱雞", cooking_time: 40, image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=300" },
  { id: 3, name: "蕃茄烤雞", cooking_time: 45, image_url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=300" }
]

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.setHeader('Content-Type', 'application/json')
  res.status(200).send('{"recipes":' + JSON.stringify(recipes) + '}')
}
