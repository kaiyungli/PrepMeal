// Shopping Category Constants - Single Source of Truth

import type { ShoppingCategoryKey } from '../types';

export const SHOPPING_CATEGORY_ORDER: ShoppingCategoryKey[] = [
  'meat',
  'seafood',
  'tofu_egg',
  'vegetable',
  'carb',
  'seasoning',
  'dairy',
  'frozen',
  'pantry',
  'other',
];

export const SHOPPING_CATEGORY_META: Record<ShoppingCategoryKey, { label: string; icon: string }> = {
  meat: { label: '肉類', icon: '🥩' },
  seafood: { label: '海鮮', icon: '🦐' },
  tofu_egg: { label: '豆腐/蛋', icon: '🥚' },
  vegetable: { label: '蔬菜', icon: '🥬' },
  carb: { label: '主食', icon: '🍚' },
  seasoning: { label: '調味料', icon: '🧂' },
  dairy: { label: '乳製品', icon: '🧀' },
  frozen: { label: '雪櫃', icon: '🧊' },
  pantry: { label: '儲備', icon: '🥫' },
  other: { label: '其他', icon: '📦' },
};

export const CATEGORY_LABELS: Record<ShoppingCategoryKey, string> = Object.fromEntries(
  Object.entries(SHOPPING_CATEGORY_META).map(([k, v]) => [k, v.label])
) as Record<ShoppingCategoryKey, string>;

export const CATEGORY_ICONS: Record<ShoppingCategoryKey, string> = Object.fromEntries(
  Object.entries(SHOPPING_CATEGORY_META).map(([k, v]) => [k, v.icon])
) as Record<ShoppingCategoryKey, string>;
