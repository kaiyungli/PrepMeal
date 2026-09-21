# Legacy untracked migrations (archived, forensic-only)

This directory holds 14 `.sql` files that used to live in
`supabase/migrations/`. They were moved here by
`fix/archive-untracked-legacy-migrations` so that the active migration
directory contains only migrations the Supabase CLI can push cleanly.

**None of these 14 files has ever been recorded in the linked project's
`supabase_migrations.schema_migrations` table.** At the time of the
reconciliation audit, a direct, read-only query against the linked
project (`hivnajhqqvaokthzhugx`) returned exactly six timestamped
migration rows, the earliest being `20260905034023`. No version matching
any of the files below — `001` through `012` — appeared in that table
under any name at that time. This is a point-in-time observation, not a
guarantee about the table's future contents.

## What moving these files does — and does not — mean

- Moving a file here **is not a claim that it was ever applied**, and
  **is not a claim that it was reverted**. It is purely a statement that
  the file is not part of the migration set the CLI will attempt to push.
- **No `supabase migration repair` was run** as part of this change. The
  linked project's migration history table is untouched.
- These files **must not be executed** and **must not be moved back into
  `supabase/migrations/`** without a fresh reconciliation review that
  re-verifies live database state, since production schema may have
  changed since the audit this archival is based on.
- Preservation here is for **forensic and historical inspection only** —
  to answer "what did this repo used to think the schema looked like,"
  not "what is safe to run."

## Duplicate versions

Three version numbers were represented by two files each, with no way for
the Supabase CLI to order or distinguish them:

- `003` — `003_add_times_shown.sql` and `003_flavor_normalization.sql`
- `004` — `004_add_increment_times_shown_fn.sql` and `004_add_recipes_tips.sql`
- `005` — `005_add_recipes_created_at_index.sql` and `005_create_user_preferences.sql`

`supabase migration repair <version>` operates on the version string only
(it cannot address an individual file), so a shared version number can
never be repaired to reflect two different files' effects. Archiving
removes the ambiguity rather than attempting to resolve it in place.

## Current active migration state

`supabase/migrations/` now begins at `20260905034023_get_recipe_list_with_detail_json.sql`
and contains only 14-digit-timestamp-prefixed files, all the way through
the target of this reconciliation effort,
`20260920072450_baseline_and_harden_set_updated_at.sql`. There is no
`001`–`012`-style filename left in the active directory.

## The live schema predates the tracked chain

Several base tables — `public.recipes`, `public.menu_plans`,
`public.menu_plan_items`, `public.ingredients`, `public.units`,
`public.recipe_ingredients`, `public.recipe_steps`,
`public.recipe_equipment` — exist in the live, linked database today but
are created by **no migration anywhere in this repository**, tracked or
archived. The live schema was established before this repo's migration
history began being tracked. This is not limited to the archived files:
the currently **active** timestamped chain assumes these same tables. For
example, the now-first active migration,
`20260905034023_get_recipe_list_with_detail_json.sql`, declares a
`LANGUAGE sql` function whose body references `public.recipes`,
`public.recipe_ingredients`, `public.ingredients`, `public.units`, and
`public.recipe_steps` — none of which any active migration creates. This
means:

- **Archiving the 14 legacy files removes them as an active CLI-history
  blocker** — they no longer cause `supabase migration list` /
  `db push` to see unrecorded or duplicate-version local migrations.
  That is the only problem this change fixes.
- **The active timestamped migrations are still not replayable from an
  empty database.** A full local replay (`supabase db reset`) still
  fails, because the active chain itself assumes base tables/functions
  that no active migration creates — this was true before this change
  and remains true after it. Archiving the legacy files does not touch
  this; it neither introduces nor removes the dependency.
- **This change fixes linked-production migration-list alignment only.**
  It does not fix the active chain's missing baseline, and it does not
  fix disaster-recovery / fresh-replay correctness. Generating a schema
  snapshot that lets `supabase db reset` succeed from empty remains
  **unresolved and is intentionally out of scope for this change.**

## Audit classification matrix

Based on direct, read-only comparison of each file's intended effect
against live catalog/`information_schema` state in the linked project:

**Class A — live-equivalent (the file's intended end-state is
demonstrably present live):**

- `001_create_user_favorites.sql`
- `003_add_times_shown.sql`
- `003_flavor_normalization.sql` (no executable statements — vacuously equivalent)
- `008_fix_menu_plan_items_constraint.sql`
- `009_drop_duplicate_constraint.sql`
- `011_revoke_plans_unneeded_privileges.sql`

**Class B — superseded (an object with this name/purpose exists live,
but its actual definition was last written by a different, later,
already-tracked migration — not by this file's literal text):**

- `006_atomic_recipe_ops.sql` — live `admin_update_recipe_atomic` /
  `admin_delete_recipe_atomic` bodies were replaced by
  `20260910060642_reconcile_admin_recipe_rpc_contract.sql`.
- `007_atomic_recipe_create.sql` — live `admin_create_recipe_atomic` body
  and security context (no longer `SECURITY DEFINER`) were replaced by
  the same later migration.
- `012_get_menu_plan_shopping_list_json.sql` — live
  `get_menu_plan_shopping_list_json` groups by a normalized-unit CTE that
  only exists in `20260915053240_unit_safe_shopping_list_aggregation.sql`;
  this file's simpler (ingredient-id-only) grouping is not what is live.

**Class C — not live as authored (the file's named objects do not exist
live under the names/shapes it defines):**

- `002_create_saved_menu_plans.sql` — live schema uses differently-named
  tables `public.menu_plans` / `public.menu_plan_items`, created by no
  tracked or archived migration; `saved_menu_plans` /
  `saved_menu_plan_items` do not exist.
- `004_add_increment_times_shown_fn.sql` — `increment_recipe_times_shown()`
  does not exist live.
- `004_add_recipes_tips.sql` — `recipes.tips` column does not exist live.
- `005_add_recipes_created_at_index.sql` — `idx_recipes_created_at` does
  not exist live.

**Conflicting (same object name exists live, but with an unrelated
definition — must never be certified "applied"):**

- `005_create_user_preferences.sql` — live `public.user_preferences` has
  an entirely different column set and primary key (`user_id` as PK, no
  surrogate `id`, columns like `preferred_cuisines`/`unit_language` this
  file never mentions) from what this file defines. The table was built
  through some other, untracked path.

This classification is a read-only snapshot from the audit that motivated
this archival. It is not re-verified automatically and can go stale as
production changes — any future decision to act on one of these files
(repair, reapply, or formally supersede) must re-run the underlying
live-state checks first.
