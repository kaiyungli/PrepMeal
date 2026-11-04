// Single source of truth for quantity display formatting
// Supports fractions, rounding, and unit-based rules

const UNIT_ALIASES: Record<string, string> = {
  // Mass
  '克': 'g', 'g': 'g', 'gram': 'g', 'grams': 'g', '千克': 'kg', 'kg': 'kg',
  // Volume  
  '毫升': 'ml', 'ml': 'ml', '公升': 'l', 'l': 'l', 'cc': 'ml',
  // Count
  '件': 'pc', '個': 'pc', 'pc': 'pc', 'piece': 'pc', 'pieces': 'pc',
  '瓣': 'clove', 'clove': 'clove',
  '片': 'slice', 'slice': 'slice',
  '條': 'stick', 'stick': 'stick',
  '隻': 'egg', 'egg': 'egg',
  '杯': 'cup', 'cup': 'cup', 'cups': 'cup',
  'tablespoon': 'tbsp', 'tablespoons': 'tbsp', '湯匙': 'tbsp',
  'teaspoon': 'tsp', 'teaspoons': 'tsp', '茶匙': 'tsp',
  '包': 'pack', 'pack': 'pack',
  '瓶': 'bottle', 'bottle': 'bottle',
  '罐': 'can', 'can': 'can',
  '袋': 'bag', 'bag': 'bag',
  '盒': 'box', 'box': 'box',
};

const COUNT_UNITS = ['pc', 'piece', 'clove', 'slice', 'stick', 'egg', 'pack', 'bottle', 'can', 'bag', 'box'];
const VOLUME_UNITS = ['ml', 'l', 'cc'];
const MASS_UNITS = ['g', 'kg', 'gram'];
const FRACTION_UNITS = ['tbsp', 'tsp', 'cup', 'tbsppoon', 'tsppoon'];

function normalizeUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  const normalized = String(unit).toLowerCase().trim();
  return UNIT_ALIASES[normalized] || normalized;
}

// Fraction map with tolerance
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
  // Stored one-person thirds are normalised to six decimal places.
  const tolerance = 5e-7;
  // Check for whole number + fraction
  const whole = Math.floor(q);
  const frac = q - whole;
  
  for (const [key, label] of Object.entries(FRACTIONS)) {
    if (Math.abs(frac - Number(key)) < tolerance) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }
  return null;
}

function readableMeasurement(qty: number): string {
  const magnitude = Math.abs(qty);
  // Keep tiny seasoning quantities nonzero, without showing calculation tails.
  const rounded = magnitude >= 10 ? Number(qty.toFixed(1))
    : magnitude >= 0.1 ? Number(qty.toFixed(2)) : Number(qty.toPrecision(2));
  const approximate = Math.abs(qty - rounded) > Math.max(magnitude * 1e-12, Number.MIN_VALUE);
  return `${approximate ? '約' : ''}${rounded}`;
}

