# Work package 2 — Shopping list V2

2026-10-26 (Hong Kong). Owner approved the discussed scope, requested implementation first and physical-device acceptance afterwards.

## Implemented

- Shared interactive list for /generate and saved-plan details: category/recipe views, bought count, hide bought, bought entries sorted after remaining entries within each group.
- Recipe view uses the same aggregate checklist and clearly labels total meal-plan quantities. Category quantities retain canonical number/unit metadata; incompatible units never share a checkbox.
- Optional ingredients and dietary notes retained. Per-item notes; separately editable/removable extras with quantity/unit/note and bought state.
- Reconcile after recipe/serving/optional changes: unchanged/decreased demand retains check; increased/unknown changed quantity or unit requires another check with notice. Unused recipe items disappear; extras remain. Generate/clear resets the entire new plan's progress.
- Versioned, validated progress travels in the existing account-scoped seven-day browser draft, cross-tab conflict handling and explicit guest-login handoff. Older drafts remain readable without renewing expiry merely on opening.
- Saving a new meal plan and initial progress uses a single invoker-rights transaction. Existing clients without progress keep their existing RPC path.
- Saved plans load/save private account progress; serialized queued edits, revision compare-and-swap, visible errors/retry and explicit conflict reload. Cross-device changes load on page reload; no live collaboration subscription.
- Remaining/all copy and native mobile share, including notes/extras. Clipboard failure exposes selectable text; cancelled share is not success.

## Database

Applied additive migration `20261025194734_shopping_list_progress_v2`: new FK-cascaded `menu_plan_shopping_progress`, RLS select/insert/update restricted by parent ownership, anonymous table access revoked. New `create_menu_plan_with_shopping` SECURITY INVOKER RPC grants execute only to authenticated. Original tables, recipes and Auth settings unchanged.

Verified applied migration version, RLS and all three policies. Security advisors unchanged: existing recipe/menu SECURITY DEFINER warnings and leaked-password protection notice; no finding for the new table/RPC. Existing warnings remain tracked separately (https://supabase.com/docs/guides/database/database-linter).

## Verification

- Full suite: 2,237 unit + 198 component tests = 2,435 passing.
- After final review changes: 8 shopping model/database tests and all 198 component tests passed again; TypeScript passed.
- Real Postgres semantics via PGlite: atomic rollback, owner/other-account/anon access, outdated revision rejection, parent-delete cascade.
- UI/runtime: checks/hide, notes/extras, remaining/all copy, clipboard failure, rapid serialized writes, conflict reload; guest handoff includes checked extras and notes.
- Production build passed using public client configuration (no private service credential used for local build).
- New files ESLint and whitespace checks passed. Drawer retains two pre-existing set-state-in-effect lint findings; repository-wide lint is not claimed clean.
- Self-review covered account/plan-keyed mounts, stale response guards, unit-safe keys, bounded untrusted progress and invoker/RLS permissions.

## Delivery state

Implementation and automated checks complete. Publish as a separate commit on the existing draft PR #123 preview branch so its already-authorized callback/share link remains usable. This adds work package 2 to that PR; work package 1 remains preserved in prior commits. Main and production application code must remain unchanged until explicitly approved.

Pending: deployed preview acceptance, owner physical iPhone/iPad sharing/keyboard/touch checks, second real device/account acceptance, merge and production deployment. Do not mark physical-device QA complete from automated tests.

## UI revision after owner feedback

Owner passed functional acceptance but rejected the crowded UI. After online references were discussed, the owner instructed implementing the UI first for review. This revision is an implementation preview, not a claim that the owner approved its visual design.

- Replaced the generated-plan modal and saved-plan drawer presentation with one shared shopping sheet: full-height on phones, bounded dialog on larger screens, safe-area padding and one list scroll surface.
- Compact separated rows show check, ingredient, right-aligned quantity, a small edit control and an optional note. Empty note fields and the four-field add form no longer occupy the list.
- Editing/addition temporarily replaces list content with a focused form; return/save restores the trigger focus. Existing quantity/extras/notes semantics remain intact.
- Bought items collect in one collapsed section, with a five-second undo affordance. The category/recipe views share bought state.
- Sharing options appear on request; pantry/optional ingredients/full storage explanation have a separate expandable information area. Errors/conflicts remain visible outside that collapsed area.
- A fixed footer contains the add action and a compact, truthful storage status. No new database migration or auth/access configuration change.

Validation: full 2,237 unit +201 component tests passed (2,438 total), TypeScript, changed interactive components ESLint and whitespace checks passed. Runtime checks include on-demand editing/addition, bought reveal/undo, shared view state, extra edit/delete, focus restoration and cancelled native sharing. Production build verification recorded with delivery. Physical visual approval of this UI remains pending; functional approval refers to the prior version and is not automatically extended to the new presentation.

References informing this revision: AnyList official lists/details behavior (https://www.anylist.com/lists), Bring official list/tile choice (https://www.getbring.com/blog-posts/the-best-shopping-list-app), NN/g progressive disclosure (https://www.nngroup.com/articles/progressive-disclosure/). No claim that one layout is universally most comfortable.
