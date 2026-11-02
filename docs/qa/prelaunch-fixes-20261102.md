# Pre-launch QA fixes — 2026-11-02

Baseline main: aa5ff1e51f6193681fbc19fe0e3aae3c819158da.
Scope: repair the code findings from PrepMeal_Prelaunch_QA_20261102.md without merging #137 or changing #140's Draft status.

## Changes

- Smoke readiness and endpoint checks reject recipe API 500 responses. Fetches have a five-second timeout; readiness has a bounded deadline and detects a dead child. Next starts directly with an explicit loopback hostname and is terminated after the checks. Success requires an explicit completion, not just a child exit.
- Both save-payload builders use the user's local calendar date. No recipe base servings or nutritional quantities change.
- The shopping mapper preserves each recipe's ingredient ID, raw quantity, unit and pending state. Recipe view uses those quantities, matching purchase progress to the whole-week master by ingredient identity and fixed-ratio measurement family. Different identities or incompatible units never match by their display name alone. Category/share totals and purchase checks remain whole-week values.
- Resolve the 167 baseline ESLint errors through explicit types, Next internal links, dependency corrections and state management changes. No ESLint rule is disabled or weakened. Recipe preview state belongs to the exact selection/opening; stale direct responses cannot write the cache, and shared prefetch work remains reusable. Existing response isolation and Strict Mode tests pass.

## Validation

| Check | Result | Evidence |
| --- | --- | --- |
| npm run test:all | PASS | 2,328 default tests + 235 component/runtime tests = 2,563 |
| npm run lint | PASS | 0 errors; 96 warnings remain |
| npx tsc --noEmit | PASS | exit 0 |
| npm run build | PASS with isolated HTTP fixture | synthetic Supabase keys, loopback URL, empty catalogue; no production credentials |
| npm run smoke | PASS with same fixture | recipe API 200; admin check 401; explicit Smoke checks passed |
| Missing-config smoke | Expected FAIL | real Next returns recipe API 500; smoke rejects it and exits nonzero without hanging |
| Date tests | PASS | all seven save-service tests independently under Asia/Hong_Kong and America/Los_Angeles |
| Recipe preview response isolation | PASS | 19 tests, including closing, switching, reopening and Strict Mode |
| git diff --check | PASS | no whitespace errors |

New regression coverage rejects HTTP 500 and non-JSON 200, bounds connection retries, detects a dead server, accepts 200/401, separates identity/unit families, and verifies per-recipe 150g/180g against a 330g master while preserving shared purchase checks. Test fixtures were updated to reflect accurate nullable and ID types; existing assertion outcomes remain unchanged.

## Reproduce

Use Node 24.22.1 / npm 11.9.0, npm ci, then the commands above. Run date coverage with:

```sh
TZ=Asia/Hong_Kong npx vitest run tests/saveGeneratedPlan.test.ts
TZ=America/Los_Angeles npx vitest run tests/saveGeneratedPlan.test.ts
```

For build/smoke isolation, run a loopback HTTP fixture returning JSON `[]` and `Content-Range: */0` for REST reads (and HEAD count requests). Point NEXT_PUBLIC_SUPABASE_URL to that local server and supply synthetic non-secret values for NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY. Keep the fixture alive for both npm commands. This proves compilation, prerendering, local startup and the specified HTTP smoke boundaries; it does not prove a real Supabase database or production catalogue works. Without the required settings build intentionally still fails rather than concealing configuration errors.

## Review / remaining acceptance

No Production code, settings, database records or deployments changed in this repair. Main was not modified; #137 stays on hold and #140 stays Draft. The two small overlapping fixes were implemented on a separate branch without importing #137's workweek/lunch features or updating either existing PR.

The earlier production desktop E2E applies to the baseline, not this branch. This branch still needs preview desktop/mobile E2E with a real test database/account before release; no mobile-capable browser was available in this session. The existing duplicate /about.js and /about.tsx route warning is visible during local Next startup and is not changed here. ESLint's 96 warnings are also retained as follow-up work, not represented as resolved errors.
