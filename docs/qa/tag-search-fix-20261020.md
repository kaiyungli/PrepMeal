# Recipe tags and search audit fixes

Base production commit: `df47fb63ca3548edd2b25717282c316eaf9de753`.

## Behavior changes

- Shopping lists use the vegetarian base recipe: optional animal ingredients on recipes tagged vegetarian/egg_lacto are omitted. Required ingredients, dairy/plant add-ons and ordinary recipes retain their existing behavior. The generated-list session cache version changes to prevent stale results.
- Recipe name/description search treats punctuation literally. Escaped, quoted PostgREST `imatch` values prevent filter syntax injection and `%`, `_`, `*` wildcard expansion.
- Display/filter/admin cuisine lists include Vietnamese, Filipino, Mexican and Spanish values already permitted by production constraints. The primary-protein category formerly labelled 素食 is labelled 植物類; the separate dietary 素食 filter is unchanged.
- Unclassified staples/snacks cannot fall into a protein-main slot through legacy protein inference.
- Recipe JSON-LD supports normalized string steps and unit objects, publishes base servings, and escapes HTML delimiters. Detail pages use their public slug canonical. The duplicate document-wide description is removed.

## Follow-up regressions

Additional regressions found during follow-up review:

- Explicit zero ingredient amounts are preserved through both fallback loading and detail normalization instead of becoming one.
- Shopping service cache keys use structured arrays; pantry names containing commas cannot collide with separate pantry entries.
- An equivalent plan array recreated by a parent render retains the homepage shopping preview. Explicit plan refresh still resets it, including when the generated recipe IDs happen to remain identical.
- Homepage previews use the API's localized unitDisplay, falling back to the unit code only when needed.

Five regression tests reproduced these four defects before the fixes. Targeted checks also cover account transitions, stale shopping responses, repeated recipe quantities and weekly-plan stability.

Further measurement regressions: quarter cups no longer round up to full cups; small spoon measures retain their actual value instead of rounding to the next half spoon. Familiar fractions are shown only within floating-point tolerance. Detail unit labels now support string codes and code-only objects, using the shared Chinese unit formatter while retaining explicit localized labels. Regression coverage exercises both detail rendering and shopping-list presentation.

## Data repair

`scripts/repair-catalog-tags-20261020.sql` records 24 nutrition-tag corrections using the existing nutritionRules.ts thresholds, plus two cold-dish method corrections. It preserves nutritional values, sources, amounts and instructions. It checks the previous tags, methods, nutrition and public visibility before updating. The checked-in script retains its final ROLLBACK for safe review; the guarded equivalent repair was applied separately on 2026-10-20.

Production update on 2026-10-20: all 26 guarded tag/method corrections were applied and independently read back; the public recipe count remains 288. Nutrition values, ingredients and steps were unchanged. The checked-in SQL remains dry-run-by-default for review/recovery.

Live schema validation also caught an incorrect optional-ingredient column in the draft API query. It now reads the real `is_optional` column; regression mocks reject the nonexistent `optional` column and require `is_optional` in the selection.

## Verification and limits

Regression coverage includes literal punctuation/quoted searches through the real Supabase query builder, vegetarian shopping-list aggregation and ordinary-recipe preservation, normalized/legacy JSON-LD, canonical slug hydration and planner role inference. Existing unit/component suites and TypeScript are checked with this patch.

Local production compilation succeeded; configured Vercel preview builds also passed. Login-required preview operation checks remain incomplete after secure authentication timed out. The final login state is unknown. Search Console is not connected, so Google indexing coverage remains unverified. Production code has not been merged/deployed. Images remain deferred.

The legacy 雞粉焗雞翼 record now has an explicitly labelled estimate: 217 kcal, protein 16g, fat 16.2g and carbohydrate 0.6g per original one-person recipe. This assumes 90g raw edible skin-on wing meat for three mid-joint pieces, a product proxy for the chicken powder and 4.5g oil. These are not measured weights or a confirmed 273g retail label. Full assumptions and primary sources are retained in `chicken-wings-nutrition-estimate-20261020.json` and recipe source_data. A guarded update preserved the three ingredient rows and five steps. Independent production readback confirmed the values and four visible limitations; all 288 public recipes now have non-null values in the four nutrition fields. This is a completeness check, not independent validation of every nutrition value.

The production audit baseline had 476 API checks (471 passed, five punctuation failures), all 288 recipe routes reachable, and all 288 recipe URLs present once in the sitemap. Every audited recipe page had empty JSON-LD instructions, object-valued units rendered as text, no yield and no canonical; the shared rendering fixes address those defects.
