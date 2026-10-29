# Recipe acceptance rules

- All recipe inputs, steps and nutrition use a one-person original. Plan item
  servings are the target number of diners and may exceed one.
- Convert ingredients, split additions in steps, yield counts and active
  nutrition input ledgers together. Never change only the serving label.
- Preserve per-person nutrition and per-100 reference profiles when scaling;
  do not divide per-person totals a second time.
- Treat discarded process water and pan requirements separately. Cooking
  temperature, thickness and doneness checks do not scale with diner count.
- Keep precise input quantities for calculation. Display rounded measurements
  as approximate; never round tiny seasoning amounts to zero. Shopping counts
  may round up for procurement, while recipe counts retain fractions.
- Display calories as `卡路里／人`, protein as `g 蛋白質／人`, and easy as `容易`.
- Ingredient identity, units, optional groups, raw/cooked/dry weight basis,
  steps, nutrition evidence, meal classification and allergen notes must agree.
- Prioritise familiar Hong Kong ingredients. Use the approved image style and
  dimensions; keep food naturally arranged and disclose generated images.
- Preserve original source quantities as explicitly historical attribution,
  separate from current cooking inputs. Disclose estimates and untested recipes.

The API rejects multi-person create/update/import inputs rather than converting
them silently. `recipes_one_person_basis` also protects direct database writes
once its migration is applied. Before applying it, verify that all recipe rows
already use one person. A single-person label is not proof of a complete
nutrition or culinary review.
