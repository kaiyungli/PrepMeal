// Static full recipe data
const recipes = [
  { id: 1, name: "番茄炒蛋", cooking_time: 15, difficulty: "易", cuisine: "中式", calories: 180, description: "簡單美味既家常菜", image_url: "", tags: ["送飯", "簡易"], instructions: ["番茄切塊", "蛋發勻", "炒蛋", "加入番茄"] },
  { id: 2, name: "麻婆豆腐", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 280, description: "麻辣惹味既豆腐料理", image_url: "", tags: ["辣", "送飯"], instructions: ["豆腐切塊", "炒肉碎", "加入麻辣醬", "燜煮"] },
  { id: 3, name: "蔥花蒸水蛋", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 120, description: "嫩滑既蒸水蛋", image_url: "", tags: ["健康", "簡易"], instructions: ["蛋發勻", "加入蔥花", "加水調味", "蒸10分鐘"] }
]

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.setHeader('Content-Type', 'application/json')
  const { id } = req.query
  const recipe = recipes.find(r => r.id === parseInt(id))
  if (!recipe) return res.status(404).json({ error: "Not found" })
  res.status(200).json({ recipe })
}
