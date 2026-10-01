// Recipe search API endpoint with filters
import { supabaseServer } from '@/lib/supabaseServer';
import { perfNow, perfMeasure } from '@/utils/perf';
import { findCatalogueIdProblem } from '@/features/generate/services/catalogueIdentity';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Fields needed for generate page
const GENERATE_FIELDS = `
  id,
  slug,
  name,
  description,
  image_url,
  cuisine,
  dish_type,
  method,
  speed,
  difficulty,
  protein,
  primary_protein,
  diet,
  flavor,
  is_complete_meal,
  meal_role,
  budget_level,
  base_servings,
  calories_per_serving,
  protein_g,
  carbs_g,
  fat_g,
  prep_time_minutes,
  cook_time_minutes,
  total_time_minutes,
  is_public
`;

// Fields for normal recipe list
const LIST_FIELDS = `
  id,
  slug,
  name,
  description,
  image_url,
  prep_time_minutes,
  cook_time_minutes,
  total_time_minutes,
  calories_per_serving,
  protein_g,
  carbs_g,
  fat_g,
  difficulty,
  cuisine,
  method,
  dish_type,
  primary_protein,
  budget_level,
  is_complete_meal,
  speed,
  protein,
  diet,
  flavor,
  is_public,
  times_shown,
  created_at
`;

// Applies the public-visibility predicate and every supported filter. Shared by
// the paginated list and the Generate catalogue so both honour identical
// filter semantics. Returns a fresh builder on every call.
function buildFilteredQuery(supabase, fields, params) {
  const { search, cuisine, dish_type, maxTime, difficulty, method, diet, protein, speed, flavor, budget, complete } = params;

  let query = supabase
    .from('recipes')
    .select(fields, { count: 'exact' })
    .eq('is_public', true);

  // Search - match name or description
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  // Cuisine filter
  if (cuisine && cuisine.trim()) {
    const cuisineList = cuisine.split(',').map(c => c.trim()).filter(Boolean);
    if (cuisineList.length > 0) {
      query = query.in('cuisine', cuisineList);
    }
  }

  // Dish type filter
  if (dish_type && dish_type.trim()) {
    const dishList = dish_type.split(',').map(d => d.trim()).filter(Boolean);
    if (dishList.length > 0) {
      query = query.in('dish_type', dishList);
    }
  }

  // Time filter
  if (maxTime && maxTime.trim()) {
    const timeValue = parseInt(maxTime);
    if (!isNaN(timeValue) && timeValue > 0) {
      query = query.lte('total_time_minutes', timeValue);
    }
  }

  // Difficulty filter
  if (difficulty && difficulty.trim()) {
    const diffList = difficulty.split(',').map(d => d.trim()).filter(Boolean);
    if (diffList.length > 0) {
      query = query.in('difficulty', diffList);
    }
  }

  // Method filter
  if (method && method.trim()) {
    const methodList = method.split(',').map(m => m.trim()).filter(Boolean);
    if (methodList.length > 0) {
      query = query.in('method', methodList);
    }
  }

  // Diet filter
  if (diet && diet.trim()) {
    const dietList = diet.split(',').map(d => d.trim()).filter(Boolean);
    if (dietList.length > 0) {
      query = query.overlaps('diet', dietList);
    }
  }

  // Protein filter - "主要蛋白" matches primary_protein only. fish/seafood/
  // shrimp are sibling values; no umbrella expansion between them.
  if (protein && protein.trim()) {
    const proteinList = protein.split(',').map(p => p.trim()).filter(Boolean);
    if (proteinList.length > 0) {
      query = query.in('primary_protein', proteinList);
    }
  }

  // Speed filter
  if (speed && speed.trim()) {
    const speedList = speed.split(',').map(s => s.trim()).filter(Boolean);
    if (speedList.length > 0) {
      query = query.in('speed', speedList);
    }
  }

  // Flavor filter - same-group OR: matches if the recipe contains ANY
  // selected flavor (overlap), consistent with diet.
  if (flavor && flavor.trim()) {
    const flavorList = flavor.split(',').map(f => f.trim()).filter(Boolean);
    if (flavorList.length > 0) {
      query = query.overlaps('flavor', flavorList);
    }
  }

  // Budget filter
  if (budget && budget.trim()) {
    const budgetList = budget.split(',').map(b => b.trim()).filter(Boolean);
    if (budgetList.length > 0) {
      query = query.in('budget_level', budgetList);
    }
  }

  // Complete meal filter
  if (complete && complete.trim()) {
    query = query.eq('is_complete_meal', complete === 'true');
  }

  return query;
}

