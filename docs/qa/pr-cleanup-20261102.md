# PR cleanup — 2026-11-02

Baseline main: aa5ff1e51f6193681fbc19fe0e3aae3c819158da.
All source branches are retained. This cleanup does not merge or deploy to production, apply migrations, or change recipe records.

| PR | Disposition | Evidence / remaining work |
| --- | --- | --- |
| #59 | Archive; track in #138 | Import/export v2 is still unfinished; preserve metadata and current one-person rules; review migration separately. |
| #84 | Superseded by main | Foreground request protection is present in current speculative fetch / favorites code. |
| #85 | Superseded by main | Navigation measurement is present and extended with request traces and v2 export. |
| #86 | Superseded by main | Active/timer cleanup is present with the newer concurrency limit. |
| #87 | Superseded by main | Pending request sharing, generation protection and loadMore locking are present. |
| #105 | Superseded for active API | Current API tests cover quantities, conversions, optional ingredients and integrity. Unused legacy buildShoppingList helper is not claimed fixed. Do not restore the obsolete parallel pipeline. |
| #110 | Replace with minimal subset in #137 | Preserve current dynamic guides; carry only 11 verified equivalent legacy redirects. |
| #111 | Consolidate into #137 | Local calendar save dates and latest-snapshot optional choices, retaining workweek servings changes. |
| #125 | Archive; track in #139 | Rebase and actual auth/email recovery verification are still required. |
| #137 | Keep as consolidated review PR | Workweek portions/shopping plus the remaining valid fixes above. |

## Redirect checks

The production generate catalogue returned 304 recipes with complete=true on 2026-11-02. All 11 redirect targets exist, and none of the source slugs is a current recipe. The old baby-bok-choy-soup → poached-baby-napa mapping was excluded because the vegetables differ. The current dynamic guide content is retained. No stale unavailable-recipe list is restored.

## Verification

Before consolidation, 8 focused performance / shopping suites passed 143 tests. After consolidation: 2,336 default/database tests and 240 component tests passed (2,576 total); TypeScript and diff checks passed. The save-date suite passed all 10 tests separately under Asia/Hong_Kong and America/Los_Angeles. A fresh preview build must pass for the new head; earlier preview UI evidence belongs to the earlier head and does not prove the new deployment.

Closing archived PRs is not a claim that their unfinished features have shipped. Main remains unchanged.
