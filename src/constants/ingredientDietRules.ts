/**
 * Ingredient-Based Diet Rules
 * 
 * Shared source of truth for ingredient-composition based diet classification.
 * Used for deriving vegetarian and egg_lacto tags from actual recipe ingredients.
 * 
 * These are separate from nutrition-based rules (high_protein, low_fat, low_calorie)
 * because they require ingredient-level data, not just nutritional numbers.
 */

// ===== Positive Signals =====

/** Egg ingredients (positive indicator for egg_lacto) */
const EGG_INGREDIENTS = [
  'egg', 'eggs',
  '蛋', '雞蛋', '鸡蛋', '鵪鶉蛋', '鹹蛋', '咸蛋', '鴨蛋', '鸭蛋',
];

/** Dairy ingredients (positive indicator for egg_lacto) */
const DAIRY_INGREDIENTS = [
  'milk', 'cheese', 'butter', 'cream', 'yogurt',
  '牛奶', '芝士', '奶酪', '牛油', '忌廉', '酸奶', '乳酪',
  'mozzarella', 'parmesan', 'cheddar', 'feta', 'ricotta',
  'cream cheese', 'sour cream',
];

// ===== Negative Signals =====

/** 
 * Animal meat proteins that disqualify vegetarian/egg_lacto
 * 
 * IMPORTANT: Use specific terms only - avoid single characters or overly broad matches.
 * For example:
 * - '牛' is too broad (matches 牛奶, 牛油)
 * - '肉' is too broad (matches 肉桂, 肉燥)
 * Use specific terms like '牛肉', '雞肉' instead.
 */
const FORBIDDEN_ANIMAL_PROTEINS = [
  // Poultry (specific terms)
  'chicken', 'duck', 'turkey',
  '雞肉', '雞', '鸭肉', '鹅肉', '火雞',
  // Beef (specific terms - NOT '牛')
  'beef', '牛肉', '牛腩', '牛排', '和牛',
  // Pork (specific terms - NOT '肉')
  'pork', '猪肉', '豬肉', '五花肉', '里肌肉', 'bacon', 'ham', '香腸', '臘腸',
  // Fish (specific terms)
  'fish', 'salmon', 'tuna', 'cod', 'sea bream', 'dace', '鳕鱼', '三文鱼', '吞拿鱼',
  '魚', '鱼', '三文魚', '吞拿魚', '鱈魚',
  // Seafood (specific terms)
  'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'clam', 'mussel',
  '蝦', '虾', '龍蝦', '蟹', '青口', '蠔', '蜆',
  // Explicit catalogue compounds: do not infer animals from single Chinese
  // characters inside plant names (素雞, 魚腥草) or dairy from 牛油果.
  '鹽焗雞粉', '雞中翼', '雞胸肉', '雞腿肉', '去骨雞腿肉', '雞髀', '雞扒', '雞湯',
  '豬肉碎', '豬肉片', '免治豬肉', '免治牛肉', '牛肉片', '煙肉', '午餐肉',
  '鯛魚', '鯛魚柳', '鲷鱼', '鲷鱼柳', '魚柳', '鹹魚', '三文魚柳', '鱈魚柳',
  '豆豉鯪魚', '魚露', '蝦仁', '蝦米', '蟹柳', '蠔油', '雜錦海鮮',
  // Mixed / general meat terms (specific contexts only)
  'mixed meat', 'mixed seafood', 'meat', '肉類',
];

// ===== Types =====

/** Lightweight ingredient shape - minimal input for rule helpers */
export interface IngredientInput {
  name?: string | null;
  slug?: string | null;
}

export interface IngredientDietInput {
  ingredients: IngredientInput[];
}

/**
 * Normalize ingredient value for matching
 * - lowercase
 * - trim whitespace
 * - handle null/undefined
 */
function normalizeIngredientValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().trim();
}

/**
 * Check if an ingredient matches any of the given signals
 * Matches complete terms in both languages. Chinese compounds must be listed
 * explicitly; substring matching confuses 牛油果 with 牛油 and 素雞 with 雞.
 */
