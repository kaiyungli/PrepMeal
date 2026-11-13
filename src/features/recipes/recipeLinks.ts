// Crawlable internal links between recipe pages: the full recipe index on
// /recipes and the "配咩食" / "同類食譜" links on every recipe page.

export interface LinkRecipe {
  slug: string;
  name: string;
  meal_role?: string | null;
  is_complete_meal?: boolean | null;
  primary_protein?: string | null;
  cuisine?: string | null;
}

export interface RecipeLink { slug: string; name: string }

export interface RecipeIndexGroup { key: string; title: string; recipes: RecipeLink[] }

const INDEX_GROUPS: { key: string; title: string }[] = [
  { key: 'protein_main', title: '主菜' },
  { key: 'protein_side', title: '小菜' },
  { key: 'veg_side', title: '蔬菜' },
  { key: 'soup', title: '湯' },
  { key: 'complete_meal', title: '飯麵及一人完整餐' },
];

const roleOf = (r: LinkRecipe): string =>
  r.is_complete_meal ? 'complete_meal' : r.meal_role || 'other';

const toLink = (r: LinkRecipe): RecipeLink => ({ slug: r.slug, name: r.name });

const byName = (a: RecipeLink, b: RecipeLink) => a.name.localeCompare(b.name, 'zh-Hant-HK');

// A repeated catalogue row must not create duplicate anchors or recommendations.
function uniqueRecipes(catalogue: LinkRecipe[]): LinkRecipe[] {
  const seen = new Set<string>();
  return catalogue.filter(recipe => {
    if (!recipe.slug || !recipe.name || seen.has(recipe.slug)) return false;
    seen.add(recipe.slug);
    return true;
  });
}

/** Every public recipe, grouped by meal role and sorted by name. */
export function groupRecipeIndex(catalogue: LinkRecipe[]): RecipeIndexGroup[] {
  const usable = uniqueRecipes(catalogue);
  const groups = INDEX_GROUPS.map(g => ({
    ...g,
    recipes: usable.filter(r => roleOf(r) === g.key).map(toLink).sort(byName),
  }));
  const known = new Set(INDEX_GROUPS.map(g => g.key));
  const other = usable.filter(r => !known.has(roleOf(r))).map(toLink).sort(byName);
  if (other.length) groups.push({ key: 'other', title: '其他', recipes: other });
  return groups.filter(g => g.recipes.length > 0);
}

// Stable per-page order: the same recipe always shows the same links, but
// different recipes spread their links across the catalogue.
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(candidates: LinkRecipe[], seed: string, count: number): RecipeLink[] {
  return [...candidates]
    .sort((a, b) => hash(seed + a.slug) - hash(seed + b.slug) || a.slug.localeCompare(b.slug))
    .slice(0, count)
    .map(toLink);
}

// What usually completes a dinner with this kind of dish.
const PAIR_ROLES: Record<string, string[]> = {
  protein_main: ['veg_side', 'soup'],
  protein_side: ['veg_side', 'protein_main'],
  veg_side: ['protein_main', 'protein_side'],
  soup: ['protein_main', 'veg_side'],
  complete_meal: ['veg_side', 'soup'],
};

export interface RelatedRecipes { pairWith: RecipeLink[]; similar: RecipeLink[] }

export function selectRelatedRecipes(current: LinkRecipe, catalogue: LinkRecipe[], count = 4): RelatedRecipes {
  const others = uniqueRecipes(catalogue).filter(r => r.slug !== current.slug);
  const role = roleOf(current);

  const pairRoles = PAIR_ROLES[role] || [];
  const pairWith = pick(others.filter(r => pairRoles.includes(roleOf(r))), `${current.slug}:pair`, count);

  const used = new Set(pairWith.map(r => r.slug));
  const sameRole = others.filter(r => !used.has(r.slug) && roleOf(r) === role);
  const sameProtein = sameRole.filter(r => current.primary_protein && r.primary_protein === current.primary_protein);
  const sameCuisine = sameRole.filter(r => current.cuisine && r.cuisine === current.cuisine && !sameProtein.includes(r));
  const similar = pick(sameProtein, `${current.slug}:protein`, count);
  if (similar.length < count) {
    similar.push(...pick(sameCuisine, `${current.slug}:cuisine`, count - similar.length));
  }
  if (similar.length < count) {
    const selected = new Set(similar.map(r => r.slug));
    similar.push(...pick(sameRole.filter(r => !selected.has(r.slug)), `${current.slug}:role`, count - similar.length));
  }
  return { pairWith, similar };
}
