# Recipe Metadata Audit Report

## Date: 2026-04-04

## Scope
- generate view API: /api/recipes?view=generate
- Planner logic: src/lib/mealPlanner.ts
- UI display: src/components/generate/WeeklyPlanGrid.tsx

## Key Fields

### 1. meal_role
**Allowed values:**
- `complete_meal` - Full meal with rice/noodles included
- `protein_main` - Main protein dish
- `veg_side` - Vegetable side dish
- `soup` - Soup dish

**Current usage in planner:**
- Priority 1 in matchesSlotRole() - explicit match
- Used for complete meal detection
- Used for veg_side slot enforcement

### 2. is_complete_meal
**Type:** boolean
**Purpose:** Quick flag to identify complete meals without checking meal_role

### 3. dish_type
**Legacy values:**
- `main` - Main course
- `side` - Side dish
- `soup` - Soup
- `staple` - Rice/noodles

**Current fallback usage:**
- protein_main: falls back to dish_type === 'main'
- veg_side: falls back to dish_type === 'side' AND NO primary_protein

### 4. primary_protein
**Purpose:** Identify main protein for rotation and diversity scoring

## Normalization Rules

| Scenario | meal_role | is_complete_meal | dish_type | primary_protein |
|----------|-----------|------------------|-----------|-----------------|
| 海南雞飯 (complete) | complete_meal | true | main | 雞 |
| 煎雞扒 (just meat) | protein_main | false | main | 雞 |
| 炒青菜 (just veg) | veg_side | false | side | null |
| 冬瓜湯 (soup) | soup | false | soup | null |

## Known Issues

### Issue 1: Incomplete recipes
Some recipes have neither meal_role nor is_complete_meal set.
These fall back to dish_type matching, which may be incorrect.

**Affected recipes:** Unknown (needs DB audit)

### Issue 2: Ambiguous dish_type
Recipes with dish_type='main' but no meal_role are treated as protein_main.
This may include complete meals that should have is_complete_meal=true.

### Issue 3: No soup classification
Current code doesn't properly handle soup for two_meat_one_veg mode.

## Proposed Fixes

### Fix 1: Add meal_role to all recipes
SQL to normalize:
```sql
-- Set complete_meal where name contains certain keywords
UPDATE recipes 
SET meal_role = 'complete_meal', 
    is_complete_meal = true 
WHERE name LIKE '%飯' OR name LIKE '%湯麵' OR name LIKE '%撈飯';

-- Set veg_side where dish_type = 'side' and no primary_protein
UPDATE recipes 
SET meal_role = 'veg_side' 
WHERE dish_type = 'side' AND (primary_protein IS NULL OR primary_protein = '');

-- Set protein_main for remaining main dishes
UPDATE recipes 
SET meal_role = 'protein_main' 
WHERE dish_type = 'main' AND (meal_role IS NULL OR meal_role = '');
```

### Fix 2: Add default to generate view
For recipes missing these fields, API should derive values:
```javascript
if (!recipe.meal_role) {
  if (recipe.is_complete_meal) recipe.meal_role = 'complete_meal';
  else if (recipe.dish_type === 'side') recipe.meal_role = 'veg_side';
  else recipe.meal_role = 'protein_main';
}
```

## Next Steps
1. Run SQL audit on recipes table to count missing values
2. Apply normalization update
3. Verify planner behavior improves
