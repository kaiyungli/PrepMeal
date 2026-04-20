// ============================================
// UI TEXT CONSTANTS - Centralized UI Strings
// ============================================
// Common UI text strings for consistency across the app

export const UI_TEXT = {
  // ============================================
  // BUTTONS
  // ============================================
  buttons: {
    generate: '一鍵生成',
    clear: '清空',
    save: '保存',
    savePlan: '保存餐單',
    shoppingList: '購物清單',
    delete: '刪除',
    confirm: '確認',
    cancel: '取消',
    close: '關閉',
    retry: '重試',
    back: '返回',
    login: '登入',
    logout: '登出',
    refresh: '重新整理',
  },

  // ============================================
  // PAGE TITLES
  // ============================================
  pageTitles: {
    home: '今晚食乜',
    recipes: '食譜',
    generate: '生成餐單',
    myPlans: '我的餐單',
    login: '登入',
    favorites: '我的收藏',
  },

  // ============================================
  // GENERATE PAGE
  // ============================================
  generatePage: {
    title: '一週餐單',
    subtitle: '為你安排每日晚餐，簡單方便',
    weeklyPlan: '一週餐單',
    daysPerWeek: '每週',
    dishesPerDay: '每日',
    servings: '份量',
  },

  // ============================================
  // RECIPES PAGE
  // ============================================
  recipesPage: {
    title: '食譜',
    noResults: '沒有找到符合的食譜',
    filters: '篩選',
  },

  // ============================================
  // TOAST MESSAGES
  // ============================================
  toasts: {
    loginRequired: '請先登入',
    loginRequiredToSave: '請先登入以保存餐單',
    loginRequiredToFavorite: '請先登入以收藏食譜',
    saveSuccess: '已保存餐單！',
    saveFailed: '保存失敗',
    noPlanToSave: '沒有餐單內容可以保存',
    deleteSuccess: '已刪除',
    deleteFailed: '刪除失敗',
    loading: '載入中...',
    copied: '已複製到剪貼簿',
  },

  // ============================================
  // RECIPE CARD / DETAIL
  // ============================================
  recipe: {
    noImage: '暫無圖片',
    noDescription: '暫無描述',
    noIngredients: '暫無食材資料',
    noSteps: '暫無步驟資料',
    ingredients: '食材',
    steps: '烹飪步驟',
    nutrition: '營養資料',
    difficulty: '難度',
    method: '烹調方式',
    time: '時間',
    calories: '卡路里',
    protein: '蛋白質',
    servings: '份量',
  },

  // ============================================
  // FILTERS
  // ============================================
  filters: {
    title: '篩選',
    clearAll: '清除全部',
    noFilters: '所有食譜',
    activeFilters: '已選',
    items: '項',
    // Filter group labels
    cuisine: '菜系',
    dishType: '類型',
    protein: '主要蛋白',
    method: '烹調方式',
    speed: '所需時間',
    difficulty: '難度',
    diet: '飲食需求',
    flavor: '口味（任選）',
  },

  // ============================================
  // MY PLANS PAGE
  // ============================================
  myPlans: {
    title: '我的餐單',
    noPlans: '暫無保存的餐單',
    createFirst: '去生成一個啦',
    deleteConfirm: '確定要刪除呢個餐單嗎？',
  },

  // ============================================
  // AUTH
  // ============================================
  auth: {
    loginTitle: '登入',
    loginSubtitle: '登入以保存餐單及收藏食譜',
    loginButton: '使用 Google 登入',
    emailPlaceholder: '電郵',
    passwordPlaceholder: '密碼',
  },

  // ============================================
  // FOOTER / META
  // ============================================
  meta: {
    tagline: '智能食譜搜尋及餐單生成',
    description: '搜尋食譜、生成一週餐單、自動購物清單',
  },
};
