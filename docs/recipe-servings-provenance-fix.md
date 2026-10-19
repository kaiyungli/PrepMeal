# Recipe servings and public evidence

The new catalogue includes recipes whose ingredient quantities cover two people. The shopping-list API previously multiplied those totals by the requested people count without dividing by `base_servings`. For example, a two-person recipe containing 360g noodles produced a 720g shopping line for two people.

This change scales each recipe by `target / base_servings` before occurrence aggregation. Missing or invalid legacy base counts retain the existing one-person basis. The older data-access helper uses the same calculation. Mass and volume displays retain fractional amounts rather than rounding 0.3g seasoning to 1g; count-unit shopping rounding is unchanged.

The shared recipe detail content now labels whole-recipe ingredient amounts and per-person nutrition separately. Reader-facing sources, adaptation notes, nutrition estimate status/limitations, and allergen information are extracted from existing `source_data`; the complete import ledger is never sent to the client. Missing evidence remains unknown. Both the legacy RPC hydration query and the multi-query fallback enforce public visibility.

## Validation

Tested against `main` at `f12109bc8fc9d3f0a0e8d72592b406a78986382f` in an isolated worktree, without carrying the unrelated changes from the original checkout:

- Unit suite: 110 files, 2,125 tests passed.
- Component suite: 9 files, 166 tests passed.
- TypeScript: `tsc --noEmit --incremental false` passed.
- Production build: TypeScript and optimized compilation passed; page-data collection stopped because the isolated worktree has no Supabase URL/anon-key environment configuration. Full build and live verification remain pending.
- New regressions cover 1/2/4 people, repeated recipe occurrences, public-only legacy RPC metadata hydration, source URL safety, missing metadata, decimal measurements, and rendered evidence.
- Read-only production query confirmed `prepmeal-batch4-23` and `prepmeal-batch4-25` are public, have `base_servings = 2`, and have attribution and reference-estimate metadata.
- Existing ESLint violations remain in the detail content and service; unchanged base files were checked to distinguish them from this change.

No recipe data, images, schema, saved plans, or user preferences are changed. Deployment and live post-deployment acceptance are separate from local verification.

## Delivery

Prepared branch: `fix/recipe-servings-provenance-20261019`.

Suggested PR title: `Fix recipe serving quantities and display source evidence`.

Suggested PR description:

> Shopping lists now divide whole-recipe quantities by each recipe's base servings before scaling to the requested people count and aggregating repeated meals. A two-person recipe with 360g noodles now produces 180g for one person and 360g for two. Fractional mass/volume quantities are preserved.
>
> Shared recipe details label whole-recipe amounts and per-person nutrition, and display existing attribution, adaptation, estimate limitations and allergen data without exposing import ledgers. Public visibility remains enforced during legacy RPC metadata hydration.
>
> Validation: 2,125 unit tests and 166 component tests pass; TypeScript passes. Production compilation succeeds, but full build completion requires Supabase environment configuration. Existing lint findings are unchanged. No DB migration or image work.

Push was blocked by automatic approval review pending explicit authorization to publish code and workflow changes to `kaiyungli/PrepMeal`; no PR has been created.
