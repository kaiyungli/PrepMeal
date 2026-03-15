import { supabase } from './supabaseClient'

/**
 * Get full recipe details with ingredients and steps
 * Used by both API endpoints and pages
 */
export async function getRecipeDetail(recipeId: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  // Fetch recipe, ingredients, steps in parallel
  const [recipeResult, ingredientsResult, stepsResult] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', recipeId).single(),
    supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, ingredients(id, name, slug, shopping_category)')
      .eq('recipe_id', recipeId),
    supabase
      .from('recipe_steps')
      .select('step_no, text, time_seconds')
      .eq('recipe_id', recipeId)
      .order('step_no')
  ])

  const { data: recipe } = recipeResult
  if (!recipe) {
    throw new Error('Recipe not found')
  }

  const { data: recipeIngredients } = ingredientsResult
  const { data: steps } = stepsResult

  // Get unique unit IDs and fetch in one query
  const unitIds = [...new Set((recipeIngredients || []).map(ri => ri.unit_id).filter(Boolean))]
  let unitsMap = new Map()
  if (unitIds.length > 0) {
    const { data: unitsData } = await supabase
      .from('units')
      .select('id, code, name')
      .in('id', unitIds)
    unitsMap = new Map((unitsData || []).map(u => [u.id, u]))
  }

  // Build ingredient items
  const ingredients = (recipeIngredients || []).map((ri: any) => {
    const unit = unitsMap.get(ri.unit_id)
    const ing = ri.ingredients as any
    return {
      ingredient_id: ing?.id || null,
      slug: ing?.slug || '',
      display_name: ing?.name || '',
      shopping_category: ing?.shopping_category || '其他',
      quantity: ri.quantity ? Number(ri.quantity) : null,
      unit: unit ? { code: unit.code, name: unit.name } : null,
      is_optional: false,
      source: 'recipe_ingredients'
    }
  })

  return {
    recipe,
    ingredients,
    steps: steps || []
  }
}

/**
 * Format ingredient for UI display
 */
export function formatIngredientForUI(item: any) {
  return {
    name: item.display_name || item.name,
    quantity: item.quantity,
    unit: item.unit?.code || item.unit || '',
    category: item.shopping_category || '其他'
  }
}
