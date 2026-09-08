/**
 * Pure shopping-list normalization + grouping for Mobile Slice 4C.
 *
 * Every rule here is PORTED VERBATIM from the web, so the mobile saved-plan
 * shopping list matches what `src/pages/api/shopping-list.ts` +
 * `src/features/shopping-list/mappers/mapShoppingListResponseToViewModel`
 * render on the web:
 *
 *   - `SHOPPING_CATEGORY_ORDER`, `SHOPPING_CATEGORY_META`
 *       <- src/features/shopping-list/constants/index.ts
 *   - `mapRawCategoryToKey` (full English-alias table)
 *       <- src/features/shopping-list/mappers/index.ts
 *   - `formatQuantityForDisplay` (+ its unit aliases / fraction table)
 *       <- src/lib/quantityFormatter.ts
 *   - `formatQuantityDisplay`
 *       <- src/features/shopping-list/types/index.ts
 *   - `normalizeUnitCode` (the small code map)
 *       <- src/pages/api/shopping-list.ts `normalizeUnit`
 *
 * The `get_menu_plan_shopping_list_json` RPC does the quantity aggregation
 * (sum by ingredient_id, servings scaling) server-side and returns RAW
 * category + unit fields; this module does exactly the presentation-side
 * mapping the web mapper does after the API responds.
 *
 * Deliberately zero imports so this file loads directly under `node --test`
 * and is unit-tested without a bundler or a live Supabase client -- the same
 * constraint `mapPlanItemsByDay.ts` and the other `lib/` helpers in this
 * feature follow.
 */

// ---------------------------------------------------------------------------
// Category taxonomy -- verbatim from src/features/shopping-list/constants
// ---------------------------------------------------------------------------

export type ShoppingCategoryKey =
  | 'meat'
  | 'seafood'
  | 'tofu_egg'
  | 'vegetable'
  | 'carb'
  | 'seasoning'
  | 'dairy'
  | 'frozen'
  | 'pantry'
  | 'other';

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

export const SHOPPING_CATEGORY_META: Record<
  ShoppingCategoryKey,
  { label: string; icon: string }
> = {
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

/**
 * Raw `ingredients.shopping_category` -> canonical key. Verbatim from
 * `src/features/shopping-list/mappers/index.ts::mapRawCategoryToKey`.
 */
export function mapRawCategoryToKey(
  raw: string | null | undefined,
): ShoppingCategoryKey {
  if (!raw) return 'other';

  const normalized = raw.toLowerCase().trim();

  if (normalized in SHOPPING_CATEGORY_META) {
    return normalized as ShoppingCategoryKey;
  }

  const aliases: Record<string, ShoppingCategoryKey> = {
    // Meat
    meat: 'meat',
    meats: 'meat',
    meat_seafood: 'meat',
    beef: 'meat',
    pork: 'meat',
    chicken: 'meat',
    lamb: 'meat',
    duck: 'meat',
    ham: 'meat',
    bacon: 'meat',
    sausage: 'meat',

    // Seafood
    seafood: 'seafood',
    seafoods: 'seafood',
    fish: 'seafood',
    shrimp: 'seafood',
    prawn: 'seafood',
    crab: 'seafood',
    squid: 'seafood',
    clam: 'seafood',
    oyster: 'seafood',
    mussels: 'seafood',
    scallop: 'seafood',

    // Tofu/Egg
    tofu: 'tofu_egg',
    tofu_products: 'tofu_egg',
    egg: 'tofu_egg',
    eggs: 'tofu_egg',

    // Vegetable
    vegetable: 'vegetable',
    vegetables: 'vegetable',
    produce: 'vegetable',
    mushroom: 'vegetable',
    mushrooms: 'vegetable',
    herb: 'vegetable',
    herbs: 'vegetable',
    onion: 'vegetable',
    scallion: 'vegetable',
    green_onion: 'vegetable',
    garlic: 'vegetable',
    ginger: 'vegetable',
    lemon: 'vegetable',
    lime: 'vegetable',

    // Carb
    carb: 'carb',
    staple: 'carb',
    grains: 'carb',
    rice: 'carb',
    noodles: 'carb',
    pasta: 'carb',
    bread: 'carb',
    noodle: 'carb',
    vermicelli: 'carb',

    // Seasoning
    seasoning: 'seasoning',
    seasonings: 'seasoning',
    condiments: 'seasoning',
    sauce: 'seasoning',
    spice: 'seasoning',
    spices: 'seasoning',

    // Dairy
    dairy: 'dairy',
    dairy_product: 'dairy',
    milk: 'dairy',
    cheese: 'dairy',
    yogurt: 'dairy',
    yoghurt: 'dairy',
    butter: 'dairy',
    cream: 'dairy',

    // Frozen
    frozen: 'frozen',
    frozen_food: 'frozen',

    // Pantry
    pantry: 'pantry',
    pantry_item: 'pantry',
    storage: 'pantry',

    // Other
    other: 'other',
    misc: 'other',
    others: 'other',
  };

  if (aliases[normalized]) return aliases[normalized];

  return 'other';
}

// ---------------------------------------------------------------------------
// Unit + quantity formatting
// ---------------------------------------------------------------------------

/**
 * Small raw-`code` normaliser -- verbatim from
 * `src/pages/api/shopping-list.ts::normalizeUnit`. Used only as the fallback
 * when the RPC returned no localized `unit_display`, mirroring the web's
 * `item.unitDisplay || item.unit` (where `item.unit` is this function's
 * output).
 */
export function normalizeUnitCode(unit: string | null | undefined): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  const map: Record<string, string> = {
    teaspoon: 'tsp',
    tsp: 'tsp',
    tablespoon: 'tbsp',
    tbsp: 'tbsp',
    milliliter: 'ml',
    ml: 'ml',
    liter: 'l',
    l: 'l',
    gram: 'g',
    g: 'g',
    kilogram: 'kg',
    kg: 'kg',
    cup: 'cup',
    piece: '件',
  };
  return map[u] || unit;
}

