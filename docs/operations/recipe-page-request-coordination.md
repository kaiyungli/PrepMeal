# Recipe pagination request coordination — 2026-10-13

The shared recipe listing hook previously tracked background pages only by number, without sharing their pending promises with foreground pagination. A pending preload plus two rapid loadMore calls issued three requests for the same page. It also accepted late prefetch/foreground responses from retired searches, allowing stale recipes into a new list or its page cache.

Pending page promises are now shared with foreground loadMore. A synchronous lock prevents duplicate foreground calls before a React rerender. Each enabled query has an active generation; retired callbacks cannot merge recipes, populate a new cache, delete a replacement promise or release a new foreground lock. Initial reads also retire on cleanup. One effect owns the 500 ms next-page preload timer, replacing unowned post-response timers; the synthetic 50 ms cache-hit delay is removed.

Pagination waits for the new query's first list to settle during debounce. Complete initial lists do not preload a nonexistent next page. Equivalent filter objects preserve pagination rather than resetting page numbers on unrelated renders. The existing page size, initial-list skip, module cache TTL, recipe ID deduplication, API parameters, 300 ms search debounce and speculative network restrictions are retained.

Already issued list requests are not aborted; their late results are ignored after retirement. Pending sharing is scoped to a hook instance/query rather than a global cross-instance request cache. Initial API failures and foreground pagination errors retain the existing error-handling paths.

## Validation

The new 11-case runtime suite was run against the original PR #84 head and this change. Baseline: 10 failures, 1 pass; corrected: 11 passes. The overlap case observes three network calls before and one after. The stale-cache baseline actually appends the old search's `stale` fixture; the corrected hook appends only the new search result.

Tests cover pending/completed prefetch reuse, rapid foreground calls, failure/retry, retired prefetch and foreground responses, disable/re-enable of the same query, unmount, complete initial lists, equivalent filter objects and new-query debounce.

- Full suite: 2,001 unit tests and 163 component tests pass, on the PR #84 base plus this independent change.
- TypeScript, new test lint, synthetic-environment production build and diff check pass.
- Existing hook lint: 7 errors/3 warnings versus baseline 9 errors/3 warnings. Remaining diagnostics are existing explicit-any and dependency/unused-import findings; no new rule categories were introduced.

This independent branch is based on PR #84. PR #85 navigation/export and PR #86 detail-timer cleanup are preserved separately; combined integration must be checked when assembling them. No database, authentication, recipe filtering semantics, meal-plan or shopping-list changes are intended. Real desktop/phone latency has not been measured for this branch; request-count and race behavior are verified by the controlled runtime tests.
