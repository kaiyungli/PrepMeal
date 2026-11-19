# Approved cream rice seasoning reformulation — executed transaction

Status: Applied to the confirmed PrepMeal hosted database on 2026-11-19 after independent review and seven passing offline tests. Readback verified seasoning, steps, nutrition and fingerprint. Do not reapply `apply.sql`.
User approved the new total seasoning and split on 2026-11-19. This is a
reference recipe reformulation, **not test-cooked** and not a measured sodium
analysis. Recipe: `730703aa-438f-416a-b775-c7eb1e4c5892` / creamy-spinach-mushroom-chicken-rice.

| Field | Before | Approved target |
| --- | --- | --- |
| Salt total | 1tsp | 0.25tsp |
| Black pepper total | 1tsp | 0.125tsp |
| Step 1 | 將白米90克按包裝指示煮熟備用；雞胸切件，用材料表所列的部分鹽和黑胡椒調味。 | 將白米90克按包裝指示煮熟備用；雞胸切件，先用材料表一半的鹽和黑胡椒調味。 |
| Step 6 | 加入雞肉回鍋，試味後淋在熱飯上即可。 | 雞肉回鍋煮至熱透，試味後按需要加入餘下的鹽和黑胡椒拌勻，淋在熱飯上即可。 |
| Energy | 844kcal | 839kcal |
| Protein | 40.4g | 40.2g |
| Carbohydrate | 82.1g | 80.8g |
| Fat | 39.3g | 39.2g |

Nutrition reuses the existing ingredient references, per-100 values and unit
conversion basis. Salt is 1.5g and black pepper is 0.2875g under those existing
conversions. Contributions and totals were recalculated using Decimal, with
half-up rounding to whole kcal and one decimal for macros. Nutrition assumes
the **full listed** salt and pepper are consumed; actual intake may be lower
when the final remainder is only partly used. This limitation is stored with
the nutrition ledger. Sodium is not a stored calculated field here; no sodium
number or measured cooking claim is added.

`data-patch.json` has bounded before/after snapshots and ingredient reference
metadata. `apply.sql` locks the exact recipe, ingredients and steps, refuses
changed inputs, changes only two ingredient quantities, two step texts, the
four nutrient totals and the expected nutrition/guidance/reformulation source
metadata, then verifies the complete protected state. Live view counts are
excluded from stale-input comparison but preserved across the transaction.
Other recipe and child fields, row identities, images, material amounts,
source metadata and existing cooking tips are protected. A refreshed editorial
fingerprint is checked against the real TypeScript fingerprint function by
the offline tests.

Before execution, confirm the connected PrepMeal project and current state.
Run the guarded apply once, then read back materials, steps, rounded nutrition,
ledger and normalized tips. Check the detail page and shopping-list quantities.
Re-execution refuses rather than overwriting. `rollback.sql` requires the exact
changed state and restores all original data and row identities while keeping
the current view count. Inspect current state before rollback; it refuses later
edits. No cache invalidation is included; the application uses existing ISR.

PGlite tests cover actual before/after fingerprints, evidence calculations,
approved apply and protected fields, repeated-apply refusal, exact rollback,
later-edit rollback refusal and stale-ingredient refusal. These tests do not
claim execution against the hosted database or physical cooking.
