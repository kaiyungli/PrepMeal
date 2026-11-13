import type { SamplePlanDish } from '@/features/guides/samplePlan';

// Homepage display labels only. Recipe identity and database names stay intact.
const SHORT_NAMES: Record<string, string> = {
  'prepmeal-batch3-16': '薑蔥豉油蒸豆腐',
  'prepmeal-batch4-15': '豉汁彩椒雞球',
};

export function sampleDishName(dish: SamplePlanDish): string {
  return SHORT_NAMES[dish.slug] ?? dish.name;
}
