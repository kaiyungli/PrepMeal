# PR107 follow-up: explicit optional shopping choices

## Behavior

- Generated and saved-plan shopping lists expose optional ingredient checkboxes and an explicit **只用基本材料** action. The API returns these choices from the actual `recipe_ingredients.is_optional` rows, including choices currently deselected; the detail RPC's missing optional metadata is no longer a dependency of this UI.
- No selection key preserves legacy inclusion. An explicit empty array excludes all optional ingredients for that recipe. Required ingredients cannot be removed through this input. Existing vegetarian animal-add-on exclusions remain enforced.
- All three shopping hooks and the generated service cache include optional choices in their request/result scope. An open generated list refetches after a choice changes, and stale responses cannot replace the new result. Saved lists refetch through their existing drawer loading flow.
- Choices apply to every occurrence of that recipe and are stored by account in this browser's local storage. They survive navigation/reload on this device, but are **not** stored in a saved plan's database record or synchronized across devices. No schema change was made.
- The saved-plan drawer now uses the same canonical category labels as the generated list; incoming category aliases normalize and combine without overwriting another group.
- Vegetarian composite-product requirements appear in recipe detail and shopping lists for generic kimchi, curry roux, teriyaki, miso, pesto, Parmesan and sesame dressing. Users must choose a package explicitly suitable for vegetarian cooking. This supplies a product requirement, **not** verification of an unspecified brand. Egg/dairy remain allowed by the existing diet contract.

## Verification

- 137 targeted unit/hook/API tests passed, including new explicit/base-only selection, required-ingredient protection, invalid inputs, repeated occurrences and scaling, per-account persistence, service/memory cache invalidation, UI selection, category normalization and product requirements.
- 71 related component tests passed.
- TypeScript and lint of the new/changed TypeScript logic passed. Existing drawer effect and mapper `any` lint findings predate this change; no claim of a clean full-project lint run.
- Earlier acceptance evidence remains in `three-flow-acceptance-20261020.md`; its findings describe the earlier preview. This follow-up addresses the two shopping issues and adds vegetarian product requirements. Individual allergen exclusions, two-real-account browser switching, and Google Search Console verification are outside this patch.

Preview verification is recorded after the configured deployment finishes. Production has not been merged/deployed by this follow-up.
