# Test runner stability — 2026-11-03

## Reviewed evidence

Before this change, `npm run test:all` intermittently timed out in
`onePersonRecipeMigration`, `homeFilterConfirmation`, and
`generateDraftPage.runtime`. The migration/home files passed all 26 tests when
retried alone; the entire component suite passed 235 tests with one worker.
The failed assertions and their original deadlines have not been changed.

This runtime exposes `os.availableParallelism() = 8`, with an 8 GiB cgroup memory
limit. Installed Vitest 4.0.18 computes its default run worker count as available
parallelism minus one (7 here). Concurrent PGlite initialization and jsdom/React
rendering compete for CPU and memory. Resource contention is the supported
working explanation, not a proven diagnosis of every possible timeout.

## Change

- Limit unit test files to 2 workers in `vitest.config.ts`.
- Run component test files with 1 worker in `vitest.components.config.ts`.
- Keep all test files, assertions, default deadlines, and package scripts.
- Keep file isolation and test concurrency defaults.

This bounds test runner resource use on local machines and CI. It trades parallel
throughput for more predictable execution; stronger machines can override the
worker count explicitly through the Vitest CLI.

## Validation

Run the unchanged `npm run test:all` twice consecutively, without concurrent
build, lint, or TypeScript jobs. Results are recorded in the pull request.
Round 1 passed all 2,566 tests: unit 2,331 in 75.08s; component 235 in 30.34s.
Round 2 passed all 2,566 tests: unit 2,331 in 86.91s; component 235 in 31.39s.
Two successful runs reduce observed flakiness but do not guarantee that future
runs on different hosts or under heavier load cannot time out.

No application code, production configuration, timeout, retry setting, or skipped
test was added by this change. Build/smoke and browser E2E are not needed to
validate this runner-only change and have not been rerun for it.
