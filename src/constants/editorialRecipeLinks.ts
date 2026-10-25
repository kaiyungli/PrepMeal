// Verified against the public recipe catalogue on 2026-10-20.
// Only equivalent dishes get permanent redirects; unavailable dishes keep a 404.
export const editorialRecipeAliases: Record<string, string> = {
  "corn-egg-drop-soup": "corn-egg-drop-soup-xhs",
  "seaweed-egg-drop-soup": "seaweed-egg-drop-soup-xhs",
  "curry-beef-rice": "curry-beef-brisket-rice",
  "tomato-pork-rice": "tomato-pork-chop-rice",
  "creamy-seafood-rice": "white-sauce-seafood-rice",
  "stir-fried-choi-sum": "stir-fried-choy-sum",
  "oyster-sauce-broccoli": "oyster-broccoli",
  "baby-bok-choy-soup": "poached-baby-napa",
  "wood-ear-salad": "cold-black-fungus-xhs",
  "cucumber-glass-noodle-salad": "cucumber-vermicelli-salad",
  "pan-seared-salmon": "pan-fried-salmon",
  "dry-fried-beef-hor-fun": "beef-chow-fun"
};

export const unavailableEditorialRecipes = new Set([
  "braised-potato-beef",
  "onion-beef-brisket",
  "cantonese-clay-pot-rice",
  "braised-chicken-wings",
  "steamed-chicken",
  "mushroom-steamed-chicken",
  "garlic-choi-sum",
  "stir-fried-broccoli",
  "ginger-scallion-crab",
  "shrimp-vermicelli-pot",
  "tofu-steamed-pork",
  "yu-xiang-tofu",
  "stuffed-tofu",
  "taiwan-egg-pancake",
  "hong-kong-milk-tea",
  "lemon-tea",
  "mango-pomelo-soup",
  "cheesecake",
  "red-bean-soup",
  "seafood-fried-rice",
  "singapore-noodles",
  "wonton-noodles",
  "street-food-noodles"
]);

export function editorialRecipeHref(slug: string): string | null {
  if (unavailableEditorialRecipes.has(slug)) return null;
  return `/recipes/${editorialRecipeAliases[slug] || slug}`;
}

