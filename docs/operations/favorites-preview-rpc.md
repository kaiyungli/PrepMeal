# Preview-only full Favorites RPC reader

The instrumented comparison recorded lower RPC parse costs and consecutive-request medians, but it did not establish independently cold first-entry improvement. This candidate changes ordinary full-recipe Favorites GETs only when all these server conditions hold: VERCEL_ENV is exactly preview, FAVORITES_PREVIEW_RPC_ENABLED=1, FAVORITES_RPC_COMPARISON_ENABLED=1, and include=recipes. The candidate's vercel.json supplies the two non-secret flags; it never overrides VERCEL_ENV.

Production, development, custom/unidentified environments and disabled flags retain ordinary REST reads. ID-only reads remain REST. Existing explicitly requested diagnostic read_path=rest/rpc keeps its original validation, feature gate and strict failure behavior. Thus PR #88 remains the independent REST preview/control, while this separate draft builds on it.

Use the same service-role client and existing service-only SECURITY INVOKER RPC. Pass only the API-verified caller UUID, retain the same full projection/response mapping, and issue one DB request. Keep frontend cache/prefetch coordination and mutation endpoints unchanged. No migration, function grant, RLS, pool, auth or production configuration change is introduced.

RPC errors/rejections return the existing fixed failure without a silent second REST request. This preview is deliberately a transparent experiment: users can retry, and operators can roll it back. Preview full responses expose only the fixed read-path label and private/no-store cache policy. Navigation-v2 tracing copies only the allowlisted rest/rpc label, so a later page trace can confirm the actual reader rather than inferring it from timings.

Rollback: set the versioned FAVORITES_PREVIEW_RPC_ENABLED flag to 0 and redeploy the candidate, or use PR #88's preserved REST preview. Do not promote preview environment variables to production. Even with the flag set to 1, the exact preview-environment check keeps normal production reads on REST.

Validation covers one verified-owner RPC, data/null projection, authentication rejection, fixed errors/no fallback, normal REST on production/development/custom/missing environments, both disabled flags, explicit REST control, ID-only reads and safe path export. Full regression checks also cover the existing cache/mutations and meal-plan/account functionality.

Neither the earlier API comparison nor automated tests prove the candidate makes the first Favorites page 9% faster. Authentication/JWKS and outside-handler waits remain separate costs. Upstream Server-Timing is currently restored to its prior setting; coordinate any future short timing window and restore afterward.

Vercel's VERCEL_ENV is available at build/runtime: https://vercel.com/docs/environment-variables/system-environment-variables

## First hosted candidate navigation result

`PrepMeal_Navigation_phone(2).json` is complete navigation-v2, selected phone mode, viewport 605×671, build 44d7b0f4617f15871b05ef078441514751bce569. Its first full-recipe read explicitly reports read_path=rpc and HTTP 200, confirming the candidate's ordinary page path actually used RPC. Compare with the earlier complete REST trace on build 1c59235; the viewport and selected mode match, but these are separate runs without a randomized paired control.

| Settled-state readiness | Earlier REST | Candidate RPC | Difference |
| --- | ---: | ---: | ---: |
| First Favorites | 2,004 ms | 1,190 ms | -814 ms |
| Recipes | 584 ms | 416 ms | -168 ms |
| Return Favorites | 5 ms | 9 ms | +4 ms |
| Home recipe list | 37 ms | 45 ms | +8 ms |

First-entry readiness in this pair is approximately 40.6% lower. This is an observation, not a claim that RPC causes a stable 40.6% improvement. First-route completion is 1,112 ms versus 1,052 ms; data readiness follows route completion by 78 ms versus 952 ms. The route and pre-click read overlap and cannot be added together.

The RPC read starts 67 ms before the click, takes 1,257 ms to headers and arrives 1,190 ms after the click. Body parsing and publication-to-ready spans both round to 0 ms at the browser's measured resolution; do not describe this as physically zero processing. Page token lookup also rounds to 0 ms. One actual read is recorded and the return uses a fresh cache. The return trace's earlier RPC read is lookback context, not a newly issued read or a 2,225 ms React delay.

| Nested read timing | Earlier REST | Candidate RPC |
| --- | ---: | ---: |
| Browser load-to-headers | 2,078 ms | 1,257 ms |
| App auth | 386.53 ms | 323.35 ms |
| App DB request | 741.93 ms | 493.26 ms |
| App handler | 1,128.96 ms | 817.21 ms |
| Browser-to-headers minus handler (unclassified residual) | 949.04 ms | 439.79 ms |

Of the observed 821 ms request-header reduction, approximately 509 ms is in the unclassified outside-handler residual and approximately 312 ms in the handler (including about 63 ms auth and 249 ms DB-request differences). The larger residual difference cannot be attributed to RPC parsing. Network, edge/function admission, framework and scheduling can contribute. This candidate run has postgrest_timing_count=0 because the temporary upstream flag was restored: parse/plan/transaction stages are unmeasured here, not zero. The earlier separately instrumented comparison remains evidence for lower RPC parse costs, but it does not supply missing timings for this page run.

The tiny cached-return/home differences do not show a meaningful slowdown in this pair, and Recipes is faster here; none establishes long-term or desktop non-regression. Meal-plan/account tests remain the automated evidence for unchanged functional behavior, not browser performance measurements of those flows.

Keep the preview candidate and REST control available for review. The next decision should weigh this actual-reader confirmation and favorable page observation with the one-run/coverage limits. Production remains REST and the PR remains draft; there is no automatic production rollout or claim that first-use JWT/outside-handler costs have been solved.
