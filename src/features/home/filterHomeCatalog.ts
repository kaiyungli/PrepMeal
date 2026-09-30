const PAGE_SIZE = 24;

export interface HomeCatalogRecipe {
  id: string | number;
  name?: string | null;
  description?: string | null;
  diet?: string[] | null;
  flavor?: string[] | null;
  [key: string]: unknown;
}

// Match the homepage's /api/recipes predicates, including its array semantics.
// Canonical contract: same group = OR, different groups = AND. "主要蛋白"
// matches primary_protein directly - fish/seafood/shrimp are sibling
// values with no umbrella expansion between them.
export function filterHomeCatalog(recipes: HomeCatalogRecipe[], filters: Record<string, string[]>, searchQuery: string, sortBy: string) {
  const needle = searchQuery.trim().toLocaleLowerCase();
  const matches = recipes.filter(recipe => {
    if (needle && ![recipe.name, recipe.description].some(value => String(value || '').toLocaleLowerCase().includes(needle))) return false;
    for (const [key, values] of Object.entries(filters)) {
      if (!values?.length) continue;
      if (key === 'diet') {
        if (!values.some(value => recipe.diet?.includes(value))) return false;
      } else if (key === 'flavor') {
        if (!values.some(value => recipe.flavor?.includes(value))) return false;
      } else {
        const field = key === 'protein' ? 'primary_protein' : key;
        if (!values.includes(recipe[field] as string)) return false;
      }
    }
    return true;
  });

  const order: Record<string, [string, boolean, boolean]> = {
    newest: ['created_at', false, true],
    oldest: ['created_at', true, true],
    popular: ['times_shown', false, true],
    time_short: ['total_time_minutes', true, true],
    quick: ['total_time_minutes', true, true],
    calories_low: ['calories_per_serving', true, true],
    calories_high: ['calories_per_serving', false, true],
    protein_high: ['protein_g', false, true],
    high_protein: ['protein_g', false, true],
  };
  const [field, ascending, nullsLast] = order[sortBy] || order.newest;
  matches.sort((a, b) => {
    const av = a[field] as string | number | null | undefined;
    const bv = b[field] as string | number | null | undefined;
    if (av == null || bv == null) {
      if (av == null && bv == null) {
        return a.id < b.id ? (sortBy === 'oldest' ? -1 : 1) : a.id > b.id ? (sortBy === 'oldest' ? 1 : -1) : 0;
      }
      return av == null ? (nullsLast ? 1 : -1) : (nullsLast ? -1 : 1);
    }
    const comparison = av < bv ? -1 : av > bv ? 1 : 0;
    return comparison ? (ascending ? comparison : -comparison) :
      (a.id < b.id ? (sortBy === 'oldest' ? -1 : 1) : a.id > b.id ? (sortBy === 'oldest' ? 1 : -1) : 0);
  });
  return matches;
}

export { PAGE_SIZE };
