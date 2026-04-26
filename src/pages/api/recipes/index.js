import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  const limit = limitParam || '100';
  const limitNum = Math.min(Math.max(parseInt(limit) || 100, 1), 100);

  try {
    let query = supabase
      .from('recipes')
      .select(`id, name, slug, image_url, prep_time_minutes, cook_time_minutes, total_time_minutes, calories_per_serving, protein_g, carbs_g, fat_g, difficulty, cuisine, method, dish_type, primary_protein, budget_level, is_complete_meal, speed, created_at`, { count: 'exact' })
      .eq('is_public', true);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (cuisine) {
      const cuisineValues = cuisine.split(',').map(c => c.trim());
      query = query.in('cuisine', cuisineValues);
    }

    if (dish_type) {
      const dishValues = dish_type.split(',').map(d => d.trim());
      query = query.in('dish_type', dishValues);
    }

    if (maxTime) {
      query = query.lte('total_time_minutes', parseInt(maxTime));
    }

    if (difficulty) {
      const diffValues = difficulty.split(',').map(d => d.trim());
      query = query.in('difficulty', diffValues);
    }

    if (method) {
      const methodValues = method.split(',').map(m => m.trim());
      query = query.in('method', methodValues);
    }

    if (diet) {
      const dietValues = diet.split(',').map(d => d.trim());
      query = query.in('diet', dietValues);
    }

    if (protein) {
      const proteinValues = protein.split(',').map(p => p.trim());
      query = query.in('protein', proteinValues);
    }

    if (speed) {
      const speedValues = speed.split(',').map(s => s.trim());
      query = query.in('speed', speedValues);
    }

    if (flavor) {
      const flavorValues = flavor.split(',').map(f => f.trim());
      query = query.in('flavor', flavorValues);
    }

    if (budget) {
      const budgetValues = budget.split(',').map(b => b.trim());
      query = query.in('budget_level', budgetValues);
    }

    if (complete) {
      query = query.eq('is_complete_meal', complete === 'true');
    }

    // Apply sorting (primary + secondary for stable pagination)
    const safeSort = typeof sort === 'string' ? sort : 'newest';

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
    const pageNum = Math.max(parseInt(pageParam) || 1, 1);
    const offsetNum = Math.max(parseInt(offsetParam) || 0, (pageNum - 1) * limitNum);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: recipes, error, count } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const recipesList = Array.isArray(recipes) ? recipes : [];
    const total = count ?? 0;

    return res.status(200).json({
      recipes: recipesList,
      total,
      hasMore: recipesList.length === limitNum && total > offsetNum + limitNum
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}