// Recipe search API endpoint with filters
import { supabaseServer } from '@/lib/supabaseServer';
import { perfNow, perfMeasure } from '@/utils/perf';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { search, cuisine, dish_type, maxTime, difficulty, method, diet, protein, speed, sort, flavor, budget, complete, limit: limitParam, page: pageParam, offset: offsetParam } = req.query;

  const supabase = supabaseServer;

  // Validate and parse parameters
  const safeLimit = Math.min(Math.max(parseInt(limitParam) || 100, 1), 100);
  const safePage = Math.max(parseInt(pageParam) || 1, 1);
  const safeOffset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : (safePage - 1) * safeLimit;

  // Normalize sort parameter
  const safeSort = typeof sort === 'string' ? sort.toLowerCase() : 'newest';

  try {
    // Build base query with all fields needed
    let query = supabase
      .from('recipes')
      .select(`*`, { count: 'exact' })
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
        query = query.in('diet', dietList);
      }
    }

    // Protein filter
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

    // Flavor filter
    if (flavor && flavor.trim()) {
      const flavorList = flavor.split(',').map(f => f.trim()).filter(Boolean);
      if (flavorList.length > 0) {
        query = query.in('flavor', flavorList);
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

      case 'newest':
      default:
        query = query
          .order('created_at', { ascending: false })
          .order('id', { ascending: false });
    }

    // Pagination
    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    const queryStart = perfNow();
    const { data: recipes, error, count } = await query;
    perfMeasure('api.recipes.query', queryStart);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const recipesList = Array.isArray(recipes) ? recipes : [];
    const total = count ?? 0;

    return res.status(200).json({
      recipes: recipesList,
      total,
      hasMore: recipesList.length === safeLimit && total > safeOffset + safeLimit
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}