# Practical guide content — 2026-10-28

Scope: enrich the four existing public guides with a two-person workweek example, shopping calculations, cooking sequence and concrete dish combinations. No new recipes, DB writes, meal-plan import feature or production release.

## Recipe evidence

Read-only queries to the public catalogue, ingredients, units and steps confirmed the nine linked examples. Links and current timing/servings metadata are selected from the complete public catalogue at regeneration; absent/incomplete examples show a fallback instead of an invented recipe URL. Only public card fields are serialized.

- Five dinners: garlic-chicken-pasta (1 serving, 10+15=25m), tomato-tofu-rice (1, 10+12=22m), prepmeal-batch2-04 (2, 5+10=15m), garlic-butter-shrimp-pasta (1, 10+12=22m), vegetable-egg-fried-rice (1, 8+8=16m).
- Two-person onion example: 50×2 + 80×1 + 40×2 = 260g. Assumed measured home stock 80g leaves 180g. This is a stated hypothetical stock, not account inventory.
- Dry pasta: 100×2 + 90×2 = 380g. Assumed stock 200g leaves 180g.
- Cooked rice: 180×2 + 500×1 + 180×2 = 1220g cooked, explicitly not raw rice.
- Chicken breast 120×2 =240g; shrimp 120×2=240g, kept separate.
- Main/side combinations: prepmeal-batch4-15 (2 servings, 30m) plus poached-baby-napa (1, 15m); prepmeal-batch3-16 (4, 25m) plus poached-spinach-broth (1, 10m). Two-person vegetable quantities 360g baby napa /320g spinach confirmed. Individual times are not promised meal completion times.
- Source recipe steps for chicken pasta were read before writing the sequence; rice recipes require cooked rice. No timed cooking trial was performed.
- Fixed quantity examples are explicitly dated and point readers to current recipe details; they are not a replacement full-week shopping list.

## Food safety sources read

- https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_purchase.html — dry goods first, chilled/frozen foods last, raw food separation and cold transport.
- https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_leftovers.html — separate next-meal portions before dining, cool quickly and refrigerate within two hours.
- https://www.cfs.gov.hk/tc_chi/consumer_zone/packed_meals.html — cold transport ≤4°C, refrigerate at destination, thorough reheating to core ≥75°C, no more than one reheating.

Copy distinguishes editorial planning from automatic features. No asserted shelf life, guaranteed cost, balanced-nutrition certification or AdSense approval.

## Validation / delivery

10 guide selection tests passed; TypeScript, changed guide component/page/test lint and whitespace checks passed. React review: static copy, bounded public projections, semantic tables with scoped column headers, keyboard-focusable internal horizontal overflow, no new hooks/auth/DB writes. Existing source metadata inconsistency observed for an unrelated salmon recipe's total versus step durations; excluded from the examples, not corrected in this content package.

Pending: hosted preview build, actual initial HTML and recipe-link checks, desktop/mobile layout acceptance; merge and production deployment require separate approval.
