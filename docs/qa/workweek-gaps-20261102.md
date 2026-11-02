# Workweek gaps repair (2026-11-02)

Baseline: main aa5ff1e. Scope: findings in PrepMeal_Workweek_Field_Test_20261102.md.

- Per-recipe view displays the API's recipe amounts and matches purchase progress by ingredient ID and measurement family. Checkboxes explicitly represent the whole week's purchase, shared across both views.
- Two-trip option provides separate read-only batch requirements for the first ceil(days/2) and remaining days. A repeated recipe is allocated using its actual portion weight, not by a set of unique recipe IDs. These are needs references, not a second set of purchase checkboxes; shares and checkmarks remain the week's master list. Review packaging leftovers before trip two.
- Lunch option uses an explicitly reviewed cooking-method shortlist; unreviewed recipes and immediate-service carbonara are excluded. First n-1 days cook twice the diner count; final day cooks once. First-day lunch is not included. Save and shopping pass identical per-occurrence amounts, including after draft/login restoration. Existing unchecked recipes warn and cannot be saved as a lunch plan until replaced.
- Shortlist review: published full-cook steps checked 2026-11-02 for corn-fish-rice, tomato-tofu-rice, prepmeal-batch3-04, garlic-chicken-pasta, vegetable-egg-fried-rice, stir-fried-cabbage and the five Japanese recipes published 2026-11-01. This is not a kitchen trial, a shelf-life guarantee or a balanced-diet certification. Review again when these methods change. Limited supply is reported through the existing slot-availability warnings.
- Plain water (slug water) is excluded from grocery totals. Broth and mineral water remain. Fixed-ratio merged measures display Chinese labels for Chinese preference; English preference remains English. Unknown densities or clove sizes are never inferred.
- Separate food-storage guidance from browser draft storage. Explain cooked-rice weight, extra cooking/packing time and the limits of the complete_meal label. CFS sources: https://www.cfs.gov.hk/tc_chi/consumer_zone/packed_meals.html and https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_store.html .
- Corrected production ingredient ribeye-beef-slices from seasoning to meat_seafood, verified by SELECT and production shopping preview (120g under meat). SQL with guarded rollback is in scripts/data-fixes/20261102_workweek_beef_category.sql. No recipe quantities/nutrition/images changed; one-person base stays fixed.
- corn and corn-kernels intentionally remain distinct: ingredient-level equivalence and nutrient-product equivalence are not established by their names. UI guidance explains reviewing product and package leftovers. No destructive ingredient merge or density conversion.

Validation: see PR description for final unit/runtime/TypeScript/build and preview results.

Limits: no live account write for testing, physical cooking, taste, measured packing time, product expiry entry or automatic expiry-based scheduling. Storage advice is conditional on product labels and an unbroken cold chain. This adds the requested choices and practical guidance, not a five-day freshness guarantee.
