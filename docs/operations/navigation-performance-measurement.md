# Desktop and phone navigation measurement

This opt-in, document-local diagnostic supplements the direct API benchmark. It records real browser SPA navigation; it does not run an emulated desktop/phone test or provide results until a user executes the steps. The implementation branch builds on PR #84; PR #84's reviewed head is preserved.

## Run in a real browser

1. Open `/favorites-performance` on the deployment containing this feature and log in normally. Stay on the same host and browser tab throughout. If the Vercel preview requires access, complete that sign-in first. A production-host redirect or reload clears the diagnostic session.
2. Select Desktop or Phone according to the device actually used; viewport dimensions are recorded separately. Press **開始導航量度**. Do not run the API benchmark simultaneously.
3. Use the bottom panel for **首次測試收藏 → 切換食譜 → 返回收藏 → 切換首頁**. Wait for each step to settle before continuing. Keep the tab visible and the phone screen awake; avoid other interactions during the round.
4. Press **匯出導航結果**. Desktop downloads JSON; a phone may offer native file sharing. Repeat five rounds on each device and send the files for analysis. Record connection changes separately rather than comparing Wi-Fi and mobile data as though they were the same condition.
5. Use **結束量度** to discard this document's state. Nothing is stored in session/local storage or sent to an analytics server.

The first sample means the first measured entry, not a cold cache. Normal account/epoch caches, foreground requests, automatic page preloads and Next Link behavior remain active. The diagnostic does not clear caches, alter fetch options or start writes. Opening the homepage preserves its usual local hero-plan behavior.

The panel's Favorites step buttons use the same pointer/focus/touch intent prefetch as the normal Favorites navigation link. Durations start at the actual click handler, so a completed prefetch can make a first measured entry a cache hit. This is perceived navigation latency, not total elapsed time since prefetch began. The panel performs router.push; it does not independently replicate Next Link's code-prefetch behavior, though the normal page Header is still mounted.

## Definitions and limits

| Field | Meaning |
|---|---|
| `route_complete_ms` | Step-button handler to Next router's completion event; not a paint metric. |
| `data_ready_ms` | Handler to the page's settled-list effect. Favorites waits for auth, initial load and any refreshing; Recipes waits for its first list to settle and its Favorites hook to finish loading. Home covers only its recipe list, not hero plan/shopping preview/full-page readiness. |
| `completed_api_resources` | Same-origin `/api/` Resource Timing entries whose responseEnd falls in the step window. This is not a count of all requests initiated: it can include older requests that finish in the window and omit in-flight/evicted/unavailable entries. |
| `outcome` | `ready`, `error`, `cancelled`, `timeout` (15 seconds), or `hidden`. Any non-ready step makes `complete` false. |
| `mode`, `viewport` | User-selected device label and measured viewport. The device label is not hardware verification. |

Route completion and list readiness may arrive in either order; a successful sample requires both. An empty, not-yet-fetched Recipes list is not treated as ready during debounce. Auth transitions, logout and changed account/epoch discard the diagnostic state and retire pending timers; queries and arbitrary routes are not exported. Export includes only fixed step/page names, safe timing/count fields, viewport/device label and an optional validated public deployment commit SHA. It contains no URLs, tokens, account IDs or recipe payloads.

The panel, diagnostic effects and normal browser variability can affect the measured values. Use the same instrumentation on both deployments for an actual before/after comparison. Comparing this branch's navigation data against the previous API-only JSON files is invalid. A valid control deployment with the same instrumentation and old prefetch behavior has not been created. There are no measured real desktop/phone results yet.

## Verification

- 2,000 unit tests and 163 component tests pass, including data-before-route/route-before-data, privacy, native sharing, interrupted steps, empty-list debounce, initial-data reuse and idle behavior.
- TypeScript and ESLint for the new diagnostic modules/tests pass.
- The touched existing page/home/list files retain the baseline's 9 lint errors and 6 warnings, with no added diagnostic categories.
- Synthetic-environment production build and diff check pass.
- Browser layout and real navigation performance still require the browser run above; jsdom is not browser QA.
