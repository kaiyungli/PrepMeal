# Nutrition Tagging Rules

This document defines the official rules for nutrition-based tagging in PrepMeal.

## High Protein Rule

A recipe can be tagged as `high_protein` only if ALL of the following are true per 1-person serving:

1. **Protein >= 25g** per serving
2. **Protein Ratio**: `(protein_g * 4) / calories_per_serving >= 0.20`
3. **Valid Dish Type**: `dish_type = 'main'` OR `is_complete_meal = true`

### Examples

| dish_type | is_complete_meal | protein_g | calories | Result |
|-----------|-----------------|----------|----------|--------|
| main | false | 30 | 400 | ✅ true |
| main | false | 25 | 420 | ✅ true |
| staple | true | 37 | 630 | ✅ true |
| main | false | 26 | 100 | ✅ true (ratio = 1.04) |
| soup | false | 26 | 220 | ❌ false (not main, not complete) |
| side | false | 30 | 300 | ❌ false (not main, not complete) |
| main | false | null | 400 | ❌ false (null protein) |
| main | false | 30 | null | ❌ false (null calories) |

---

## Low Fat Rule

A recipe can be tagged as `low_fat` only if ALL of the following are true per 1-person serving:

1. **Fat <= 10g** per serving
2. **Fat Ratio**: `(fat_g * 9) / calories_per_serving <= 0.30`
3. **Valid Dish Type**: `dish_type = 'main'` OR `is_complete_meal = true`

### Examples

| dish_type | is_complete_meal | fat_g | calories | Result |
|-----------|-----------------|------|----------|--------|
| main | false | 9 | 450 | ✅ true |
| main | false | 6 | 180 | ✅ true |
| staple | true | 10 | 370 | ✅ true |
| main | false | 10 | 600 | ✅ true (ratio = 0.15) |
| soup | false | 6 | 180 | ❌ false (not main, not complete) |
| side | false | 5 | 95 | ❌ false (not main, not complete) |
| main | false | 12 | 450 | ❌ false (fat > 10) |
| main | false | null | 400 | ❌ false (null fat) |
| main | false | 8 | null | ❌ false (null calories) |

---

## Low Calorie Rule

A recipe can be tagged as `low_calorie` only if ALL of the following are true per 1-person serving:

1. **Calories > 0 and IS NOT NULL**
2. **For main/staple/complete meal**: `calories_per_serving <= 400`
3. **For side/soup/snack**: `calories_per_serving <= 300`

### Important Notes

- `low_calorie` is **NOT** the same as `low_fat` or `high_protein`.
- Soups and side dishes have a lower threshold (300 kcal) than main dishes (400 kcal).
- A `null` or zero `calories_per_serving` always excludes a recipe from `low_calorie`.

### Examples

| dish_type | is_complete_meal | calories | Result |
|-----------|-----------------|----------|--------|
| main | false | 360 | ✅ true |
| staple | true | 400 | ✅ true |
| main | true | 380 | ✅ true (is_complete_meal overrides) |
| soup | false | 260 | ✅ true |
| side | false | 300 | ✅ true |
| snack | false | 280 | ✅ true |
| main | false | 450 | ❌ false (> 400) |
| staple | false | 420 | ❌ false (> 400) |
| soup | false | 320 | ❌ false (> 300) |
| side | false | 350 | ❌ false (> 300) |
| main | false | null | ❌ false (null calories) |
| main | false | 0 | ❌ false (zero calories) |

---

## Audit SQL Queries

### 1. Wrongly Tagged High Protein

```sql
SELECT r.id, r.name, r.protein_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'high_protein' = ANY(COALESCE(r.diet, ARRAY[]::text[]))
  AND (
    r.protein_g < 25
    OR r.calories_per_serving IS NULL
    OR r.calories_per_serving <= 0
    OR ((r.protein_g * 4.0) / r.calories_per_serving) < 0.20
    OR (r.dish_type <> 'main' AND COALESCE(r.is_complete_meal, false) = false)
  );
```

### 2. Missing High Protein Tag

```sql
SELECT r.id, r.name, r.protein_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'high_protein' <> ALL(COALESCE(r.diet, ARRAY[]::text[]))
  AND r.protein_g >= 25
  AND r.calories_per_serving > 0
  AND ((r.protein_g * 4.0) / r.calories_per_serving) >= 0.20
  AND (r.dish_type = 'main' OR r.is_complete_meal = true);
```

### 3. Wrongly Tagged Low Fat

