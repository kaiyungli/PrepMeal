// An editor-chosen example of what the generator produces: two people, five
// dinners, 一肉一菜. Dishes are looked up in current public data and the
// shopping list is calculated by the same code as the planner's list.

export const SAMPLE_PLAN_SERVINGS = 2;

export const SAMPLE_PLAN_DAYS: { day: string; slugs: string[]; note: string }[] = [
  { day: '第一天', slugs: ['steamed-pork-patty', 'garlic-romaine-lettuce'], note: '肉餅蒸緊嗰十幾分鐘炒油麥菜，兩道一齊上枱。' },
  { day: '第二天', slugs: ['black-bean-steamed-fish-fillet', 'garlic-broccoli'], note: '魚柳要預早一晚放雪櫃解凍；西蘭花比葉菜耐放，可以同頭兩晚嘅菜一齊買。' },
  { day: '第三天', slugs: ['mapo-tofu', 'stir-fried-bok-choy'], note: '麻婆豆腐同第一晚肉餅都用豬肉碎，可以一次過買，第三晚嗰份買返嚟就分好放冰格。' },
  { day: '第四天', slugs: ['curry-chicken', 'garlic-lettuce'], note: '咖哩雞要煮耐啲，先開爐炆雞，最後先炒生菜。' },
  { day: '第五天', slugs: ['garlic-chicken-wings', 'garlic-spinach'], note: '雞翼可以前一晚醃定；菠菜同其他葉菜一樣，買返嚟盡快食。' },
];

// Keep the five-night guide unchanged; the homepage shows all seven dinners.
export const HOME_SAMPLE_PLAN_DAYS = [
  ...SAMPLE_PLAN_DAYS,
  { day: '第六天', slugs: ['prepmeal-batch3-16', 'poached-baby-napa'], note: '先蒸豆腐，再煮娃娃菜；白飯另計。' },
  { day: '第七天', slugs: ['prepmeal-batch4-15', 'poached-spinach-broth'], note: '葉菜可於週中補買，按包裝指示保存。' },
];

export const SAMPLE_PLAN_SLUGS = SAMPLE_PLAN_DAYS.flatMap(d => d.slugs);

export interface SamplePlanDish { slug: string; name: string; image_url?: string | null; total_time_minutes: number | null }

export interface SamplePlanItem { name: string; quantityText: string; dishCount: number; category: string }

export interface SamplePlan {
  servings: number;
  days: { day: string; note: string; dishes: SamplePlanDish[] }[];
  sections: { key: string; label: string; items: SamplePlanItem[] }[];
  itemCount: number;
  /** Ingredients that appear in more than one dish. */
  sharedItems: SamplePlanItem[];
}