// Generate catalogue contract: `view=generate` returns the COMPLETE matching
// public catalogue or fails. The client never controls completeness via
// limit/page/offset. The server paginates internally and verifies the
// assembled pool against the exact count before reporting `complete: true`.
//
// The requested page size is only an upper bound. PostgREST may enforce a
// smaller project-level max_rows, so the effective stride is taken from what
// the first page actually returned; later offsets are derived from it.
const GENERATE_REQUESTED_PAGE_SIZE = 100;
const GENERATE_PAGE_CONCURRENCY = 4;
// Explicit runtime budget for internal queries per attempt (first page
// included). Exceeding it fails loudly instead of truncating; at a 100-row
// stride this is 20,000 recipes.
const GENERATE_MAX_PAGES_PER_ATTEMPT = 200;
// One retry of the whole retrieval if pages observed different snapshots.
const GENERATE_MAX_ATTEMPTS = 2;

class GenerateCatalogueQueryError extends Error {
  constructor(error) {
    super(error?.message || 'Generate catalogue query failed');
    this.code = error?.code;
    this.details = error?.details;
    this.hint = error?.hint;
  }
}

class GenerateCataloguePageBudgetError extends Error {
  constructor(total, stride) {
    super(`Generate catalogue needs more than ${GENERATE_MAX_PAGES_PER_ATTEMPT} internal pages (total ${total}, stride ${stride})`);
    this.code = 'page_budget_exceeded';
  }
}

function fetchGenerateCataloguePage(supabase, params, from, size) {
  // Canonical Generate order: newest first, id as a stable tiebreak.
  return buildFilteredQuery(supabase, GENERATE_FIELDS, params)
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(from, from + size - 1);
}

function isValidCount(count) {
  return Number.isInteger(count) && count >= 0;
}

function pageRows(page) {
  return Array.isArray(page.data) ? page.data : null;
}

// One full retrieval. Returns { recipes, total } when every invariant holds,
// or { inconsistency } describing why the observed pages cannot be trusted.
// Query errors and an exceeded page budget throw (not retried).
//
// 1. Probe: request [0, REQUESTED) and read the exact count. The probe's row
//    count and total come from one statement, so a short probe page with more
//    rows remaining reveals the effective row ceiling: stride = rows returned.
// 2. Only then compute offsets stride, 2*stride, ... < total, and fetch them in
//    bounded concurrent batches, each requesting exactly `stride` rows.
// 3. Verify: every page has the probe's count and exactly
//    min(stride, total - offset) rows; IDs are usable and unique; length === total.
async function attemptGenerateCatalogue(supabase, params) {
  const first = await fetchGenerateCataloguePage(supabase, params, 0, GENERATE_REQUESTED_PAGE_SIZE);
  if (first.error) throw new GenerateCatalogueQueryError(first.error);
  if (!isValidCount(first.count)) return { inconsistency: 'missing_count' };

  const total = first.count;
  const firstRows = pageRows(first);
  if (!firstRows) return { inconsistency: 'page_size_mismatch' };
  if (firstRows.length > GENERATE_REQUESTED_PAGE_SIZE || firstRows.length > total) {
    return { inconsistency: 'page_size_mismatch' };
  }
  // An empty probe while rows remain cannot make progress.
  if (firstRows.length === 0 && total > 0) return { inconsistency: 'page_size_mismatch' };

  const stride = firstRows.length;
  const offsets = [];
  if (firstRows.length < total) {
    if (Math.ceil(total / stride) > GENERATE_MAX_PAGES_PER_ATTEMPT) {
      throw new GenerateCataloguePageBudgetError(total, stride);
    }
    for (let from = stride; from < total; from += stride) offsets.push(from);
  }

  const pages = [{ from: 0, page: first }];
  for (let i = 0; i < offsets.length; i += GENERATE_PAGE_CONCURRENCY) {
    const batchOffsets = offsets.slice(i, i + GENERATE_PAGE_CONCURRENCY);
    const batch = await Promise.all(
      batchOffsets.map(from => fetchGenerateCataloguePage(supabase, params, from, stride))
    );
    batch.forEach((page, j) => {
      if (page.error) throw new GenerateCatalogueQueryError(page.error);
      pages.push({ from: batchOffsets[j], page });
    });
  }

  // Pages are assembled in offset order, independent of response arrival order.
  const recipes = [];
  for (const { from, page } of pages) {
    if (page.count !== total) return { inconsistency: 'count_changed' };
    const rows = pageRows(page);
    const expectedRows = Math.min(stride, total - from);
    if (!rows || rows.length !== expectedRows) return { inconsistency: 'page_size_mismatch' };
    recipes.push(...rows);
  }

  const idProblem = findCatalogueIdProblem(recipes);
  if (idProblem) return { inconsistency: idProblem };
  if (recipes.length !== total) return { inconsistency: 'length_mismatch' };

  return { recipes, total };
}

