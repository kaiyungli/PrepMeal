import { supabaseServer } from '@/lib/supabaseServer'
import { requireAdmin } from '@/lib/adminAuth'
import { buildRecipeAtomicParams } from '@/lib/adminRecipeAtomicParams'
import {
  parseImportEnvelope,
  collectReferenceKeys,
  resolveRecipeParams,
  runBoundedConcurrent,
  IMPORT_RPC_CONCURRENCY,
} from '@/lib/adminRecipeImportResolve'

// Bulk admin recipe import.
//
// Envelope, field validation and reference resolution (ingredient_slug /
// unit_code -> ingredient_id / unit_id) are pure and live in
// `@/lib/adminRecipeImportResolve`. This file is route orchestration only:
// auth, the service-role client, method routing, the two batched reference
// lookups, dispatching one admin_create_recipe_atomic RPC per resolved
// recipe through a small bounded worker pool, and mapping results to HTTP.
//
// Each recipe is atomic (single RPC, single transaction); the batch itself
// is not -- it partially succeeds, returning one ordered result per input
// recipe. A recipe never causes another recipe to fail: an unresolvable
// ingredient/unit reference, a duplicate slug, or an RPC error only fails
// that one recipe's result entry.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
}

export default async function handler(req, res) {
  // Admin recipe imports run privileged RPCs and bypass RLS, so they MUST use
  // the service-role client. Fail closed if it is not configured -- never
  // fall back to the public anon client.
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Admin API is not configured' })
  }

  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const parsed = parseImportEnvelope(req.body)
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error })
  }
  const { recipes } = parsed

  // At most one batched service-role query per reference table resolves
  // every unique reference up front -- never one lookup per recipe, never
  // per-ingredient. An empty reference set (e.g. no recipe in the batch
  // supplies a unit_code) skips that table's query entirely rather than
  // calling `.in(field, [])`, which PostgREST/postgrest-js does not treat as
  // "match nothing" reliably.
  const { ingredientSlugs, unitCodes } = collectReferenceKeys(recipes)

  let ingredientLookup
  let unitLookup
  try {
    const lookupResults = await Promise.all([
      ingredientSlugs.length > 0
        ? supabaseServer.from('ingredients').select('id, slug').in('slug', ingredientSlugs)
        : Promise.resolve({ data: [], error: null }),
      unitCodes.length > 0
        ? supabaseServer.from('units').select('id, code').in('code', unitCodes)
        : Promise.resolve({ data: [], error: null }),
    ])
    ingredientLookup = lookupResults[0]
    unitLookup = lookupResults[1]
  } catch (err) {
    // A thrown/rejected lookup (not a resolved `{ data, error }`) must still
    // fail closed with the standard JSON 500 -- and, critically, before any
    // RPC is ever dispatched.
    return res.status(500).json({ error: err?.message || 'Failed to resolve ingredient/unit references' })
  }

  if (ingredientLookup.error) {
    return res.status(500).json({ error: 'Failed to resolve ingredients: ' + ingredientLookup.error.message })
  }
  if (unitLookup.error) {
    return res.status(500).json({ error: 'Failed to resolve units: ' + unitLookup.error.message })
  }

  const ingredientIdBySlug = new Map((ingredientLookup.data || []).map((row) => [row.slug, row.id]))
  const unitIdByCode = new Map((unitLookup.data || []).map((row) => [row.code, row.id]))

  // Resolve references + build canonical RPC params for every recipe before
  // any RPC is dispatched. A recipe that fails either step never reaches the
  // worker pool / an RPC call.
  const resolvedList = recipes.map((recipe) => {
    const resolved = resolveRecipeParams(recipe, ingredientIdBySlug, unitIdByCode)
    if (resolved.error) return { error: resolved.error }
    const built = buildRecipeAtomicParams(resolved.params)
    if (built.error) return { error: built.error }
    return { params: built.params }
  })

  // Deterministic duplicate-slug detection WITHIN this batch, in input
  // order, before any RPC is dispatched: only the first valid occurrence of
  // a given canonical p_slug may enter the RPC worker pool. Without this,
  // two recipes sharing a slug would both be dispatched concurrently and
  // whichever RPC call happened to reach Postgres first would "win" --  a
  // race whose outcome depends on network/scheduling timing, not on input
  // order. A slug collision against a recipe ALREADY in the database (not
  // in this batch) is unaffected: it is still detected from the RPC's own
  // unique-violation error, below.
  const seenSlugs = new Set()
  const dedupedList = resolvedList.map((resolved) => {
    if (resolved.error) return resolved
    const slug = resolved.params.p_slug
    if (seenSlugs.has(slug)) {
      return { error: `Duplicate slug "${slug}": already used by an earlier recipe in this import batch` }
    }
    seenSlugs.add(slug)
    return resolved
  })

  const labelOf = (recipe) => (recipe && typeof recipe === 'object' && typeof recipe.name === 'string' ? recipe.name : 'Unknown')
  const slugOf = (recipe) => (recipe && typeof recipe === 'object' && typeof recipe.slug === 'string' ? recipe.slug : null)

  const results = await runBoundedConcurrent(
    dedupedList,
    async (resolved, i) => {
      const name = labelOf(recipes[i])
      const slug = slugOf(recipes[i])

      if (resolved.error) {
        return { name, slug, success: false, error: resolved.error }
      }

      try {
        const { data, error } = await supabaseServer.rpc('admin_create_recipe_atomic', resolved.params)

        if (error) {
          // Prefer the structured Postgres error code (23505 =
          // unique_violation) over string-matching the message; the regex is
          // kept only as a compatibility fallback for a client/version that
          // doesn't surface `.code`.
          const isDuplicate = error.code === '23505' || /duplicate key|unique constraint/i.test(error.message || '')
          const message = isDuplicate ? `Duplicate slug "${resolved.params.p_slug}"` : error.message || 'Failed to create recipe'
          return { name, slug: resolved.params.p_slug, success: false, error: message }
        }

        if (!data) {
          return { name, slug: resolved.params.p_slug, success: false, error: 'No data returned from RPC' }
        }

        return { name, slug: resolved.params.p_slug, success: true, id: data.recipe?.id ?? null }
      } catch (err) {
        return { name, slug: resolved.params.p_slug, success: false, error: err?.message || 'Unknown server error' }
      }
    },
    IMPORT_RPC_CONCURRENCY,
  )

  const success = results.filter((r) => r.success).length
  const failed = results.length - success

  return res.status(200).json({
    total: results.length,
    success,
    failed,
    results,
  })
}
