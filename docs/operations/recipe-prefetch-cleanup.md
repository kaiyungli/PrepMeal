# Recipe detail prefetch cleanup — 2026-10-13

The Recipes page previously cancelled its initial idle/timeout callback on unmount or a changed first-eight-ID list, but did not cancel the inner 250 ms timers after the batch had started. The remaining details could therefore start loading while the user was already on another page.

The scheduling now lives in `useRecipeDetailPrefetch`. Cleanup retires the batch, cancels the initial callback when possible, and clears every pending staggered timer. A retired callback also checks an active flag, covering browsers without cancelIdleCallback and callbacks already queued for execution. JSON-encoded ID dependencies avoid rescheduling for unrelated renders. The first-eight cap, 250 ms staggering, idle timeout and one-second fallback are retained.

Already dispatched detail requests remain under the existing shared cache. They are not aborted: a foreground modal may have joined the same request. Explicit reads, recipe detail caching, account state, API options and database behavior are unchanged. This branch builds on PR #84 independently of the navigation/export work in PR #85, whose code and measurements remain preserved.

## Evidence

- The reproduced fallback sequence starts one detail read, unmounts the page, then advances four seconds. Previously the seven remaining timers could dispatch; the new runtime test observes exactly one total call and zero calls after unmount.
- Tests also cover leaving before scheduling, changed IDs, unchanged-ID rerenders, absent idle cancellation, cleanup after the idle callback ran and StrictMode effect replay.
- 1,998 unit tests and 163 component tests pass. The count belongs to the PR #84 base plus this independent change; it is not the PR #85 test suite.
- TypeScript, new hook/test ESLint, production build with synthetic build-only variables and diff check pass.
- The Recipes page retains existing lint findings with no new diagnostic categories.

This verifies scheduling and request counts under controlled tests, not a measured reduction in real desktop/phone navigation time. It does not claim to solve first-entry latency or the outside-handler network/platform delay. Real browser validation can follow when the user is back at the computer; no rerun is needed to validate the timer cleanup itself.
