import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'
import { buildRecipeExport, buildExportEnvelope, MAX_RECIPES } from '@/lib/adminRecipeExportShape'
import { fetchAllRows, fetchAllChildRows, isValidExactCount } from '@/lib/adminRecipeExportFetch'

// Admin recipe export: the full recipe catalogue in the versioned
// { format: "prepmeal.recipe-export", version: 1, recipes: [...] } envelope
// that the import route consumes. Route orchestration only -- the recipe /
// ingredient / step shape mapping is pure and lives in
// `@/lib/adminRecipeExportShape`, and the paginated child-row fetch
// algorithm is pure and lives in `@/lib/adminRecipeExportFetch`.
//
// This v1 contract is bounded at MAX_RECIPES: rather than silently
// truncating an export that has grown past the bound, the route counts
// first (a cheap head-count query, no rows transferred) and refuses with a
// clear error if the count exceeds MAX_RECIPES. That count is only trusted
// once verified to be a concrete, non-negative safe integer
// (`isValidExactCount`) -- a broken count query returning `null` is never
// treated as "zero recipes".
//
// NOTHING is fetched with a single unranged `select()`: `recipes` itself,
// `recipe_ingredients`, and `recipe_steps` are all paginated against their
// own up-front exact count via `fetchAllRows` / `fetchAllChildRows`
// (`@/lib/adminRecipeExportFetch`), chunking the recipe-id `.in(...)` filter
// for the two child tables. PostgREST silently caps unranged responses
// (commonly at 1000 rows), and production already exceeds that on both
// child tables (1,178 / 1,138 rows) -- so "no LIMIT in the query text" never
// proves a response is complete. Every fetch fails the whole export (500, no
// file emitted) rather than ever treating a server-capped or short response
// as complete.

export default async function handler(req, res) {
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Admin API is not configured' })
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { count, error: countError } = await supabaseServer
      .from('recipes')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      return res.status(500).json({ error: 'Failed to count recipes: ' + countError.message })
    }

    // A `null`/`undefined`/fractional/negative count is not "zero recipes" --
    // it means the count query itself cannot be trusted, and comparing it
    // against MAX_RECIPES below would be unsafe (`null > 200` is `false`).
    // Fail closed rather than silently proceeding as if the catalogue were
    // empty or within bound.
    if (!isValidExactCount(count)) {
      return res.status(500).json({
        error: `Failed to count recipes: received an invalid exact count (${JSON.stringify(count)}).`,
      })
    }

    if (count > MAX_RECIPES) {
      return res.status(400).json({
        error: `Export exceeds the ${MAX_RECIPES}-recipe bound (found ${count}). Refusing to export rather than silently truncate.`,
      })
    }

    // Paginated, not a single unranged `select('*')`: the exact count above
    // is the loop's only completion signal, so a server response capped
    // below `count` (for any reason) fails the export rather than silently
    // exporting fewer recipes than the catalogue actually has.
    const recipesResult = await fetchAllRows(count, (from, to) =>
      supabaseServer
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    )

    if (recipesResult.error) {
      return res.status(500).json({ error: 'Failed to load recipes: ' + recipesResult.error })
    }
    const recipes = recipesResult.rows

    const recipeIds = (recipes || []).map((r) => r.id)

    const ingredientsResult = await fetchAllChildRows(recipeIds, {
      fetchCount: (idChunk) =>
        supabaseServer
          .from('recipe_ingredients')
          .select('id', { count: 'exact', head: true })
          .in('recipe_id', idChunk),
      fetchPage: (idChunk, from, to) =>
        supabaseServer
          .from('recipe_ingredients')
          .select('id, recipe_id, quantity, is_optional, prep_note, group_key, ingredients(slug), units(code)')
          .in('recipe_id', idChunk)
          .order('id', { ascending: true })
          .range(from, to),
    })

    if (ingredientsResult.error) {
      return res.status(500).json({ error: 'Failed to load ingredients: ' + ingredientsResult.error })
    }
    const ingredientRows = ingredientsResult.rows

    const stepsResult = await fetchAllChildRows(recipeIds, {
      fetchCount: (idChunk) =>
        supabaseServer
          .from('recipe_steps')
          .select('id', { count: 'exact', head: true })
          .in('recipe_id', idChunk),
      fetchPage: (idChunk, from, to) =>
        supabaseServer
          .from('recipe_steps')
          .select('id, recipe_id, step_no, text, time_seconds')
          .in('recipe_id', idChunk)
          .order('id', { ascending: true })
          .range(from, to),
    })

    if (stepsResult.error) {
      return res.status(500).json({ error: 'Failed to load steps: ' + stepsResult.error })
    }
    const stepRows = stepsResult.rows

    const exportRecipes = (recipes || []).map((recipe) =>
      buildRecipeExport(
        recipe,
        (ingredientRows || []).filter((row) => row.recipe_id === recipe.id),
        (stepRows || []).filter((row) => row.recipe_id === recipe.id),
      ),
    )

    const exportedAt = new Date().toISOString()
    const envelope = buildExportEnvelope(exportRecipes, exportedAt)
    const filename = `prepmeal-recipes-export-${exportedAt.replace(/[:.]/g, '-')}.json`

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(envelope)
  } catch (err) {
    console.error('Export error:', err)
    return res.status(500).json({ error: err?.message || 'Export failed' })
  }
}