export function formatQuantityForDisplay(quantity: number | null | undefined, unit: string | { code?: string; name?: string; display_name_zh?: string } | null | undefined, options: { roundCount?: boolean } = {}): string {
  if (quantity == null || !Number.isFinite(quantity)) return '';
  if (quantity === 0) return '0';
  
  const qty = quantity;
  const normUnit = normalizeUnit(typeof unit === 'object' && unit ? unit.code || unit.display_name_zh || unit.name : unit);
  
  // Measurement units retain small quantities (e.g. 0.15g of seasoning).
  if (MASS_UNITS.includes(normUnit) || VOLUME_UNITS.includes(normUnit)) {
    return readableMeasurement(qty);
  }
  
  // Cooking measures may use familiar exact fractions. Other amounts must
  // retain their value rather than rounding up to a larger spoon/cup.
  if (FRACTION_UNITS.includes(normUnit)) {
    const frac = findFraction(qty);
    if (frac) return frac;
    return readableMeasurement(qty);
  }
  
  // count units - round up to integer
  if (COUNT_UNITS.includes(normUnit)) {
    if (options.roundCount === false) return findFraction(qty) || readableMeasurement(qty);
    return Math.ceil(qty).toString();
  }
  
  // fallback: try fraction, else round up max 2 decimals
  const frac = findFraction(qty);
  if (frac) return frac;
  
  return (Math.ceil(qty * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
}

// Spoon measures read best in the size a cook reaches for: 3 茶匙 or more is
// shown in 湯匙, and amounts below 1/8 茶匙 are 少許. The stored quantity keeps
// its exact value, so scaling and shopping totals stay accurate.
const SPOON_ML: Record<string, number> = { tsp: 5, tbsp: 15 };
const SMALLEST_SPOON_ML = 0.625; // 1/8 茶匙
const SPOON_LABELS = {
  zh: { tsp: '茶匙', tbsp: '湯匙', pinch: '少許' },
  en: { tsp: 'tsp', tbsp: 'tbsp', pinch: 'a pinch' },
};

// The fractions a set of measuring spoons can show. 1/8 茶匙 is the smallest
// spoon on its own; other eighths (3/8, 5/8, 7/8) are not easy to measure.
const SPOON_FRACTIONS: Record<'tsp' | 'tbsp', Array<[number, string]>> = {
  tsp: [[0.25, '1/4'], [0.5, '1/2'], [0.75, '3/4']],
  tbsp: [[0.25, '1/4'], [1 / 3, '1/3'], [0.5, '1/2'], [2 / 3, '2/3'], [0.75, '3/4']],
};

function spoonMeasure(amount: number, unit: 'tsp' | 'tbsp'): string | null {
  const tolerance = 5e-7;
  const whole = Math.floor(amount + tolerance);
  const frac = amount - whole;
  if (Math.abs(frac) < tolerance) return whole > 0 ? String(whole) : null;
  if (unit === 'tsp' && whole === 0 && Math.abs(frac - 0.125) < tolerance) return '1/8';
  const match = SPOON_FRACTIONS[unit].find(([value]) => Math.abs(frac - value) < tolerance);
  if (!match) return null;
  return whole > 0 ? `${whole} ${match[1]}` : match[1];
}

function spoonText(ml: number, english: boolean): string {
  const labels = english ? SPOON_LABELS.en : SPOON_LABELS.zh;
  if (ml < SMALLEST_SPOON_ML - 1e-9) return labels.pinch;
  const tsp = ml / SPOON_ML.tsp;
  const tbsp = ml / SPOON_ML.tbsp;
  if (ml >= 15 - 1e-9) {
    const exactTbsp = spoonMeasure(tbsp, 'tbsp');
    if (exactTbsp) return `${exactTbsp} ${labels.tbsp}`;
    // Up to 2 湯匙, an even 茶匙 amount (e.g. 3 1/2 茶匙) reads better than
    // an odd 湯匙 fraction; above that, 14 1/2 茶匙 is too many spoons to count.
    const exactTsp = tsp < 6 - 1e-9 ? spoonMeasure(tsp, 'tsp') : null;
    if (exactTsp) return `${exactTsp} ${labels.tsp}`;
    const step = tbsp < 2 ? 4 : 2;
    return `約${spoonMeasure(Math.round(tbsp * step) / step, 'tbsp')} ${labels.tbsp}`;
  }
  const exactTsp = spoonMeasure(tsp, 'tsp');
  if (exactTsp) return `${exactTsp} ${labels.tsp}`;
  // Below 3/16 茶匙 the nearest spoon is the 1/8 茶匙 one.
  if (tsp < 0.1875) return `約1/8 ${labels.tsp}`;
  const rounded = Math.round(tsp * 4) / 4;
  if (rounded >= 3) return `約1 ${labels.tbsp}`;
  return `約${spoonMeasure(rounded, 'tsp')} ${labels.tsp}`;
}

type UnitInput = string | { code?: string; name?: string; display_name_zh?: string } | null | undefined;

// Quantity and unit label together, as a reader sees them.
export function formatAmountText(quantity: number | null | undefined, unit: UnitInput, unitLabel: string, options: { roundCount?: boolean } = {}): string {
  if (quantity == null || !Number.isFinite(quantity)) return '';
  const code = normalizeUnit(typeof unit === 'object' && unit ? unit.code || unit.display_name_zh || unit.name : unit);
  if (SPOON_ML[code] && quantity > 0) {
    return spoonText(quantity * SPOON_ML[code], /^[A-Za-z\s]+$/.test(unitLabel));
  }
  const formatted = formatQuantityForDisplay(quantity, unit, options);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export default formatQuantityForDisplay;