```sql
SELECT r.id, r.name, r.fat_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'low_fat' = ANY(COALESCE(r.diet, ARRAY[]::text[]))
  AND (
    r.fat_g > 10
    OR r.calories_per_serving IS NULL
    OR r.calories_per_serving <= 0
    OR ((r.fat_g * 9.0) / r.calories_per_serving) > 0.30
    OR (r.dish_type <> 'main' AND COALESCE(r.is_complete_meal, false) = false)
  );
```

### 4. Missing Low Fat Tag

```sql
SELECT r.id, r.name, r.fat_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'low_fat' <> ALL(COALESCE(r.diet, ARRAY[]::text[]))
  AND r.fat_g <= 10
  AND r.fat_g > 0
  AND r.calories_per_serving > 0
  AND ((r.fat_g * 9.0) / r.calories_per_serving) <= 0.30
  AND (r.dish_type = 'main' OR r.is_complete_meal = true);
```

### 5. Wrongly Tagged Low Calorie

```sql
SELECT r.id, r.name, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'low_calorie' = ANY(COALESCE(r.diet, ARRAY[]::text[]))
  AND (
    r.calories_per_serving IS NULL
    OR r.calories_per_serving <= 0
    OR (
      (r.dish_type IN ('main', 'staple') OR r.is_complete_meal = true)
      AND r.calories_per_serving > 400
    )
    OR (
      r.dish_type IN ('side', 'soup', 'snack')
      AND r.calories_per_serving > 300
    )
  );
```

### 6. Missing Low Calorie Tag

```sql
SELECT r.id, r.name, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 'low_calorie' <> ALL(COALESCE(r.diet, ARRAY[]::text[]))
  AND r.calories_per_serving > 0
  AND (
    (
      (r.dish_type IN ('main', 'staple') OR r.is_complete_meal = true)
      AND r.calories_per_serving <= 400
    )
    OR
    (
      r.dish_type IN ('side', 'soup', 'snack')
      AND r.calories_per_serving <= 300
    )
  );
```

---

## Related Tags

- `high_protein` — High protein rule
- `low_fat` — Low fat rule
- `low_calorie` — Low calorie rule
- `vegetarian` — Dietary preference

---

Last Updated: 2026-04-23
---

## Vegetarian Rule (Ingredient-Based)

A recipe is considered **vegetarian** only if it contains **NO** meat, poultry, fish, or seafood.

### Conditions

1. Recipe must have at least one ingredient (empty = false)
2. Recipe must contain **NO** forbidden animal proteins

### Forbidden Animal Proteins

| Category | Ingredients |
|----------|-------------|
| Poultry | chicken, duck, turkey |
| Beef | beef, 牛 |
| Pork | pork, bacon, ham |
| Fish | fish, salmon, tuna, cod |
| Seafood | shrimp, prawn, lobster, crab, oyster, clam |

### Examples

| Recipe Ingredients | Result |
|-------------------|--------|
| tomato, onion, carrot | ✅ true |
| egg, tomato | ✅ true |
| milk, oats, cheese | ✅ true |
| tofu, vegetables | ✅ true |
| shrimp, egg | ❌ false |
| fish, butter | ❌ false |
| chicken, milk | ❌ false |
| (empty) | ❌ false |

---

## Egg Lacto Rule (Ingredient-Based)

A recipe is considered **egg_lacto** only if:
1. It is vegetarian by ingredient composition (no forbidden animal proteins)
2. It contains **at least one** egg OR dairy ingredient

### Important Notes

- **egg_lacto is a subset of vegetarian**
- All egg_lacto recipes are vegetarian, but not all vegetarian recipes are egg_lacto
- Vegan recipes (no egg, no dairy) must NOT be tagged as egg_lacto
- Recipes with shrimp/fish/chicken/beef/pork must NEVER be tagged as egg_lacto, even if they also contain egg or dairy

### Positive Egg/Dairy Signals

| Category | Ingredients |
|----------|-------------|
| Egg | egg, 蛋, 雞蛋 |
| Dairy | milk, cheese, butter, cream, yogurt, 牛奶, 芝士, 牛油, 忌廉 |

### Examples

| Recipe Ingredients | Result |
|-------------------|--------|
| egg, tomato | ✅ true |
| milk, oats | ✅ true |
| cheese, pasta | ✅ true |
| egg + milk + tomato | ✅ true |
| tofu, vegetables (vegan) | ❌ false (no egg/dairy) |
| shrimp + egg | ❌ false (not vegetarian) |
| fish + butter | ❌ false (not vegetarian) |
| chicken + milk | ❌ false (not vegetarian) |

---

## Implementation

- **Source of truth**: `src/constants/ingredientDietRules.ts`
- **Helpers**: `isRecipeVegetarianByIngredients()`, `isRecipeEggLactoByIngredients()`
- **Input shape**: `Array<{ name?: string; slug?: string }>`

---

Last Updated: 2026-04-23
