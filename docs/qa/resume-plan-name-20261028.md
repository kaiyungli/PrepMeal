# Preserve the meal plan name through guest sign-in

## Problem and change

A guest enters a name in the save dialog, submits, and signs in. The explicit same-tab handoff restores meals and servings, but reopening the save dialog clears the name. The name lived only in page-local state and was absent from the transferable draft.

The name now belongs to the existing account-scoped draft snapshot. The save dialog uses that state without clearing it on opening. The existing explicit nonce-based handoff carries the name with the meals, settings and shopping progress. Ordinary sign-in and account switching continue to respect draft ownership. The name is not placed in the redirect URL.

`planName` is optional for existing version-1 drafts; provided values must be strings of at most 100 characters. Legacy drafts normalize to an empty in-memory name without renewing their seven-day expiration merely by opening. Empty names still use the existing generated default on save. Explicit homepage imports start with an empty name.

## Validation

- Added a real-page regression test that failed before the fix with an empty post-login name. It captures the actual handoff at sessionStorage, stops before jsdom navigation, remounts under the signed-in owner with its nonce, checks the dialog name, cancels/reopens, submits to the mocked save service, and reloads the workspace.
- The save service receives the original custom name. The regression uses the actual page, controller and draft hook; authentication and external persistence are mocked.
- Default-name compatibility, legacy storage, invalid name types/length, same-tab handoff consumption, ownership isolation, seven-day expiration, existing shopping progress, saving and slot normalization are covered by the focused suites.
- 16 component/runtime tests and 36 focused unit/save tests passed, 52 total.
- TypeScript and ESLint on the changed TypeScript/test files passed; whitespace checks passed.
- `generate.js` has the same three existing `react-hooks/refs` errors and one unused-variable warning as the base commit. No new diagnostics were introduced; unrelated lint cleanup is outside this fix.
- Local Next build passed compilation and type checking, then stopped collecting page data because this isolated checkout lacks the required Supabase environment variables. No fabricated credentials were added. The initial symlink dependency layout was replaced with a local dependency tree to resolve a Turbopack filesystem-root limitation.

## Release scope

No database schema, recipe catalogue, OAuth provider configuration or AdSense changes. No automatic save after login was added: the user reopens the save dialog, reviews the retained name and saves. Production browser verification remains pending deployment; automated regression evidence is not described as a production retest.

## Browser acceptance after deployment

1. As a guest, generate a five-day two-person plan, replace one meal, and change to four servings.
2. Enter a distinctive custom name and submit the save dialog.
3. Complete normal sign-in, reopen Save, and verify the name, meals and servings are retained.
4. Cancel/reopen and reload the workspace; verify the name remains.
5. Save and reopen from My Plans; verify the custom name, five meals, four servings and shopping progress.
6. Check a fresh unnamed draft still uses the generated default, and normal sign-in to another account does not inherit the first account's name.
