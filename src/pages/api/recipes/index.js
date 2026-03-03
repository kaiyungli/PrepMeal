// Ultra minimal static data - instant response
const recipes = [
  { id: 1, name: "壽喜燒牛丼", cooking_time: 15, difficulty: "易", cuisine: "日式", calories: 450, image_url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400" },
  { id: 2, name: "咖喱雞", cooking_time: 40, difficulty: "中", cuisine: "中式", calories: 520, image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400" },
  { id: 3, name: "蕃茄烤雞", cooking_time: 45, difficulty: "中", cuisine: "西式", calories: 380, image_url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400" }
]

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  res.status(200).json({ recipes })
}
