# Generate availability feedback — 2026-10-26

## Approved scope

Add role-specific warnings before generation and persistent role labels on empty slots. Keep existing add-one-slot actions, planner behavior, filters and styling. Meal-plan reuse, per-meal servings, automatic relaxation and repeat settings remain deferred.

## Implementation

- `planAvailability.ts` computes necessary role supply from current filtered recipes, cuisine/exclusions, composition and complete-meal setting. Unique recipe IDs, valid locks (including reservations on hidden days), repeated retained locks, two-main demand and one complete meal per day are accounted for. This is a shortage warning, not a guarantee that all unflagged arrangements can be filled.
- Controller derives messages without state effects. GenerateActions suppresses them while loading, on catalogue failure and for total zero results (existing messages take precedence). A warning does not disable generation.
- Results forwards composition to grid. Empty slots persistently say which role is missing, with an accessible day/slot-specific add button. Adding still changes one slot only; generated recipes and locks remain unchanged.
- No DB, Auth, recipe data or planner-selection changes.

## Verification

- Full suite: 2,259 unit + 207 component = 2,466 passing.
- Seven supply cases cover zero role supply, day changes, cuisine/exclusions, duplicate IDs, locks, hidden-day reservations and complete-meal capacity.
- Real page/controller runtime verifies draft restoration, shortage rendering, persistent empty role labels, single-slot fill and warning recomputation after unlocking.
- Existing zero/loading actions tests plus warning precedence/blocking behavior pass.
- TypeScript, production build and diff whitespace pass. Changed-module ESLint has no errors; five pre-existing unused-code warnings remain in results/grid. Two legacy explicit-any annotations on touched components were narrowed to their existing types.
- React review: derived state only, no new network calls/effects, deterministic bounded counting, semantic status and button labels. No new dependency.

## Delivery state

Implementation and automated validation complete. Same draft PR #123 / preview branch; no merge or production deployment authorized. Real-device acceptance of these new messages remains pending. Prior shopping-list flight-mode acceptance also remains pending. Source checks refer to this branch, not a new production-site audit.
