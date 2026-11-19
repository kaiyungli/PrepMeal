# Fourth recipe batch — review and prepared data correction

Status: Draft application changes. The three SQL data corrections were applied to the confirmed PrepMeal hosted database on 2026-11-19 after user approval. Readback confirmed the 30ml water row, two optional salt flags and all three updated fingerprints. Do not reapply `apply.sql`.

The ten reviewed production pages returned HTTP 200 on 2026-11-15. They are
green-pepper-beef, black-pepper-beef-xhs, garlic-eggplant, dry-fried-green-beans,
tomato-tofu, tofu-egg-pancake, kimchi-egg-tofu, salt-pepper-tofu,
poached-baby-napa and poached-spinach-broth.

The application change replaces per-recipe pairing mappings with shared catalogue-based recommendation rules and cleans up
black-pepper beef starch allocation, pancake preparation order, and a rigid
salt instruction. Ingredients, nutrition and stored guidance are unchanged
by the application code.

Three separate data corrections were executed using `apply.sql`:

| Recipe | Existing issue | Prepared correction |
| --- | --- | --- |
| 韓式泡菜滑蛋豆腐 | Step 3 uses two tablespoons of water, absent from ingredients | Add 30ml cooking water; keep the existing step |
| 上湯娃娃菜 | Steps and tip make salt conditional, but the ingredient is mandatory | Mark the existing salt row optional |
| 上湯浸菠菜 | Step makes salt conditional, but the ingredient is mandatory | Mark the existing salt row optional |

`data-patch.json` contains bounded before/after public inputs and reviewed
metadata. Updated fingerprints keep the existing tips and pairings valid after
the three ingredient changes. The SQL checks every catalogue input and the
exact old editorial metadata, locks the three recipes and their existing
children, and verifies final inputs and protected recipe fields. Nutrition and
other source metadata are preserved. The rollback checks the expected changed
state before restoring the original flags and removing only the inserted row.

For any future re-execution after an inspected rollback, recheck the connected project and all three live recipes;
stale input must fail rather than be overwritten. Execute the transaction once
through the existing authenticated database workflow, then read back the three
records and verify their normalized guidance. Check both detail pages and the
shopping-list representation. A code merge does not execute these SQL files.
Use `rollback.sql` only after inspecting current state; it refuses subsequent
edits. No cache-clearing operation is included.

The PGlite regression suite covers apply, protected values, metadata/fingerprint
normalization, repeated-apply refusal, exact rollback, missing-unit refusal and
concurrent edits. This is a desk review, not a cooking trial.
