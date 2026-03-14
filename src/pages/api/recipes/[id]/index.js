import { supabase } from '@/lib/supabaseClient'
import { getCanonicalIngredients } from '@/lib/ingredientNormalizer'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
  
  try {
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const { id } = req.query
    
    // Fetch recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (recipeError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' })
    }
    
    // Fetch ingredients with proper joins
    const { data: recipeIngredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, unit_id, ingredients(id, name, slug, shopping_category), units(code, name)')
      .eq('recipe_id', id)

    // Also fetch ingredients_list (simple array of names) for fallback
    const { data: ingredientData } = await supabase
      .from('recipe_ingredients')
      .select('ingredients(name)')
      .eq('recipe_id', id)
    
    const ingredientsListFromDB = (ingredientData || [])
      .map(ri => ri.ingredients?.name)
      .filter(Boolean)

    // Build proper ingredient shape with source tracking
    let ingredients = (recipeIngredients || []).map(ri => ({
      ingredient_id: ri.ingredients?.id || null,
      slug: ri.ingredients?.slug || ri.ingredients?.name?.toLowerCase().replace(/\s+/g, '_') || '',
      display_name: ri.ingredients?.name || '',
      shopping_category: ri.ingredients?.shopping_category || '其他',
      quantity: Number(ri.quantity) || null,
      unit: ri.units ? { code: ri.units.code, name: ri.units.name } : (ri.unit_id ? { code: ri.unit_id, name: ri.unit_id } : null),
      is_optional: false,
      source: 'recipe_ingredients'
    }))

    // Helper to lookup ingredient by various fields (slug, name, or via canonical aliases)
    async function lookupIngredient(searchValue) {
      if (!searchValue) return null
      
      const lower = searchValue.toLowerCase()
      
      // Try by slug first
      const { data: bySlug } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .eq('slug', lower)
        .limit(1)
      if (bySlug && bySlug.length > 0) return bySlug[0]
      
      // Try by exact name match
      const { data: byName } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .eq('name', searchValue)
        .limit(1)
      if (byName && byName.length > 0) return byName[0]
      
      // Try using canonical aliases from normalizer
      const canonical = getCanonicalIngredients([searchValue])[0]
      if (canonical && canonical !== searchValue.toLowerCase()) {
        const { data: byCanonical } = await supabase
          .from('ingredients')
          .select('id, name, slug, shopping_category')
          .eq('slug', canonical)
          .limit(1)
        if (byCanonical && byCanonical.length > 0) return byCanonical[0]
      }
      
      return null
    }

    // FALLBACK: If recipe_ingredients is empty, try getting ingredients_list from recipes table
    if (ingredients.length === 0 && ingredientsListFromDB.length > 0) {
      // Get unique ingredient names
      const ingredientNames = [...new Set(ingredientsListFromDB)]
      
      // Try to lookup each in ingredients table by slug or name
      const results = await Promise.all(
        ingredientNames.map(name => lookupIngredient(name))
      )
      
      // Build ingredients array, only include successful lookups
      ingredients = results
        .filter(ing => ing !== null)
        .map(ing => ({
          ingredient_id: ing.id,
          slug: ing.slug,
          display_name: ing.name,
          shopping_category: ing.shopping_category || '其他',
          quantity: null,
          unit: null,
          is_optional: false,
          source: 'ingredients_list'
        }))
    }

    // FALLBACK: If recipe_ingredients is empty, check recipe.ingredients_list JSON column
    if (ingredients.length === 0 && recipe.ingredients_list && recipe.ingredients_list.length > 0) {
      // Try to lookup each in ingredients table
      const results = await Promise.all(
        recipe.ingredients_list.map(name => lookupIngredient(name))
      )
      
      // Build ingredients array, include DB matches and raw fallback for failures
      ingredients = results.map((ing, idx) => {
        const rawName = recipe.ingredients_list[idx]
        if (ing) {
          return {
            ingredient_id: ing.id,
            slug: ing.slug,
            display_name: ing.name,
            shopping_category: ing.shopping_category || '其他',
            quantity: null,
            unit: null,
            is_optional: false,
            source: 'ingredients_list'
          }
        }
        // RAW FALLBACK: only if absolutely no DB match
        return {
          ingredient_id: null,
          slug: rawName.toLowerCase().replace(/\s+/g, '_'),
          display_name: rawName,
          shopping_category: '其他',
          quantity: null,
          unit: null,
          is_optional: false,
          source: 'raw'
        }
      })
    }

    // Final fallback: use primary_protein to lookup in ingredients table
    if (ingredients.length === 0 && recipe.primary_protein) {
      const ing = await lookupIngredient(recipe.primary_protein)
      
      if (ing) {
        ingredients = [{
          ingredient_id: ing.id,
          slug: ing.slug,
          display_name: ing.name,
          shopping_category: ing.shopping_category,
          quantity: null,
          unit: null,
          is_optional: false,
          source: 'derived'
        }]
      }
    }

    // Fetch steps
    const { data: steps } = await supabase
      .from('recipe_steps')
      .select('step_no, text, time_seconds')
      .eq('recipe_id', id)
      .order('step_no')

    res.status(200).json({
      ...recipe,
      ingredients: ingredients || [],
      steps: steps || []
    })
  } catch (err) {
    console.error('Supabase error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
