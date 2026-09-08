/**
 * Combined identity + route-id resolution for the plan-detail controller.
 *
 * The detail hook's committed state is only safe to render when it was
 * produced under BOTH the auth identity currently in effect AND the
 * normalized plan id currently in the route. This resolver stacks the
 * route-id axis on top of the same identity check `resolveScope` performs
 * (see `./authScope`), so a stale plan A detail can never paint for one
 * render after the route changes to plan B — or to a malformed / missing id —
 * before the effect cleanup / refetch has run.
 *
 * `dataPlanId` / `currentPlanId` are `normalizePlanId` outputs: a UUID
 * string, or `null` for the missing / malformed / cold cases. A `null`
 * current id is a real, matchable value — it resolves to `'show'` against a
 * `null` data id so the neutral not-found state can render.
 *
 * Pure, zero VALUE imports (the `AuthScope` / `ScopeResolution` imports are
 * types-only, erased at runtime) — unit-tested directly by `node --test`.
 */
import type { AuthScope, ScopeResolution } from './authScope';

/**
 * `'idle'`    — no current identity (signed out / restoring): surface nothing.
 * `'loading'` — signed in, but the committed state was produced under a
 *               different identity OR a different normalized plan id: render
 *               loading, never the stale plan.
 * `'show'`    — both axes match: the committed state belongs to this view.
 */
export function resolvePlanDetailScope(
  dataScope: AuthScope,
  dataPlanId: string | null,
  currentScope: AuthScope,
  currentPlanId: string | null,
): ScopeResolution {
  if (currentScope === null) return 'idle';
  if (dataScope !== currentScope) return 'loading';
  return dataPlanId === currentPlanId ? 'show' : 'loading';
}
