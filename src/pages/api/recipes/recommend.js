import { supabaseServer } from '@/lib/supabaseServer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ingredients } = req.query;
  
  if (!ingredients) {
    return res.status(400).json({ error: 'Missing ingredients parameter' });
  }

  const supabase = supabaseServer;
  
  // Fetch all recipes
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('id, name, description, cuisine, dish_type, method, speed, primary_protein, prep_time_minutes')
    .eq('is_active', true);
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const ingredientList = ingredients.toLowerCase().split(',').map(i => i.trim()).filter(Boolean);
  
  const scored = recipes.map(recipe => {
    const searchText = `${recipe.name} ${recipe.description || ''} ${recipe.cuisine || ''} ${recipe.method || ''} ${recipe.dish_type || ''} ${recipe.primary_protein || ''}`.toLowerCase();
    
    let matchCount = 0;
    let proteinMatch = false;
    
    ingredientList.forEach(ing => {
      if (searchText.includes(ing)) {
        matchCount++;
        if (recipe.primary_protein?.toLowerCase().includes(ing)) {
          proteinMatch = true;
        }
      }
    });
    
    let score = matchCount / Math.max(ingredientList.length, 1);
    if (proteinMatch) score += 1;
    if (recipe.speed === 'quick') score += 0.5;
    
    return { ...recipe, score, matchCount };
  });
  
  // Filter >= 0.3 threshold
  const recommendations = scored
    .filter(r => r.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  
  res.status(200).json({ recommendations });
}