function matchesAnySignal(ingredient: IngredientInput, signals: string[]): boolean {
  const values = [ingredient.name, ingredient.slug].map((value) =>
    normalizeIngredientValue(value).replace(/-/g, ' '));
  return values.some((value) => signals.some((signal) => {
    const term = normalizeIngredientValue(signal);
    return (` ${value} `).includes(` ${term} `);
  }));
}

// Remove only the misleading words in known compounds, independently in each
// field. A mushroom alias must never hide meat in another field/ingredient.
function animalSignalInput(ingredient: IngredientInput): IngredientInput {
  const mask = (value: string | null | undefined) => normalizeIngredientValue(value)
    .replace(/-/g, ' ')
    .replace(/\b(?:king )?oyster mushrooms?\b/g, '')
    .replace(/\b(?:chicken|duck|quail) eggs?\b/g, '')
    .replace(/(?:雞|鸡|鴨|鸭|鵪鶉|鹌鹑)蛋/g, '')
    .replace(/(?:蠔|蚝)菇/g, '');
  return { name: mask(ingredient.name), slug: mask(ingredient.slug) };
}

/**
 * Check if recipe contains any forbidden animal protein
 * 
 * Returns true if ANY forbidden ingredient is found
 */
export function containsForbiddenAnimalProtein(input: IngredientDietInput): boolean {
  const { ingredients } = input;
  
  if (!ingredients || ingredients.length === 0) {
    return false; // Empty = can't prove it's non-vegetarian
  }
  
  for (const ingredient of ingredients) {
    if (matchesAnySignal(animalSignalInput(ingredient), FORBIDDEN_ANIMAL_PROTEINS)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if recipe contains any egg ingredient
 */
export function containsEgg(input: IngredientDietInput): boolean {
  const { ingredients } = input;
  
  if (!ingredients || ingredients.length === 0) {
    return false;
  }
  
  for (const ingredient of ingredients) {
    if (matchesAnySignal(ingredient, EGG_INGREDIENTS)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if recipe contains any dairy ingredient
 */
export function containsDairy(input: IngredientDietInput): boolean {
  const { ingredients } = input;
  
  if (!ingredients || ingredients.length === 0) {
    return false;
  }
  
  for (const ingredient of ingredients) {
    if (matchesAnySignal(ingredient, DAIRY_INGREDIENTS)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if recipe contains any egg OR dairy ingredient
 */
export function containsEggOrDairy(input: IngredientDietInput): boolean {
  return containsEgg(input) || containsDairy(input);
}

/**
 * Determine if recipe is vegetarian by ingredient composition
 * 
 * Returns true ONLY if:
 * - Recipe has at least one ingredient
 * - NO forbidden animal proteins present
 * 
 * Note: An empty ingredient list returns false (can't prove vegetarian)
 */
export function isRecipeVegetarianByIngredients(input: IngredientDietInput): boolean {
  const { ingredients } = input;
  
  // Empty or null = can't prove vegetarian
  if (!ingredients || ingredients.length === 0) {
    return false;
  }
  
  // Must have NO forbidden animal proteins
  return !containsForbiddenAnimalProtein(input);
}

/**
 * Determine if recipe is egg_lacto by ingredient composition
 * 
 * Returns true ONLY if:
 * - Recipe is vegetarian (no forbidden animal proteins)
 * - Contains at least one egg OR dairy ingredient
 * 
 * Note: egg_lacto is a SUBSET of vegetarian
 */
export function isRecipeEggLactoByIngredients(input: IngredientDietInput): boolean {
  // Must first be vegetarian
  if (!isRecipeVegetarianByIngredients(input)) {
    return false;
  }
  
  // Must contain egg OR dairy
  return containsEggOrDairy(input);
}

/**
 * Get all diet tags derived from ingredients
 * Returns vegetarian + egg_lacto based on ingredient composition
 */
export function deriveIngredientDietTags(input: IngredientDietInput): string[] {
  const tags: string[] = [];
  
  if (isRecipeVegetarianByIngredients(input)) {
    tags.push('vegetarian');
  }
  
  if (isRecipeEggLactoByIngredients(input)) {
    tags.push('egg_lacto');
  }
  
  return tags;
}
