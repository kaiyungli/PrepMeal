// ============================================
// FILTER GROUPS CONFIG - Reusable Filter Definitions
// ============================================
// Build filter group definitions from taxonomy constants

import {
  CUISINE_MAP,
  CUISINE_OPTIONS,
  DISH_TYPE_MAP,
  DISH_TYPE_OPTIONS,
  PROTEIN_MAP,
  PROTEIN_OPTIONS,
  METHOD_MAP,
  METHOD_OPTIONS,
  SPEED_MAP,
  SPEED_OPTIONS,
  DIFFICULTY_MAP,
  DIFFICULTY_OPTIONS,
  DIET_MAP,
  DIET_OPTIONS,
  FLAVOR_MAP,
  FLAVOR_OPTIONS,
} from './taxonomy';

// ============================================
// RECIPE FILTER GROUPS (8 groups)
// ============================================
export const RECIPE_FILTER_GROUPS = [
  {
    key: 'cuisine',
    label: '菜系',
    options: CUISINE_OPTIONS,
  },
  {
    key: 'dish_type',
    label: '類型',
    options: DISH_TYPE_OPTIONS,
  },
  {
    key: 'protein',
    label: '主要蛋白',
    options: PROTEIN_OPTIONS,
  },
  {
    key: 'method',
    label: '烹調方式',
    options: METHOD_OPTIONS,
  },
  {
    key: 'speed',
    label: '所需時間',
    options: SPEED_OPTIONS,
  },
  {
    key: 'difficulty',
    label: '難度',
    options: DIFFICULTY_OPTIONS,
  },
  {
    key: 'diet',
    label: '飲食需求',
    options: DIET_OPTIONS,
  },
  {
    key: 'flavor',
    label: '口味',
    options: FLAVOR_OPTIONS,
  },
];

// ============================================
// GENERATE FILTER GROUPS (6 groups - fewer for generation context)
// ============================================
export const GENERATE_FILTER_GROUPS = [
  {
    key: 'cuisine',
    label: '菜系',
    options: CUISINE_OPTIONS,
  },
  {
    key: 'protein',
    label: '主要蛋白',
    options: PROTEIN_OPTIONS,
  },
  {
    key: 'method',
    label: '烹調方式',
    options: METHOD_OPTIONS,
  },
  {
    key: 'speed',
    label: '所需時間',
    options: SPEED_OPTIONS,
  },
  {
    key: 'difficulty',
    label: '難度',
    options: DIFFICULTY_OPTIONS,
  },
  {
    key: 'diet',
    label: '飲食需求',
    options: DIET_OPTIONS,
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build UI-ready filter sections from groups
 * @param groups - Array of filter groups
 * @param selected - Current selected values as Record<string, string[]>
 * @param onToggle - Function to handle toggle
 */
export function buildFilterSections(
  groups: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
  }>,
  selected: Record<string, string[]>,
  onToggle: (key: string, value: string) => void
): Array<{
  id: string;
  title: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
}> {
  return groups.map(group => ({
    id: group.key,
    title: group.label,
    options: group.options,
    selected: selected[group.key] || [],
    onToggle: (value: string) => onToggle(group.key, value),
  }));
}

// ============================================
// EXPORTS BY KEY (for direct access)
// ============================================
export const FILTER_GROUPS_BY_KEY = {
  cuisine: { key: 'cuisine', label: '菜系', options: CUISINE_OPTIONS },
  dish_type: { key: 'dish_type', label: '類型', options: DISH_TYPE_OPTIONS },
  protein: { key: 'protein', label: '主要蛋白', options: PROTEIN_OPTIONS },
  method: { key: 'method', label: '烹調方式', options: METHOD_OPTIONS },
  speed: { key: 'speed', label: '所需時間', options: SPEED_OPTIONS },
  difficulty: { key: 'difficulty', label: '難度', options: DIFFICULTY_OPTIONS },
  diet: { key: 'diet', label: '飲食需求', options: DIET_OPTIONS },
  flavor: { key: 'flavor', label: '口味', options: FLAVOR_OPTIONS },
};
