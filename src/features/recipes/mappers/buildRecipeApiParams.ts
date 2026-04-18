/**
 * Build API params from filter/search/sort state
 * Shared helper for recipe filtering pages
 */


export interface BuildParamsInput {
  filters: { [key: string]: string[] };
  searchQuery: string;
  sortBy?: string;
  limit?: number;
}

export interface RecipeApiParams {
  search: string;
  cuisine: string;
  dish_type: string;
  protein: string;
  method: string;
  difficulty: string;
  diet: string;
  sort: string;
  limit: number;
}

export function buildRecipeApiParams({
  filters,
  searchQuery,
  sortBy = 'newest',
  limit = 100,
}: BuildParamsInput): RecipeApiParams {
  return {
    search: searchQuery,
    cuisine: filters.cuisine?.join(',') ?? '',
    dish_type: filters.dish_type?.join(',') ?? '',
    protein: filters.protein?.join(',') ?? '',
    method: filters.method?.join(',') ?? '',
    difficulty: filters.difficulty?.join(',') ?? '',
    diet: filters.diet?.join(',') ?? '',
    sort: sortBy,
    limit,
  };
}