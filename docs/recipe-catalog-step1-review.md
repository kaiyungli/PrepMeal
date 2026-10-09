# Recipe Catalog Audit: step 1 repair review

Scope: independent branch from main `e8c9236624eabd350f5349c97b419db007612825`.
User approved implementation, tests, Code Review and a Draft PR only.
No Production SQL, data corrections, merge or deployment was performed.

## Resulting behavior

Exports now use `prepmeal.recipe-export` version 2. In addition to the existing
canonical fields, ingredients and steps, they preserve `protein`, `diet`,
`flavor`, `protein_g`, `carbs_g`, `fat_g` and `total_time_minutes`.
All seven fields are required in v2, including explicit empty arrays or nulls.
Tags remain unchanged (including custom tags); numeric strings, negative or
nonfinite nutrition, fractional/overflowing total time and malformed arrays fail
validation. Existing v1 files remain accepted through the existing RPC, with
its original defaults. A v1 file carrying the new metadata is rejected with an
instruction to use v2, rather than silently dropping it.

The import modal and API share envelope validation. v2 imports call the new
`admin_import_recipe_atomic_v2(jsonb,jsonb)` function once per recipe. It invokes
the unchanged canonical 22-argument create function and updates metadata in the
same transaction. Failed metadata writes roll back the parent and both child
tables. Imports still create recipes, reject duplicate slugs and allow partial
success across a batch. They do not update existing catalogue rows.

Ingredient diet matching now recognizes Chinese fish compounds and English
sea-bream/dace aliases, and distinguishes oyster mushrooms and chicken/duck/
quail eggs from animal meat. Compound exemptions apply to each input field;
meat in another field or ingredient still disqualifies the recipe. These are
heuristics over supplied ingredients, not a guarantee of dietary suitability
when ingredient data is incomplete. The helper feeds recipe-page diet tags;
Generate's engine and its production catalogue were not changed.

This export is a recipe transfer format, not a full database backup: IDs,
ownership/audit fields, generated status, excluded_tags, equipment and related
non-recipe entities are outside its contract. Previously lost metadata cannot
be recovered from an old v1 export.

## Database approval boundary

`20261008085145_admin_import_recipe_metadata_v2.sql` is a draft migration only.
It creates a separate RPC, uses SECURITY INVOKER with a pinned search_path, and
grants execute to service_role only, revoking PUBLIC, anon and authenticated.
The existing canonical create/update/delete functions and table grants/RLS are
unchanged. Review and separately approve database application before enabling
v2 imports in an environment. The migration must precede application rollout;
without it, v2 imports fail with an RPC error and never fall back to a lossy v1
write. No migration or production import was run during this work.

## Code Review by phase

Self-review completed; independent reviewer approval is still pending.

1. Boundary review: verified main and PR #58 head
   `fd1b7f94fad2eb1c3f1e8f3b97cf89b568012d80`, and compared changed paths. No file
   changed by PR #58 is modified here. Existing admin CRUD RPC argument builders
   and canonical migrations remain unchanged.
2. Implementation review: checked version routing, strict metadata validation,
   duplicate handling, transaction rollback and grants. Added regressions for
   the catalogue fish/mushroom compounds and contradictory meat aliases.
   Replaced an existing historical-migration test's “must remain latest forever”
   assumptions with checks for its actual prerequisites; retained its security
   and uniqueness assertions.
3. Verification review: all 1,669 default tests, 69 existing component tests and
   4 new admin component tests pass. Nine embedded PostgreSQL/PGlite tests run
   actual baseline table definitions, the existing canonical create function
   and the draft v2 migration. They cover preservation, null/empty metadata,
   malformed values, post-create rollback and function privileges. This is
   isolated SQL execution, not a live Supabase/PostgREST verification.

Targeted ESLint and `git diff --check` pass. `tsc --noEmit` remains blocked by
35 pre-existing diagnostics in main; a clean archive of the pinned main gives
identical diagnostics after file-path and line-number normalization. This PR
adds no TypeScript diagnostics. A successful production build is not claimed.
The pinned dev-only PGlite dependency enables repeatable SQL checks with no
network connection or credentials. `npm run test:all` includes all three suites.

Current Supabase changelog and database-functions documentation were checked.
The recent Postgres minor-upgrade warning concerns ltree/btree_gist/custom
operators and legacy pgcrypto encryption; this migration does not use them.


## Approved review-finding repair

The follow-up review of head `2f3fc46fb82bca0a014897fa2b52e0ad75c750d2`
found one P2 regression: unrestricted Chinese substring matching confused
牛油果 with 牛油, 素雞 with 雞, and 豌豆蛋白粉 with 蛋. The user approved
repairing this finding, adding regression tests and updating the Draft PR.

The matcher now requires complete terms in both languages. Known Chinese animal
compounds use explicit aliases (including catalogue fish, seafood and poultry
names); salted/duck eggs have explicit positive aliases. Plant names do not
exempt conflicting animal or dairy evidence in another field or ingredient.
Unlisted compounds still depend on recognized names/slugs; this is not an
exhaustive dietary classification system.

Follow-up self-review checked positive signals, negative signals, name-only
inputs and contradictory evidence. Eighteen new regressions cover plant names,
real animal compounds and real egg/dairy terms. All 1,687 default tests, 69
existing component tests and 4 admin component tests pass (1,760 total).
Targeted ESLint and diff checks pass. TypeScript retains the same 35 baseline
diagnostics. Comparing all 162 ingredients in the prior audit snapshot against
the reviewed head changes only avocado, removing its incorrect egg_lacto tag;
the existing fish/mushroom corrections remain intact. This comparison used the
saved audit snapshot and did not access or modify Production.

This repair changes only the diet helper, its tests and this review record.
It adds no changes to the import/export API, draft SQL migration or PR #58 files.
The P2 reproduction cases now pass; no further finding was identified in this
bounded self-review. Independent reviewer approval remains pending.

## Remaining work

Obtain independent review of this Draft PR and resolve main's build/typecheck
blockers through the appropriate workstream. Catalogue data corrections,
complete-meal coverage improvements, nutrition/tag reconciliation and Generate
quality validation remain separate audit follow-ups. Production database
application, merge and deployment each need explicit approval.
