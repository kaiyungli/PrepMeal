import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support array format: ?ingredients=egg&ingredients=tomato
  const ingredientsParam = req.query.ingredients;
  const ingredientList = Array.isArray(ingredientsParam)
    ? ingredientsParam.map(i => i.toLowerCase().trim()).filter(Boolean)
    : ingredientsParam?.toLowerCase().split(',').map(i => i.trim()).filter(Boolean) || [];
  
  if (ingredientList.length === 0) {
    return res.status(400).json({ error: 'Missing ingredients parameter' });
  }

  const supabase = supabaseServer;
  
  // Fetch all recipes
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, slug, image_url, description, cuisine, dish_type, method, speed, primary_protein, prep_time_minutes')
    .eq('is_active', true);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const scored = recipes.map(recipe => {
    const searchText = `${recipe.name} ${recipe.description || ''} ${recipe.cuisine || ''} ${recipe.method || ''} ${recipe.dish_type || ''} ${recipe.primary_protein || ''}`.toLowerCase();
    
    let matchCount = 0;
    let proteinMatch = false;
    const matchedIngredients = [];
    
    ingredientList.forEach(ing => {
      if (searchText.includes(ing)) {
        matchCount++;
        matchedIngredients.push(ing);
        if (recipe.primary_protein?.toLowerCase().includes(ing)) {
          proteinMatch = true;
        }
      }
    });
    
    let score = matchCount / Math.max(ingredientList.length, 1);
    if (proteinMatch) score += 1;
    if (recipe.speed === 'quick') score += 0.5;
    
    return { 
      recipe_id: recipe.id,
      name: recipe.name,
      slug: recipe.slug,
      image_url: recipe.image_url,
      match_score: score,
      matched_ingredients: matchedIngredients
    };
  });
  
  // Filter >= 0.3 threshold
  const recommendations = scored
    .filter(r => r.match_score >= 0.3)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);
  
  res.status(200).json(recommendations);
}
