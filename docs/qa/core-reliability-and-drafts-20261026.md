# Website improvement point 1 — execution ledger

User-approved scope: discuss each work package before implementation; point 1A then 1B. No new recipes. See the Library implementation plan for the full queue.

## 1A — implemented and locally verified; not deployed

- Homepage preview uses actual servings and invalidates on serving changes. Mixed-serving input fails visibly rather than silently averaging.
- Email/OAuth submission mutex, loading and failure recovery; existing providers preserved.
- Copy confirmation waits for clipboard success; denial offers selectable text.
- Catalogue fetch failure has retry, stale/unmounted responses ignored.
- Profile links to real favorites rather than asserting an empty collection.
- Shopping trigger uses button semantics; drawer/shared modal contain keyboard focus, restore focus and expose dialog labels.
- B9 assessment: saved-plan controller averages item servings; no normal UI path to create mixed-serving plans was found. No production account query or arithmetic redesign in this bounded phase. Keep as a separate verification item.

Validation: 2,225 unit + 183 component tests passed; TypeScript and diff whitespace checks passed. Targeted ESLint still reports 8 pre-existing errors (any types/effect state in existing files); no claim of a clean full-repository lint baseline. New regression suite covers provider failure recovery, duplicate email submit, clipboard denial, catalogue retry and drawer focus. Existing close-button assertion updated to its descriptive accessible name.

Review: inspected request/account invalidation, actual servings source, concurrent submissions, copy result truthfulness, data retry cancellation, keyboard focus/cleanup, and unchanged database/auth authorization. No schema, recipe or provider configuration changes.

## 1B — implemented and locally verified; not deployed

- Versioned, seven-day browser drafts persist recipe IDs, slot gaps, servings, composition, filters, exclusions and locks. Reopening without edits does not renew the expiry.
- Rehydrate IDs against the current complete catalogue; removed recipes remain empty with day/slot notices. Stored names/images/nutrition are never trusted as current catalogue records.
- Account-keyed workspace remounts immediately on logout or account switch; guest/account storage keys are separate. This is application-level account isolation in the same browser, not encryption against someone controlling that browser.
- Guest save creates a nonce-bound, same-tab, 30-minute session handoff; normal login does not inherit guest data. A successful handoff persists under the authenticated owner before consumption. Blocked storage prevents navigation that would lose the guest draft.
- Draft notices explicitly distinguish browser autosave from saved My Plans. Expiry, malformed data, missing recipes and storage failure have messages.
- Cross-tab changes pause autosave and offer remote-load or keep-mine actions. Compare the last stored value before writing as well as listening for storage events. Web Storage is not a transactional cross-device collaboration system.
- Clear requires confirmation; rejecting preserves the meal plan. Confirmed empty state is persisted.
- Homepage seed import now shares catalogue hydration and draft lifecycle rather than competing with restoration.

Validation: 2,229 unit + 194 component tests passed (2,423 total); TypeScript, production build using public client configuration, new-file ESLint and whitespace checks passed. The real Generate page/controller integration verifies restored servings/locks, immediate A→B/logout hiding, and cancel/confirm clear. Runtime lifecycle tests cover remount/reload, expiry, missing recipes, wrong/expired/absent transfer nonce, cross-tab conflict and storage denial.

Review: checked SSR/client boundaries, auth-keyed remounts, no cross-account automatic handoff, catalogue-backed IDs, stale request cleanup, stable fingerprints, seven-day expiry without read renewal, storage-failure notices, and explicit conflict resolution. The draft hook has a documented scoped set-state-in-effect lint exception for external storage hydration/write-result notices; initialization/fingerprint guards and lifecycle tests prevent feedback loops.

Browser limitation: the cloud browser cannot reach this container's localhost server (ERR_CONNECTION_REFUSED). No browser-level test of this branch has yet been claimed. Production build and rendered-page integration passed. Real OAuth, authenticated shopping/clipboard and live deployment acceptance remain pending.

No production recipe/database/schema/provider settings changed. 1A implementation commit: 2472cb2. The following commit contains 1B and its regression tests.

## Remaining work packages

2 Shopping List V2 — awaiting discussion, not started.
3 Reusable plans and availability feedback — awaiting discussion, not started.
4 Cooking mode — awaiting discussion, not started.
5 Product measurement and content trust — awaiting discussion, not started.

Deployment/live account acceptance: not performed. Latest main baseline 044895b7e7c3c6d41b40ef76320cc942e97478c2.

## Delivery gate

1B implementation commit: 88ab908ad49b4479423f2acb6cd4b297cc7f5189.
Push of `fix/core-reliability-and-drafts` was rejected by automatic approval review: implementation authorization was not considered explicit permission to publish/push code to GitHub. No workaround or retry. Branch, commits and validation remain local; no PR, merge or production deployment. Explicit authorization for this branch push and draft PR is required to continue external delivery. Work packages 2–5 remain untouched.

## Authorized draft delivery — 2026-10-26 Hong Kong

Owner explicitly approved branch delivery and a draft PR. Git CLI lacked HTTPS credentials; authenticated GitHub tools published the identical tested tree 016a0b453c4bc76d0f6216fa818109090326a5a5 as commit adffe3eaf019e05d743285c485fb981f0797eecf. PR #123: https://github.com/kaiyungli/PrepMeal/pull/123 (open draft, base main). The earlier automatic approval gate is resolved. No merge or deployment was requested or performed. Browser/live account acceptance and mixed-serving-history verification remain pending; work package 2 has not started.
