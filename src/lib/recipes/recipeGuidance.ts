/** Display guidance uses catalogue codes, not translated labels. */
export interface GuidanceRecipe {
  method?: string | null;
  dish_type?: string | null;
  meal_role?: string | null;
  is_complete_meal?: boolean | null;
  primary_protein?: string | null;
}

export const STORAGE_GUIDANCE_SOURCE = 'https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_leftovers.html';

export function generateCookingTips(recipe: GuidanceRecipe): string[] {
  switch (recipe.method) {
    case 'stir_fry':
      return ['先備妥材料，再按食譜次序下鑊；份量較多時分批炒，避免材料出水。'];
    case 'fried':
      return ['下鑊前瀝乾食材表面水分；按食譜控制火力，避免油溫過高冒煙。'];
    case 'steamed':
      return ['水滾後才放入食材，按份量及厚度調整蒸煮時間，確認熟透。'];
    case 'baked':
      return ['按食譜預熱焗爐；焗爐火力有差異，完成前檢查食材熟度。'];
    case 'braised':
      return ['煮滾後按食譜轉小火，留意水分，避免收汁過乾或黏底。'];
    case 'boiled':
      return ['按食材所需時間分次加入，避免未熟或煮得過爛。'];
    case 'no_cook':
      return ['確認即食材料可直接食用；需預先煮熟的材料，先按食譜處理。'];
    default:
      return [];
  }
}

export function generatePairingSuggestions(recipe: GuidanceRecipe): string[] {
  if (recipe.meal_role === 'complete_meal' || recipe.is_complete_meal || recipe.dish_type === 'staple') {
    return ['這道飯麵可作主食，按已有材料搭配一份蔬菜或清湯。'];
  }
  switch (recipe.meal_role) {
    case 'protein_main':
      return ['可配適量白飯或其他主食，再加一份蔬菜。'];
    case 'protein_side':
      return ['可配主食及蔬菜，並按整餐份量決定是否另加主菜。'];
    case 'veg_side':
      return ['可搭配豆腐、蛋、魚或肉類主菜，再按需要配主食。'];
  }
  if (recipe.meal_role === 'soup' || recipe.dish_type === 'soup') {
    const hasProtein = !!recipe.primary_protein && recipe.primary_protein !== 'vegetarian';
    return [hasProtein
      ? '可配主食及蔬菜；湯內肉、魚或豆腐的份量較少時，可另加主菜。'
      : '可配主食及豆腐、蛋、魚或肉類主菜。'];
  }
  return [];
}

export function generateStorageTips(recipe: GuidanceRecipe): string[] {
  if (recipe.method === 'no_cook') {
    return ['拌好後盡快食用；易腐壞的材料及成品須保持冷藏，避免長時間放在室溫。',
      '如材料曾經煮熟，應分成小份或放入淺容器，盡快冷卻，並在兩小時內放進攝氏4度或以下的雪櫃。'];
  }
  return ['剩餘食物分成小份或放入淺容器，盡快冷卻，並在兩小時內放進攝氏4度或以下的雪櫃。',
    '食用前徹底翻熱至滾燙，只翻熱一次；每次只取出需要的份量。',
    '剩餘食物應盡早食用；冷藏超過三天的剩食應棄掉。'];
}
