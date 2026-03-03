// Database recipes (from Supabase)
const recipes = [
  { id: 1, name: "番茄炒蛋", cooking_time: 15, difficulty: "易", cuisine: "中式", calories: 180, image_url: "https://images.unsplash.com/photo-1482049016gyf0f470f0f5?w=400", tags: ["送飯", "簡易"], description: "簡單美味既家常菜", instructions: ["番茄切塊", "蛋發勻", "炒蛋", "加入番茄"] },
  { id: 2, name: "麻婆豆腐", cooking_time: 25, difficulty: "中", cuisine: "中式", calories: 280, image_url: "https://images.unsplash.com/photo-1582452919408-53c12f9a47d7?w=400", tags: ["辣", "送飯"], description: "麻辣惹味既豆腐料理", instructions: ["豆腐切塊", "炒肉碎", "加入麻辣醬", "燜煮"] },
  { id: 3, name: "蔥花蒸水蛋", cooking_time: 20, difficulty: "易", cuisine: "中式", calories: 120, image_url: "https://images.unsplash.com/photo-1482049016685-2?w=400", tags: ["健康", "簡易"], description: "嫩滑既蒸水蛋", instructions: ["蛋發勻", "加入蔥花", "加水調味", "蒸10分鐘"] }
]

// API endpoint
const SUPABASE_URL = 'https://hivnajhqqvaokthzhugx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpdm5hamhxcXZhb2t0aHpodWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzAzODgsImV4cCI6MjA4ODAwNjM4OH0.Y7V8xM0vP0K7r5X2t4dN9qG3jH6vL8cB1pS2wE5rT0'
