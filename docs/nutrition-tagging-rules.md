# Nutrition Tagging Rules

This document defines the official rules for nutrition-based tags in PrepMeal.

## High Protein Rule

A recipe can be tagged as `high_protein` only if ALL of the following are true per 1-person serving:

### Conditions

1. **Minimum Protein**: `protein_g >= 25`
2. **Protein Ratio**: `(protein_g * 4) / calories_per_serving >= 0.20`
3. **Valid Dish Type**: The recipe is either:
   - `dish_type = 'main'`
   - OR `is_complete_meal = true`

### Edge Cases

- If `protein_g` is `null` → false
- If `calories_per_serving` is `null` → false  
- If `calories_per_serving <= 0` → false
- If `dish_type` is `null` AND `is_complete_meal` is `false` → false

### Important Notes

- `high_protein` means high protein only.
- It does NOT mean low fat, low calorie, or fat-loss friendly.
- `low_fat` is a **separate tag** with a **separate rule**.
- Soups and side dishes must NOT be tagged as `high_protein`.
- Recipes below 25g protein must NOT be tagged as `high_protein`, even if protein ratio is high.

## Examples

### Valid Cases

| dish_type | is_complete_meal | protein_g | calories | Result |
|-----------|-----------------|-----------|----------|--------|
| main | false | 30 | 400 | ✅ true |
| main | false | 25 | 420 | ✅ true |
| staple | true | 37 | 630 | ✅ true |
| main | false | 26 | 100 | ✅ true (ratio = 1.04) |

### Invalid Cases

| dish_type | is_complete_meal | protein_g | calories | Result |
|-----------|-----------------|-----------|----------|--------|
| main | false | 24 | 180 | ❌ false (protein < 25) |
| soup | false | 26 | 220 | ❌ false (not main, not complete) |
| side | false | 30 | 300 | ❌ false (not main, not complete) |
| main | false | 32 | 650 | ❌ false (ratio = 0.197 < 0.20) |
| main | false | null | 400 | ❌ false (null protein) |
| main | false | 30 | null | ❌ false (null calories) |
| main | false | 30 | 0 | ❌ false (zero calories) |

## SQL Audit Queries

### 1. Wrongly Tagged High Protein

```sql
SELECT r.id, r.name, r.protein_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 
  r.diet::text LIKE '%high_protein%'
  AND (
    r.protein_g < 25
    OR r.calories_per_serving IS NULL
    OR r.calories_per_serving <= 0
    OR ((r.protein_g * 4.0) / r.calories_per_serving) < 0.20
    OR (r.dish_type NOT IN ('main') AND COALESCE(r.is_complete_meal, false) = false)
  );
```

### 2. Missing High Protein Tag

```sql
SELECT r.id, r.name, r.protein_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 
  r.diet::text NOT LIKE '%high_protein%'
  AND r.protein_g >= 25
  AND r.calories_per_serving > 0
  AND ((r.protein_g * 4.0) / r.calories_per_serving) >= 0.20
  AND (r.dish_type = 'main' OR r.is_complete_meal = true);
```

---

## Low Fat Rule

A recipe can be tagged as `low_fat` only if ALL of the following are true per 1-person serving:

### Conditions

1. **Maximum Fat**: `fat_g <= 10`
2. **Fat Ratio**: `(fat_g * 9) / calories_per_serving <= 0.30`
3. **Valid Dish Type**: The recipe is either:
   - `dish_type = 'main'`
   - OR `is_complete_meal = true`

### Edge Cases

- If `fat_g` is `null` → false
- If `calories_per_serving` is `null` → false  
- If `calories_per_serving <= 0` → false
- If `dish_type` is `null` AND `is_complete_meal` is `false` → false

### Important Notes

- `low_fat` means low fat only.
- It does NOT mean high protein, low calorie, or fat-loss friendly.
- `high_protein` is a **separate tag** with a **separate rule**.
- Soups and side dishes must NOT be tagged as `low_fat`.
- Recipes with more than 10g fat must NOT be tagged as `low_fat`, even if fat ratio is low.

## Examples

### Valid Cases

| dish_type | is_complete_meal | fat_g | calories | Result |
|-----------|-----------------|------|----------|--------|
| main | false | 9 | 450 | ✅ true |
| main | false | 6 | 180 | ✅ true |
| staple | true | 10 | 370 | ✅ true |
| main | false | 10 | 600 | ✅ true (ratio = 0.15) |

### Invalid Cases

| dish_type | is_complete_meal | fat_g | calories | Result |
|-----------|-----------------|------|----------|--------|
| main | false | 10 | 220 | ❌ false (ratio = 0.409 > 0.30) |
| soup | false | 6 | 180 | ❌ false (not main, not complete) |
| side | false | 5 | 95 | ❌ false (not main, not complete) |
| main | false | 12 | 450 | ❌ false (fat > 10) |
| main | false | null | 400 | ❌ false (null fat) |
| main | false | 8 | null | ❌ false (null calories) |
| main | false | 8 | 0 | ❌ false (zero calories) |

## SQL Audit Queries

### 3. Wrongly Tagged Low Fat

```sql
SELECT r.id, r.name, r.fat_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 
  r.diet::text LIKE '%low_fat%'
  AND (
    r.fat_g > 10
    OR r.calories_per_serving IS NULL
    OR r.calories_per_serving <= 0
    OR ((r.fat_g * 9.0) / r.calories_per_serving) > 0.30
    OR (r.dish_type NOT IN ('main') AND COALESCE(r.is_complete_meal, false) = false)
  );
```

### 4. Missing Low Fat Tag

```sql
SELECT r.id, r.name, r.fat_g, r.calories_per_serving, r.dish_type, r.is_complete_meal
FROM recipes r
WHERE 
  r.diet::text NOT LIKE '%low_fat%'
  AND r.fat_g <= 10
  AND r.fat_g > 0
  AND r.calories_per_serving > 0
  AND ((r.fat_g * 9.0) / r.calories_per_serving) <= 0.30
  AND (r.dish_type = 'main' OR r.is_complete_meal = true);
```

---

## Related Tags

- `high_protein` - Separate rule
- `low_fat` - Separate rule
- `vegetarian` - Dietary preference
- `low_calorie` - Separate rule

---

Last Updated: 2026-04-23