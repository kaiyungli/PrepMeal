# Ingredient identity and shopping quantity correction

Three duplicate catalog entries (chicken mid-joints, green bell pepper, fermented black beans) now use canonical ingredient IDs. Historical entries are retained inactive; recipe quantities, notes and nutrition stay unchanged. Count aliases are unified only for eggs, chillies and bay leaves.

The owned-plan mobile RPC now adds each meal occurrence using its own servings divided by recipe base servings. It omits optional ingredients and non-public recipes, while preserving ownership, unit language and response shape. Mobile has no optional selector. Web optional ingredients start unchecked and enter the list only after explicit selection; existing saved selections remain effective.

Validation: 115 Vitest files / 2185 tests pass, including executable PostgreSQL tests with PGlite for mixed/fractional servings, repeat meals, options, private recipes, ownership, language, catalog replay and count-unit boundaries. Targeted ESLint and git diff checks pass.
