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
      .select('quantity, unit_id, ingredients(id, name, slug, shopping_category)')
      .eq('recipe_id', id)
    
    // Fetch units separately (if unit_id exists)
    const unitIds = [...new Set((recipeIngredients || []).map(ri => ri.unit_id).filter(Boolean))]
    const { data: unitsData } = unitIds.length > 0
      ? await supabase.from('units').select('id, code, name').in('id', unitIds)
      : { data: [] }
    const unitsMap = new Map((unitsData || []).map(u => [u.id, u]))

    // Also fetch ingredients_list (simple array of names) for fallback
    const { data: ingredientData } = await supabase
      .from('recipe_ingredients')
      .select('ingredients(name)')
      .eq('recipe_id', id)
    
    const ingredientsListFromDB = (ingredientData || [])
      .map(ri => ri.ingredients?.name)
      .filter(Boolean)

    // Build proper ingredient shape with source tracking
    let ingredients = (recipeIngredients || []).map(ri => {
      const unit = unitsMap.get(ri.unit_id)
      return {
        ingredient_id: ri.ingredients?.id || null,
        slug: ri.ingredients?.slug || ri.ingredients?.name?.toLowerCase().replace(/\s+/g, '_') || '',
        display_name: ri.ingredients?.name || '',
        shopping_category: ri.ingredients?.shopping_category || '其他',
        quantity: Number(ri.quantity) || null,
        unit: unit ? { code: unit.code, name: unit.name } : null,
        is_optional: false,
        source: 'recipe_ingredients'
      }
    })

    // Batch lookup for multiple ingredients using OR (includes aliases)
    async function lookupIngredientsBatch(searchValues) {
      if (!searchValues || searchValues.length === 0) return {}
      
      const lowers = searchValues.map(v => v.toLowerCase())
      
      // Also expand via canonical aliases
      const expanded = new Set([...searchValues, ...lowers])
      const canonicals = getCanonicalIngredients([...searchValues])
      canonicals.forEach(c => expanded.add(c))
      
      // Single query with OR: slug IN (...) OR name IN (...)
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, slug, shopping_category')
        .or(`slug.in.(${Array.from(expanded).join(',')}),name.in.(${Array.from(expanded).join(',')})`)
      
      // Build map by slug and name
      const map = {}
      ;(data || []).forEach(ing => {
        if (ing.slug) map[ing.slug.toLowerCase()] = ing
        if (ing.name) map[ing.name] = ing
      })
      return map
    }

    // FALLBACK: If recipe_ingredients is empty, try getting ingredients_list from recipes table
    if (ingredients.length === 0 && ingredientsListFromDB.length > 0) {
      // Get unique ingredient names
      const ingredientNames = [...new Set(ingredientsListFromDB)]
      
      // Batch lookup by slug or name in single query
      const map = await lookupIngredientsBatch(ingredientNames)
      
      // Build ingredients array, only include successful lookups
      ingredients = ingredientNames
        .map(name => {
          const ing = map[name.toLowerCase()] || map[name]
          if (!ing) return null
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
        })
        .filter(Boolean)
    }

    // FALLBACK: If recipe_ingredients is empty, check recipe.ingredients_list JSON column
    if (ingredients.length === 0 && recipe.ingredients_list && recipe.ingredients_list.length > 0) {
      // Batch lookup by slug or name
      const map = await lookupIngredientsBatch(recipe.ingredients_list)
      
      // Build ingredients array, include DB matches and raw fallback for failures
      ingredients = recipe.ingredients_list.map(rawName => {
        const ing = map[rawName.toLowerCase()] || map[rawName]
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
      const map = await lookupIngredientsBatch([recipe.primary_protein])
      const ing = map[recipe.primary_protein.toLowerCase()]
      
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
