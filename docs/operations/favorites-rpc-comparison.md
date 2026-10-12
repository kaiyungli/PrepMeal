# Favorites REST / RPC comparison

## Problem and behavior

The phone trace spent about 1,055ms after sending a favorites REST request, while a matching Supabase gateway sequence recorded origin_time 1,041 and Envoy upstream time 682ms. A native SQL reproduction did not reproduce the delay. This experiment compares the existing embedded REST query with a fixed SQL RPC through the same API, authentication, shared Supabase client, transport and diagnostic instrumentation.

Ordinary favorites GETs still use REST. Only an authenticated GET with include=recipes, an explicit read_path=rpc, X-PrepMeal-Favorites-Perf: 1 and server environment FAVORITES_RPC_COMPARISON_ENABLED=1 can choose RPC. RPC errors fail without falling back. Successful diagnostic reads confirm the path and use private, no-store.

The RPC is SQL STABLE SECURITY INVOKER, fixes search_path to empty, explicitly selects the same 24 recipe fields and filters user_favorites.user_id by the API-verified caller UUID. It returns recipe_id plus nullable recipes, which the existing response mapping converts to favorites and recipes. Only service_role has EXECUTE; PUBLIC, anon and authenticated are revoked atomically in the migration transaction. It neither writes nor grants new table privileges. The backend service role already bypasses RLS; the verified caller filter is essential on both paths.

## Phone protocol and interpretation

The existing 22-request / five-minute idle protocol is unchanged. The second button on /favorites-performance runs 24 sequential GETs in six blocks: REST/RPC/RPC/REST, then RPC/REST/REST/RPC, repeated three times. Each path has 12 observations. Blocks and positions are exported so first-block effects can be separated.

The runner verifies path confirmation and matching response content in memory across all observations. It ignores object key and array ordering while retaining duplicate values. A changed recipe/favorite snapshot or mismatch stops the run. Only completed blocks are published. The export contains fixed path labels, block/position, safe numeric timing/runtime fields and no tokens, account IDs or recipe content. It uses prepmeal-favorites-comparison-v1.

This is a consecutive-request comparison, not an idle or controlled cold-start experiment. An apparent RPC improvement does not prove SQL planning caused the earlier delay. Multiple comparable runs and paired/block analysis are needed before changing normal reads. Mutating favorites during a run invalidates its comparison.

Both runners have a 15-second deadline covering token acquisition, headers and body; retirement/unmount/stop prevents subsequent requests and stale samples. Only one run can be active in the phone panel.

## Validation

- npm run test:all: 1,969 unit tests and 163 component tests passed; the additional RPC transport-rejection case passes in the targeted rerun (1,970 unit cases total).
- npx tsc --noEmit: passed.
- Scoped ESLint and git diff --check: passed.
- npm run build: passed with synthetic Supabase configuration; hosted integration is still pending.
- Isolated PostgreSQL via PGlite 0.5.8: migration compiled and executed; SECURITY INVOKER/STABLE/search_path/ACL checked; anon and authenticated calls denied; service-role reads isolate two fixture owners; full projection, numeric/array/null values, empty owner/null parameter and missing-recipe join match the nested REST SQL.
- API tests verify the caller parameter cannot come from query user_id, gate off, invalid/array/non-diagnostic selectors, authentication failure, RPC errors/no fallback and response mapping.
- Phone tests verify balanced ordering, path confirmation, in-memory parity, safe export, timeout, late response, account retirement and explicit start.
- Two old migration tests assumed the September hardening migration must remain the last migration forever. Replace that assumption with checks against its actual prerequisite migrations; other security assertions remain.
- Production data/configuration/functions have not been changed by this preparation.

To reproduce the isolated SQL test without changing repo dependencies:

```sh
npm install --prefix /tmp/prepmeal-rpc-validation --no-audit --no-fund @electric-sql/pglite@0.5.8
PGLITE_MODULE=/tmp/prepmeal-rpc-validation/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-favorites-rpc.mjs
```

The test uses synthetic fixtures and never connects to hosted Supabase. It does not validate hosted PostgREST schema discovery or gateway behavior.

## Enable after review

1. Review the code and the single CLI-generated migration 20261012092432_favorites_rpc_comparison.sql. Confirm function signature is absent before applying; CREATE FUNCTION deliberately fails on a name collision.
2. Apply only this migration to the intended project using the approved migration workflow. Do not indiscriminately push older migration history.
3. Check function metadata and has_function_privilege for PUBLIC-equivalent client roles: anon/authenticated false, service_role true. Verify hosted REST RPC discovery and a service-role empty/matching result; do not print real caller IDs, credentials or payloads.
4. Deploy reviewed code with the comparison flag initially disabled; confirm ordinary REST favorites and mutations still work.
5. Set FAVORITES_RPC_COMPARISON_ENABLED=1 only for the reviewed environment and redeploy it. Run the explicit comparison button while keeping account/recipe content stable. Before approval, preview and production remain disabled.
6. Evaluate raw block/position timings and content equivalence before proposing RPC as the normal read path.

No production speed improvement is claimed until hosted validation and comparison runs exist.

## Disable / rollback

Unset FAVORITES_RPC_COMPARISON_ENABLED or set it to 0 and redeploy; explicit RPC requests then return 503 while ordinary REST continues. After confirming no in-flight experiments, the dedicated function can be dropped with a separately reviewed rollback:

```sql
DROP FUNCTION public.get_favorites_recipes_comparison(uuid);
```

No data rollback is needed. Do not change existing policies, table grants, indexes, connection pools or cache TTL as part of this experiment.