async function handleGenerateCatalogue(req, res) {
  const params = req.query;
  let lastInconsistency = null;

  try {
    for (let attempt = 1; attempt <= GENERATE_MAX_ATTEMPTS; attempt++) {
      const queryStart = perfNow();
      const result = await attemptGenerateCatalogue(supabaseServer, params);
      perfMeasure('api.recipes.generate_catalogue', queryStart);

      if (!result.inconsistency) {
        // hasMore:false stops pre-contract clients (stale bundles that loop on
        // hasMore) after this single complete response.
        return res.status(200).json({ recipes: result.recipes, total: result.total, complete: true, hasMore: false });
      }
      lastInconsistency = result.inconsistency;
      console.warn('[api/recipes] generate_catalogue_unverified', { attempt, reason: lastInconsistency });
    }
  } catch (err) {
    console.error('[api/recipes] generate_catalogue_failed', {
      message: err?.message,
      code: err?.code,
      details: err?.details,
      hint: err?.hint,
    });
    return res.status(500).json({
      error: 'Failed to load recipes',
      complete: false,
      reason: err instanceof GenerateCataloguePageBudgetError ? err.code : 'query_error',
      detail: process.env.NODE_ENV === 'development' ? err?.message : undefined,
    });
  }

  // Never report a partial pool as success.
  return res.status(503).json({
    error: 'Generate catalogue could not be verified as complete',
    complete: false,
    reason: lastInconsistency,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.query.view === 'generate') {
    return handleGenerateCatalogue(req, res);
  }

  const { sort, limit: limitParam, page: pageParam, offset: offsetParam, view } = req.query;

  const supabase = supabaseServer;

  // Validate and parse parameters
  const safeLimit = Math.min(Math.max(parseInt(limitParam) || 100, 1), 100);
  const safePage = Math.max(parseInt(pageParam) || 1, 1);
  const safeOffset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : (safePage - 1) * safeLimit;

  // Normalize sort parameter
  const safeSort = typeof sort === 'string' ? sort.toLowerCase() : 'newest';

  try {
    // Build base query with explicit fields (view=generate is handled above)
    let query = buildFilteredQuery(supabase, LIST_FIELDS, req.query);

    // Apply sorting (primary + secondary for stable pagination)
    switch (safeSort) {
      case 'quick':
        query = query
          .order('total_time_minutes', { ascending: true, nullsFirst: false })
          .order('id', { ascending: false });
        break;

      case 'high_protein':
      case 'protein_high':
        query = query
          .order('protein_g', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false });
        break;

      case 'low_calorie':
      case 'calories_low':
        query = query
          .order('calories_per_serving', { ascending: true, nullsFirst: false })
          .order('id', { ascending: false });
        break;

      case 'calories_high':
        query = query
          .order('calories_per_serving', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false });
        break;

      case 'time_short':
        query = query
          .order('total_time_minutes', { ascending: true, nullsFirst: false })
          .order('id', { ascending: false });
        break;

      case 'oldest':
        query = query
          .order('created_at', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true });
        break;
      case 'popular':
        query = query
          .order('times_shown', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false });
        break;
      case 'newest':
      default:
        query = query
          .order('created_at', { ascending: false, nullsFirst: false })
          .order('id', { ascending: false });
    }

    // Pagination
    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    const queryStart = perfNow();
    const { data: recipes, error, count } = await query;
    perfMeasure('api.recipes.query', queryStart);

    if (error) {
      console.error('[api/recipes] query_error', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        view,
      });
      return res.status(500).json({ 
        recipes: [],
        error: 'Failed to load recipes',
        detail: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    const recipesList = Array.isArray(recipes) ? recipes : [];
    const total = count ?? 0;

    return res.status(200).json({
      recipes: recipesList,
      total,
      hasMore: recipesList.length === safeLimit && total > safeOffset + safeLimit
    });

  } catch (err) {
    console.error('[api/recipes] failed', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint,
      view,
    });
    return res.status(500).json({ 
      recipes: [],
      error: 'Failed to load recipes',
      detail: process.env.NODE_ENV === 'development' ? err?.message : undefined
    });
  }
}