// -- everything below is verbatim from src/lib/quantityFormatter.ts ----------

const UNIT_ALIASES: Record<string, string> = {
  // Mass
  克: 'g',
  g: 'g',
  gram: 'g',
  grams: 'g',
  千克: 'kg',
  kg: 'kg',
  // Volume
  毫升: 'ml',
  ml: 'ml',
  公升: 'l',
  l: 'l',
  cc: 'ml',
  // Count
  件: 'pc',
  個: 'pc',
  pc: 'pc',
  piece: 'pc',
  pieces: 'pc',
  瓣: 'clove',
  clove: 'clove',
  片: 'slice',
  slice: 'slice',
  條: 'stick',
  stick: 'stick',
  隻: 'egg',
  egg: 'egg',
  杯: 'cup',
  cup: 'cup',
  包: 'pack',
  pack: 'pack',
  瓶: 'bottle',
  bottle: 'bottle',
  罐: 'can',
  can: 'can',
  袋: 'bag',
  bag: 'bag',
  盒: 'box',
  box: 'box',
};

const COUNT_UNITS = [
  'pc',
  'piece',
  'clove',
  'slice',
  'stick',
  'egg',
  'cup',
  'pack',
  'bottle',
  'can',
  'bag',
  'box',
];
const VOLUME_UNITS = ['ml', 'l', 'cc'];
const MASS_UNITS = ['g', 'kg', 'gram'];
const FRACTION_UNITS = ['tbsp', 'tsp', '湯匙', '茶匙', 'tbsppoon', 'tsppoon'];

function normalizeFormatterUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const normalized = String(unit).toLowerCase().trim();
  return UNIT_ALIASES[normalized] || normalized;
}

const FRACTIONS: Record<number, string> = {
  0.3333333333333333: '1/3',
  0.6666666666666666: '2/3',
  0.5: '1/2',
  0.25: '1/4',
  0.75: '3/4',
  0.125: '1/8',
  0.375: '3/8',
  0.625: '5/8',
  0.875: '7/8',
};

function findFraction(q: number): string | null {
  const tolerance = 0.02;
  const whole = Math.floor(q);
  const frac = q - whole;

  for (const [key, label] of Object.entries(FRACTIONS)) {
    if (Math.abs(frac - Number(key)) < tolerance) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }
  return null;
}

