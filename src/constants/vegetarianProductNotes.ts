// Composite products must be explicitly suitable for the recipe's vegetarian version.
// Do not certify an unspecified brand from its generic ingredient name.
const COMPOSITE_PRODUCTS = new Set([
  'kimchi', 'japanese-curry-roux', 'teriyaki-sauce', 'miso', 'miso-paste',
  'pesto', 'parmesan-cheese', 'bottled-roasted-sesame-dressing',
]);

export function vegetarianProductNote(diet: string[] | null | undefined, ingredients: Array<{ slug?: string | null; name?: string | null }>): string | null {
  if (!diet?.some(tag => tag === 'vegetarian' || tag === 'egg_lacto')) return null;
  const names = [...new Set(ingredients.filter(item => COMPOSITE_PRODUCTS.has(item.slug || '')).map(item => item.name).filter(Boolean))];
  return names.length ? `素食材料要求：${names.join('、')}須選包裝標明適合素食的產品，並核對配料；本配方容許蛋奶。` : null;
}
