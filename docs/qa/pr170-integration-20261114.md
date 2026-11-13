# PR #170 integration review — 2026-11-14

## Reviewed scope

Integrated original PR head `9a40af0749fb44252d3d05f118059dff69838faa` with current main `f96d8174efd0a02d6e4944e319f20eb3980cfe5d`. The merge was clean. The commit preserves both parents rather than rewriting the original PR branch. The current homepage design, recipe editorial guidance, 17 reviewed cold-serving markers and detail-loading placeholder from #177 are retained.

The feature delta remains real recipe-card anchors with ordinary-click modal handling, independent favorite buttons, a complete server-rendered directory, related recipe links and pagination measured at the card-list end before the directory. Modified link clicks keep the browser's normal behavior. The public catalogue query requires `is_public = true` and a non-null slug; incomplete/error results are withheld.

During bounded review, repeated catalogue rows were found capable of creating repeated links. The index and related-recipe helper now deduplicate by slug, retaining the first valid occurrence. The existing public catalogue's 303 unique entries retain their behavior. The page's optional `related` prop also has an explicit JSDoc type, without tightening its existing defensive raw-recipe input contract.

## Test cases

- Real card `href` values with modal callbacks; ordinary activation interception; Ctrl/Meta/Shift/Alt/middle-button handling; separate favorite controls with no nested interactive elements.
- All 303 existing public recipes are present exactly once in SSR directory markup; encoded slug paths and escaped display names; absent/empty link sections.
- Every catalogue recipe's recommendations exclude itself, do not repeat within/across groups, stay within limits and point to existing catalogue entries. Repeated synthetic input is deduplicated.
- Public-visibility and non-null-slug query arguments; complete/empty catalogues; pagination beyond 1,000 rows; missing counts, truncation, errors and changing counts fail closed.
- Card-list-end pagination with the large directory below it; near/far thresholds; resize; loading, loading-more, error and exhaustion guards; listener cleanup on unmount.
- Actual reviewed cold-soba guidance and related links coexist in standalone server HTML, including canonical URL and full detail content. Catalogue failure retains the primary recipe; missing primary recipes remain 404.
- The existing #177 component regressions continue covering loading → cold → warm guidance and deferred detail behavior.

## Executed checks

- Targeted unit tests: 13 passed.
- Targeted component tests: 51 passed.
- Full suite: **2,543 unit tests + 320 component tests passed**.
- TypeScript: passed after refining page/fixture types.
- Changed-file ESLint: passed (only the environment's npm proxy-config warning).
- Full feature diff and React integration review: completed; diff whitespace check passed.

The full test suite was run once for the final runtime implementation. Subsequent refinements were JSDoc/fixture typing and query-argument assertions; TypeScript and affected-file lint were rechecked. Final exact-head CI and Vercel build status are recorded in the PR description, followed by independent Preview interaction verification.

## Boundaries

No database queries or writes, schema changes, environment changes, production release or main merge were performed. Original worktrees and the protected uncommitted About files were not changed. PR #172, #173 and on-hold #137 were not modified.

Not executed by this implementation pass: local production build with deployment credentials, native browser keyboard/new-tab behavior, physical phones, Safari/Firefox, screen readers or real-account favorite writes. jsdom geometry and synthetic click tests do not establish real viewport or native Enter behavior. Preview browser checks are a separate verification step.