/** Verbatim from `src/lib/quantityFormatter.ts::formatQuantityForDisplay`. */
export function formatQuantityForDisplay(
  quantity: number,
  unit: string | null | undefined,
): string {
  if (!quantity || !unit) return '';

  const qty = quantity;
  const normUnit = normalizeFormatterUnit(unit);

  if (MASS_UNITS.includes(normUnit) || VOLUME_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }

  if (FRACTION_UNITS.includes(normUnit)) {
    const frac = findFraction(qty);
    if (frac) return frac;
    return (Math.ceil(qty * 2) / 2).toFixed(1).replace(/\.0$/, '');
  }

  if (COUNT_UNITS.includes(normUnit)) {
    return Math.ceil(qty).toString();
  }

  const frac = findFraction(qty);
  if (frac) return frac;

  return (Math.ceil(qty * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

/** Verbatim from `src/features/shopping-list/types/index.ts::formatQuantityDisplay`. */
export function formatQuantityDisplay(
  quantity: number | null,
  unitDisplay: string,
  quantityPending: boolean,
): string {
  if (quantityPending) {
    return '（數量待補）';
  }
  if (quantity === null || quantity === 0) {
    return '';
  }

  const formatted = formatQuantityForDisplay(quantity, unitDisplay);
  return unitDisplay ? `${formatted} ${unitDisplay}` : formatted;
}

// ---------------------------------------------------------------------------
// Grouping -- mirrors mapShoppingListResponseToViewModel's section build
// ---------------------------------------------------------------------------

/** One aggregated line as returned in `get_menu_plan_shopping_list_json`'s `items`. */
export interface RawShoppingListRow {
  ingredient_id: string | null;
  name: string | null;
  shopping_category: string | null;
  quantity: number | null;
  unit_code: string | null;
  unit_display: string | null;
}

export interface ShoppingListLine {
  ingredientId: string | null;
  name: string;
  /** Pre-formatted "6 隻" / "" -- ready to render. */
  quantityText: string;
}

export interface ShoppingListCategory {
  key: ShoppingCategoryKey;
  label: string;
  icon: string;
  items: ShoppingListLine[];
}

function toDisplayUnit(row: RawShoppingListRow): string {
  // Web: `item.unitDisplay || item.unit || ''` where `item.unit` is the
  // API's normalizeUnit(code) output.
  const display =
    typeof row.unit_display === 'string' ? row.unit_display.trim() : '';
  if (display !== '') return display;
  return normalizeUnitCode(row.unit_code);
}

/**
 * Raw RPC rows -> ordered, labelled categories with pre-formatted quantities.
 *
 *   - category via `mapRawCategoryToKey`
 *   - sections ordered by `SHOPPING_CATEGORY_ORDER`; empty sections dropped
 *   - within a section, input order is preserved (the RPC already sorts by
 *     `shopping_category, name`)
 *   - quantity text via `formatQuantityDisplay` (never pending for a
 *     `recipe_ingredients`-sourced line)
 *   - a row with no usable `name` is skipped (matches the API's
 *     `if (!ing || !ing.name) continue`)
 */
export function groupPlanShoppingList(
  rows: readonly RawShoppingListRow[] | null | undefined,
): ShoppingListCategory[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const byKey = new Map<ShoppingCategoryKey, ShoppingListLine[]>();

  for (const row of rows) {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    if (name === '') continue;

    const key = mapRawCategoryToKey(row.shopping_category);
    const line: ShoppingListLine = {
      ingredientId: row.ingredient_id ?? null,
      name,
      quantityText: formatQuantityDisplay(
        typeof row.quantity === 'number' ? row.quantity : null,
        toDisplayUnit(row),
        false,
      ),
    };

    const bucket = byKey.get(key);
    if (bucket) bucket.push(line);
    else byKey.set(key, [line]);
  }

  const result: ShoppingListCategory[] = [];
  for (const key of SHOPPING_CATEGORY_ORDER) {
    const items = byKey.get(key);
    if (!items || items.length === 0) continue;
    const meta = SHOPPING_CATEGORY_META[key];
    result.push({ key, label: meta.label, icon: meta.icon, items });
  }
  return result;
}
