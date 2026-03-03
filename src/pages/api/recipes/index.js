// Static data approach - serve from memory
// No Supabase call needed for initial load

const recipes = [
  {
    id: 1,
    name: "壽喜燒牛丼",
    cooking_time: 15,
    difficulty: "易",
    cuisine: "日式",
    calories: 450,
    description: "日式既牛肉蓋飯，香濃既醬汁配白飯",
    image_url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400",
    tags: ["送飯", "簡易"],
    instructions: ["洋蔥切絲", "煮醬汁", "加入牛肉", "燜10分鐘"]
  },
  {
    id: 2,
    name: "咖喱雞",
    cooking_time: 40,
    difficulty: "中",
    cuisine: "中式",
    calories: 520,
    description: "濃郁咖喱味既雞肉配飯",
    image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400",
    tags: ["送飯", "辣"],
    instructions: ["醃雞肉", "炒香洋蔥", "加入咖喱醬", "燜30分鐘"]
  },
  {
    id: 3,
    name: "蕃茄烤雞",
    cooking_time: 45,
    difficulty: "中",
    cuisine: "西式",
    calories: 380,
    description: "健康既蕃茄烤雞配蔬菜",
    image_url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=400",
    tags: ["健身", "健康"],
    instructions: ["醃雞肉", "鋪上蕃茄", "放入焗爐", "烤35分鐘"]
  }
]

export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  
  const { details } = req.query
  
  // Always return minimal data for homepage
  const minimalRecipes = recipes.map(r => ({
    id: r.id,
    name: r.name,
    cooking_time: r.cooking_time,
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    calories: r.calories,
    image_url: r.image_url,
  }))
  
  if (details === 'true') {
    // Return full data for detail view
    return res.status(200).json({ recipes })
  }
  
  // Return minimal data for homepage
  res.status(200).json({ recipes: minimalRecipes })
}
