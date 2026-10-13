# Preview-only full Favorites RPC reader

The instrumented comparison recorded lower RPC parse costs and consecutive-request medians, but it did not establish independently cold first-entry improvement. This candidate changes ordinary full-recipe Favorites GETs only when all these server conditions hold: VERCEL_ENV is exactly preview, FAVORITES_PREVIEW_RPC_ENABLED=1, FAVORITES_RPC_COMPARISON_ENABLED=1, and include=recipes. The candidate's vercel.json supplies the two non-secret flags; it never overrides VERCEL_ENV.

Production, development, custom/unidentified environments and disabled flags retain ordinary REST reads. ID-only reads remain REST. Existing explicitly requested diagnostic read_path=rest/rpc keeps its original validation, feature gate and strict failure behavior. Thus PR #88 remains the independent REST preview/control, while this separate draft builds on it.

Use the same service-role client and existing service-only SECURITY INVOKER RPC. Pass only the API-verified caller UUID, retain the same full projection/response mapping, and issue one DB request. Keep frontend cache/prefetch coordination and mutation endpoints unchanged. No migration, function grant, RLS, pool, auth or production configuration change is introduced.

RPC errors/rejections return the existing fixed failure without a silent second REST request. This preview is deliberately a transparent experiment: users can retry, and operators can roll it back. Preview full responses expose only the fixed read-path label and private/no-store cache policy. Navigation-v2 tracing copies only the allowlisted rest/rpc label, so a later page trace can confirm the actual reader rather than inferring it from timings.

Rollback: set the versioned FAVORITES_PREVIEW_RPC_ENABLED flag to 0 and redeploy the candidate, or use PR #88's preserved REST preview. Do not promote preview environment variables to production. Even with the flag set to 1, the exact preview-environment check keeps normal production reads on REST.

Validation covers one verified-owner RPC, data/null projection, authentication rejection, fixed errors/no fallback, normal REST on production/development/custom/missing environments, both disabled flags, explicit REST control, ID-only reads and safe path export. Full regression checks also cover the existing cache/mutations and meal-plan/account functionality.

Hosted navigation on this candidate is still pending. Neither the earlier API comparison nor automated tests prove the candidate makes the first Favorites page 9% faster. Authentication/JWKS and outside-handler waits remain separate costs. Upstream Server-Timing is currently restored to its prior setting; coordinate any future short timing window and restore afterward.

Vercel's VERCEL_ENV is available at build/runtime: https://vercel.com/docs/environment-variables/system-environment-variables
