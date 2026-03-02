// Meal Data - Chinese + Western
const MEALS = {
  dinner: [
    { name: '番茄炒蛋', category: '中式', ingredients: ['番茄', '雞蛋', '蔥', '鹽', '糖'], difficulty: 'Easy', time: '15分鐘' },
    { name: '青椒肉絲', category: '中式', ingredients: ['青椒', '豬肉', '蒜', '醬油', '糖'], difficulty: 'Medium', time: '20分鐘' },
    { name: '咖喱雞', category: '中式', ingredients: ['雞肉', '咖喱', '薯仔', '洋蔥', '椰漿'], difficulty: 'Medium', time: '40分鐘' },
    { name: '蒸魚', category: '中式', ingredients: ['魚', '薑', '蔥', '醬油', '油'], difficulty: 'Medium', time: '25分鐘' },
    { name: '麻婆豆腐', category: '中式', ingredients: ['豆腐', '豬肉', '辣豆瓣醬', '花椒', '蔥'], difficulty: 'Medium', time: '25分鐘' },
    { name: '蛋炒飯', category: '中式', ingredients: ['飯', '雞蛋', '蔥', '鹽', '醬油'], difficulty: 'Easy', time: '15分鐘' },
    { name: '羅宋湯', category: '西式', ingredients: ['牛肉', '番茄', '薯仔', '紅蘿蔔', '洋蔥'], difficulty: 'Medium', time: '60分鐘' },
    { name: '意大利麵', category: '西式', ingredients: ['意粉', '番茄醬', '蒜', '羅勒', '芝士'], difficulty: 'Easy', time: '20分鐘' },
    { name: '煎牛排', category: '西式', ingredients: ['牛排', '蒜', '迷迭香', '鹽', '黑胡椒'], difficulty: 'Medium', time: '25分鐘' },
    { name: '焗雞脾', category: '西式', ingredients: ['雞脾', '迷迭香', '蒜', '檸檬', '橄欖油'], difficulty: 'Medium', time: '45分鐘' },
    { name: '壽司卷', category: '日式', ingredients: ['米', '紫菜', '三文魚', '青瓜', '蛋'], difficulty: 'Hard', time: '45分鐘' },
    { name: '拉麵', category: '日式', ingredients: ['拉麵', '豚骨湯', '叉燒', '筍', '蛋'], difficulty: 'Medium', time: '30分鐘' },
    { name: '吉列豬扒', category: '日式', ingredients: ['豬扒', '麵包糠', '蛋', '椰絲', '鹽'], difficulty: 'Medium', time: '30分鐘' },
    { name: '親子井', category: '日式', ingredients: ['米', '雞肉', '蛋', '蔥', '醬汁'], difficulty: 'Easy', time: '25分鐘' },
    { name: '天婦羅', category: '日式', ingredients: ['蝦', '蔬菜', '天婦羅粉', '油', '蘿蔔'], difficulty: 'Hard', time: '35分鐘' },
  ],
  lunch: [
    { name: '叉燒飯', category: '港式', ingredients: ['叉燒', '飯', '蛋', '蔥', '醬汁'], difficulty: 'Easy', time: '20分鐘' },
    { name: '雲吞麵', category: '港式', ingredients: ['雲吞', '麵', '湯', '蔥', '韮菜'], difficulty: 'Easy', time: '15分鐘' },
    { name: '海南雞飯', category: '港式', ingredients: ['雞', '飯', '黃瓜', '醬汁', '湯'], difficulty: 'Medium', time: '40分鐘' },
    { name: '咖喱牛腩', category: '港式', ingredients: ['牛腩', '咖喱', '薯仔', '洋蔥'], difficulty: 'Medium', time: '60分鐘' },
    { name: '沙嗲牛肉', category: '港式', ingredients: ['牛肉', '沙嗲醬', '麵', '蔥', '豆芽'], difficulty: 'Easy', time: '20分鐘' },
    { name: '三文治', category: '西式', ingredients: ['麵包', '火腿', '芝士', '生菜', '番茄'], difficulty: 'Easy', time: '10分鐘' },
    { name: '凱撒沙律', category: '西式', ingredients: ['羅馬生菜', '雞肉', '麵包粒', '芝士', '凱撒醬'], difficulty: 'Easy', time: '15分鐘' },
    { name: '越式法包', category: '東南亞', ingredients: ['法包', '烤肉', '青瓜', '蔥', '醬汁'], difficulty: 'Easy', time: '15分鐘' },
    { name: '越南河粉', category: '東南亞', ingredients: ['河粉', '牛肉', '牛骨湯', '青豆', '檸檬'], difficulty: 'Medium', time: '30分鐘' },
    { name: '泰式炒飯', category: '東南亞', ingredients: ['飯', '蝦', '鳳梨', '腰果', '泰式醬'], difficulty: 'Medium', time: '20分鐘' },
  ]
};

export function generateWeeklyMenu(mealType = 'dinner', count = 7) {
  const meals = MEALS[mealType] || MEALS.dinner;
  const menu = [];
  const used = new Set();
  
  for (let i = 0; i < count; i++) {
    let meal;
    let attempts = 0;
    do {
      meal = meals[Math.floor(Math.random() * meals.length)];
      attempts++;
    } while (used.has(meal.name) && attempts < 20);
    
    used.add(meal.name);
    menu.push({
      day: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'][i],
      ...meal
    });
  }
  
  return menu;
}

export function generateShoppingList(menu) {
  const allIngredients = {};
  
  menu.forEach(meal => {
    meal.ingredients.forEach(ing => {
      if (allIngredients[ing]) {
        allIngredients[ing]++;
      } else {
        allIngredients[ing] = 1;
      }
    });
  });
  
  return Object.entries(allIngredients).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export default MEALS;
