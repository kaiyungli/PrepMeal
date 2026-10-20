# PR107 additional acceptance — 2026-10-20

Follow-up implementation: see `optional-shopping-fix-20261020.md`. Findings below describe the earlier tested preview and are retained as historical evidence.

Scope: dietary filtering, meal-plan round trip, and account isolation. Tested the existing PR107 preview; no merge or production deployment performed.

## Automated verification

- 13 targeted suites: **142 passed**. Covers diet filters, vegetarian optional-animal handling, repeated recipe occurrences, saving, authenticated owner scoping, favorites cache/session boundaries, saved-plan and shopping-list stale-response isolation.
- 3 component suites: **55 passed**. Homepage shopping preview, favorites consistency, saved-plan detail rendering.
- Total: **197 passed**, no failures. These tests use synthetic authentication and mocked transport; they do not constitute two real browser-account sessions.

## Browser verification

Authenticated PR107 preview:

1. Vegetarian generation returned 焗雜菜千層茄子、照燒豆腐丼、韓式泡菜炒飯. Detail and shopping quantities matched the original one-person recipe scaled to two people. Eggs/dairy remain permitted by the current vegetarian contract.
2. Restricted generation to 墨西哥式, yielding 墨西哥彩椒雞肉薄餅. Added the same recipe on a second day. At two servings per meal: tortilla 8 pieces, lime juice 30 mL, oil 20 mL.
3. Removed the second occurrence. Quantities became tortilla 4 pieces, lime juice 15 mL, oil 10 mL. Count-based ingredients retain the existing round-up policy.
4. Changed servings from two to four. Quantities returned to 8 pieces / 30 mL / 20 mL.
5. Saved a separate plan named `QA PR107 份量與帳戶隔離 2026-10-20`. Reopened through My Plans: one meal at four servings, other days empty. Both category and recipe shopping views retained the same totals. Existing plans were not edited or deleted. The QA plan remains saved.

## Live database isolation

Read-only role/claim transactions, rolled back after each check:

- Owner under `authenticated`: QA plan count 1, item count 1.
- Synthetic other user under `authenticated`: same plan count 0, item count 0; foreign favorites and preferences count 0.
- `anon` with empty subject: same plan and item counts 0.
- RLS enabled on menu_plans, menu_plan_items, user_favorites and user_preferences. Inspected owner policies, including UPDATE ownership checks.

This verifies database isolation and automated client transitions. A browser logout/relogin and real account A→B switch were **not** performed; no second signed-in test account was available and the existing session was preserved.

## Findings still open

1. **No individual egg/milk/fish exclusion feature exists.** UI supports positive protein filters and dietary tags; 植物類 is a primary-protein label, not an allergen or vegan guarantee. This part of the originally proposed test cannot be marked passed as a supported feature.
2. **Composite ingredients need explicit vegetarian product requirements.** Live inspection of 70 public vegetarian/egg_lacto recipes found no required ingredient slug matching the targeted animal/stock/sauce terms. However, recipes using generic 泡菜 or 日式咖哩磚 do not consistently specify a verified vegetarian product. 韓式泡菜炒飯's actual detail and shopping list showed generic 泡菜 without this qualification. This is incomplete product evidence, not proof that every such recipe contains animal ingredients. Do not treat the slug scan as certification of vegetarian suitability.
3. **Unselected optional proteins remain combined in ordinary recipes.** 墨西哥彩椒雞肉薄餅's list included chicken, beef and shrimp together. This matches the intentionally retained legacy behavior outside vegetarian recipes; no selection UI currently exists. It is a remaining product limitation, not a newly fixed item.
4. **Saved-plan category display mismatch.** The same meat group is labeled 肉類 in generation but 其他 in the saved-plan drawer. API group key `meat` passes unchanged through useSavedPlanShoppingList; the drawer's CATEGORY_LABELS only includes `meat_seafood`. Quantities and recipe view are unaffected. Reproduced in the actual browser; not fixed in this test-only pass.

No production recipe data or application code was changed in this acceptance pass.
