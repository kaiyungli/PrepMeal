# Speculative request performance — 2026-10-13

## Problem and resulting behavior

An intent-only Favorites prefetch could abort an active ID-only Favorites read on another page and issue a full recipe read instead. A deterministic runtime regression test reproduces the overlap: before this change, two GETs and an aborted foreground signal; after this change, one GET and the original foreground signal remains active. Explicit navigation to Favorites still loads full recipes when needed.

Desktop and mobile share the changed code. The new speculative guard covers Favorites intent, recipe detail preloads, recipe listing next-page preloads, and the home grid's explicit route preloads. It skips new speculative work when the browser reports offline, hidden visibility, save-data, or slow-2g/2g. Home route timers check the guard at execution time and only record a route as prefetched when actually dispatched.

Explicit Favorites reads/retries, recipe modal reads, and loadMore do not use this guard. Confirmed cached recipe details remain reusable. A fresh Favorites return on save-data still reuses its confirmed account/epoch cache without a new GET. Existing 30-second freshness, five-minute idle cleanup, logout/account invalidation, and write reconciliation are retained.

## Validation

- `npm run test:all`: 1,990 unit tests and 163 component tests pass.
- `npx tsc --noEmit`: pass.
- ESLint on the new guard/tests and Favorites hook/tests: pass.
- ESLint on the three touched legacy recipe files: 20 errors and 5 warnings, matching base a79ff502da9c29999f7f4e8f63e897e5a86727a2. Diagnostics differ only in source paths/line numbers; these existing findings are not resolved here.
- Production build with synthetic Supabase build-only variables: pass; no production database connection is used for validation.
- `git diff --check`: pass.

Tests cover unchanged foreground reads, cached returns, token retrieval suppression, network restrictions, hidden timers, normal route preloads, explicit modal/loadMore requests, account switching, late responses, and speculative timeouts.

## Limits and next measurement

This is a request-count and speculation fix, not a measured reduction of the roughly 290 ms outside-handler latency previously observed on the phone. No desktop/phone browser performance run has been completed for this branch. These automated tests do not establish that all navigation times are unchanged.

Connection hints are optional. Browsers without them retain existing visible/online prefetch behavior; this does not detect every congested network. Already issued speculative requests are not cancelled by a later hint/visibility change. The guard does not implement a global concurrency budget or alter Next Link's automatic route prefetching.

After review and deployment, compare first entry, return entry, and another-page navigation for desktop and mobile, including request count, page-ready time, and cache hits. Keep normal network and restricted network results separate. An independent region experiment remains necessary to distinguish platform admission from cross-region transit. No database, API region, authentication, meal planning, or shopping-list behavior is changed in this patch.
