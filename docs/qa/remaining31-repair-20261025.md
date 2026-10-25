# Remaining 31 legacy recipe repairs — 2026-10-25

All 31 previously pending records now have an explicitly compiled ingredient list and a matching preparation method. This is editorial reformulation, not recovery of the original recipes or a claim of kitchen testing. Approved images and recipe IDs/slugs are preserved.

- Existing ingredient records adjusted: 41
- Missing ingredient records added: 26
- Preparation steps changed: 94

Nutrition is recalculated from every required input, excluding optional items. FDC reference profiles, input-to-mass conversions, per-component contributions, unrounded totals and rounding are in the JSON ledger. Water for cooking pasta is discarded except 45ml reserved cooking water; it contributes zero to the four reported macros. All oil is assumed consumed. No new nutrition claim is added; existing claims that fail application thresholds are removed.

Important limitations: oil uptake, branded sauces, cooked-noodle hydration, tofu firmness and meat cuts vary. Choy sum/romaine/baby napa/wet kelp/noodles use disclosed proxy profiles. Wings are purchased bone-in and use an explicit editorial 70% edible-yield assumption. Pasteurised whole egg uses generic whole-egg macros. These remain estimates, not validated original nutrition.

Specific corrections:

- Green beans now include 88g raw minced pork. This uses the 220g pork : 300g beans reference ratio scaled to 120g beans, with a separately compiled sauce/oil formula, not an exact copy.
- Mushroom chicken rice now includes 75g raw rice, 120g skinless boneless thigh, and 40g fresh shiitake. This is an explicitly compiled one-person rice-cooker version; published reference methods differ.
- Suspect 5–10 clove garlic records are replaced with newly chosen weighed amounts (6–10g). No claim is made that historical clove quantities were originally grams.
- Wet kelp replaces dry nori; baby napa replaces generic napa; chicken middle wings replace generic chicken.
- Dace uses 50g drained fish, excluding canned oil and beans. Consumer Council issue 525 sample 1 is a historic fish-only approximation, not a current whole-can nutrition label.
- Carbonara requires a distinct pasteurised whole-egg shopping item because the off-heat method does not ensure fully cooked egg.
- Cooked noodles/rice and raw rice are identified explicitly. Fresh shiitake replaces ambiguous soaking instructions.
- Names now match the compiled ingredients: 青椒炒雞丁（簡易版）, 蒜香焗三文魚配薯仔, 蝦仁蛋炒飯, 蒜香炆茄子.
- Flavor/protein metadata corrected where the compiled formula no longer supports spicy or generic vegetarian protein classifications.

Reference links are stored as comparisons and methods only. Original-source flags remain false. Previous public defect notes are preserved in the historical repair ledger while current public notes explain the new formula and estimate limitations.

| Recipe | kcal | Protein g | Carbs g | Fat g |
|---|---:|---:|---:|---:|
| 蒜蓉蒸蝦 | 137 | 29.2 | 3.6 | 0.8 |
| 青椒牛肉 | 253 | 28.1 | 7.8 | 11.9 |
| 蒜蓉油麥菜 | 79 | 2.6 | 7.9 | 5.1 |
| 清炒小白菜 | 72 | 3.1 | 5.9 | 4.9 |
| 雞胸豆腐蛋餅 | 308 | 33.3 | 8.7 | 15.5 |
| 豆角炒肉碎 | 317 | 18.5 | 15.0 | 21.4 |
| 金針菇豆腐煲 | 190 | 14.9 | 15.1 | 9.9 |
| 乾煸四季豆 | 124 | 3.7 | 14.5 | 7.2 |
| 青椒炒雞丁（簡易版） | 225 | 28.3 | 9.4 | 7.8 |
| 蟹柳滑蛋豆腐 | 225 | 22.1 | 13.0 | 10.1 |
| 蒜香焗三文魚配薯仔 | 531 | 31.9 | 27.4 | 32.4 |
| 蒸水蛋 | 72 | 6.3 | 0.4 | 4.8 |
| 蒜蓉菠菜 | 90 | 5.5 | 8.5 | 5.2 |
| 蒜蓉西蘭花 | 110 | 5.5 | 13.9 | 5.2 |
| 蒜蓉生菜 | 74 | 2.0 | 7.3 | 4.8 |
| 清炒椰菜 | 94 | 2.7 | 12.4 | 4.7 |
| 卡邦尼意粉 | 739 | 32.9 | 75.9 | 32.3 |
| 豆豉鯪魚炒油麥菜 | 237 | 20.4 | 8.1 | 14.5 |
| 香菇麻油雞飯 | 494 | 29.5 | 63.6 | 12.4 |
| 滑蛋蝦仁豆腐煲 | 278 | 33.8 | 4.4 | 14.7 |
| 蝦仁蛋炒飯 | 434 | 21.1 | 57.8 | 12.1 |
| 酸辣檸檬乾煎雞 | 343 | 44.1 | 9.2 | 13.7 |
| 蒜香炆茄子 | 136 | 2.6 | 12.8 | 9.4 |
| 蒜蓉娃娃菜 | 108 | 2.4 | 7.8 | 8.4 |
| 涼拌海帶絲 | 94 | 3.0 | 16.0 | 3.0 |
| 乾炒牛河 | 495 | 33.8 | 54.1 | 15.5 |
| 豉油皇炒麵 | 385 | 11.8 | 55.3 | 14.0 |
| 蒜香雞翼 | 254 | 19.0 | 3.0 | 18.1 |
| 薯仔炒肉碎 | 507 | 26.5 | 42.4 | 26.5 |
| 清炒菜心 | 72 | 3.1 | 5.9 | 4.9 |
| 蠔油冬菇 | 85 | 2.8 | 9.1 | 5.1 |

Verification: atomic PGlite application to all 31 snapshots, exact recipe/ingredient/step comparison, concurrent-edit rollback, replay rejection, independent component arithmetic, optional exclusion and nutrition claim thresholds. Full unit/component suite, TypeScript and ESLint checks are run before production application.

Production verification: 31 repaired records, zero records still marked pending_evidence, 288 public recipes and 288 images retained. 2,208 unit tests and 175 component tests passed; TypeScript and ESLint passed. Fractional spoon preconditions allow a 1e-12 numeric serialization tolerance while all identities/units/notes remain exact.
