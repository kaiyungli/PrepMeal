import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'
import { ensureSupabase } from '@/lib/ensureSupabase'

const supabase = supabaseServer

export default async function handler(req, res) {
  if (!ensureSupabase(res, supabase)) {
    return
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { recipes } = req.body

  if (!Array.isArray(recipes)) {
    return res.status(400).json({ error: 'recipes must be an array' })
  }

  const results = []

  for (const recipe of recipes) {
    try {
      // Validation
      if (!recipe.name?.trim()) {
        results.push({ name: recipe.name || 'Unknown', success: false, error: 'Missing name' })
        continue
      }
      if (!recipe.slug?.trim()) {
        results.push({ name: recipe.name, success: false, error: 'Missing slug' })
        continue
      }

      // Check for duplicate slug
      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .eq('slug', recipe.slug)
        .maybeSingle()

      if (existing) {
        results.push({ name: recipe.name, success: false, error: `Slug "${recipe.slug}" already exists` })
        continue
      }

      // Insert recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: recipe.name,
          slug: recipe.slug,
          description: recipe.description || '',
          cuisine: recipe.cuisine || 'chinese',
          dish_type: recipe.dish_type || 'main',
          difficulty: recipe.difficulty || 'easy',
          prep_time: recipe.prep_time || 15,
          cook_time: recipe.cook_time || 20,
          servings: recipe.servings || 2,
          image_url: recipe.image_url || '',
          calories_per_serving: recipe.calories_per_serving || null,
          is_public: recipe.is_public !== false,
          tags: recipe.tags || [],
        })
        .select()
        .single()

      if (recipeError) {
        results.push({ name: recipe.name, success: false, error: recipeError.message })
        continue
      }

      // Insert ingredients
      if (recipe.ingredients?.length > 0) {
        const ingredientsData = recipe.ingredients.map((ing, i) => ({
          recipe_id: recipeData.id,
          name: ing.name,
          quantity: ing.quantity || null,
          unit: ing.unit || null,
          notes: ing.notes || null,
          order_index: i,
        }))

        await supabase.from('recipe_ingredients').insert(ingredientsData)
      }

      // Insert steps
      if (recipe.steps?.length > 0) {
        const stepsData = recipe.steps.map((step, i) => ({
          recipe_id: recipeData.id,
          step_no: i + 1,
          text: step.text,
          time_seconds: step.time_seconds || null,
        }))

        await supabase.from('recipe_steps').insert(stepsData)
      }

      results.push({ name: recipe.name, success: true, id: recipeData.id })
    } catch (err) {
      results.push({ name: recipe.name, success: false, error: err.message })
    }
  }

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  res.status(200).json({
    total: recipes.length,
    success: successCount,
    failed: failCount,
    results,
  })
}
