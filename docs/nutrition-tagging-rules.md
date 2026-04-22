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

## Related Tags

- `low_fat` - Separate rule, not related to high_protein
- `vegetarian` - Dietary preference
- `low_calorie` - Separate rule

---

Last Updated: 2026-04-22
