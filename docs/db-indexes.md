# Database Index Recommendations for Recipe API

## Recommended Indexes

Based on the current `/api/recipes` query patterns, the following indexes will significantly improve query performance:

### Primary Indexes (High Impact)

```sql
-- Index on is_public (most common filter)
CREATE INDEX idx_recipes_is_public ON recipes(is_public);

-- Index on cuisine (common filter)
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);

-- Index on difficulty (common filter)
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);

-- Index on primary_protein (exclusions filter)
CREATE INDEX idx_recipes_primary_protein ON recipes(primary_protein);

-- Index on cook_time_minutes (maxTime filter)
CREATE INDEX idx_recipes_cook_time ON recipes(cook_time_minutes);
```

### Secondary Indexes (Medium Impact)

```sql
-- Index on method
CREATE INDEX idx_recipes_method ON recipes(method);

-- Index on dish_type
CREATE INDEX idx_recipes_dish_type ON recipes(dish_type);

-- Index on budget_level
CREATE INDEX idx_recipes_budget ON recipes(budget_level);

-- Index on is_complete_meal
CREATE INDEX idx_recipes_complete_meal ON recipes(is_complete_meal);

-- Index on diet (array column)
CREATE INDEX idx_recipes_diet ON recipes(diet);

-- Composite index for common filter combinations
CREATE INDEX idx_recipes_pub_cuisine_difficulty ON recipes(is_public, cuisine, difficulty);

-- Index for sorting by created_at (default sort)
CREATE INDEX idx_recipes_created_at ON recipes(created_at DESC);

-- Index for sorting by total_time_minutes
CREATE INDEX idx_recipes_total_time ON recipes(total_time_minutes);

-- Index for sorting by protein_g
CREATE INDEX idx_recipes_protein ON recipes(protein_g DESC);
```

### Full-Text Search Index (If Search is Heavy)

```sql
-- For name/description search
CREATE INDEX idx_recipes_search ON recipes USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

## Query Order Optimization

The API should apply filters in this order for efficiency:
1. `is_public` (most selective after auth)
2. `cuisine`, `difficulty`, `method` (exact matches, use indexes)
3. `cook_time_minutes` (range, uses index)
4. `primary_protein` (exclusions)
5. Sorting (last, after filtering)

## Current Query Pattern

```javascript
// Most common path: filter -> sort -> paginate
query = query.eq('is_public', true)
query = query.eq('cuisine', ...)
query = query.eq('difficulty', ...)
query = query.lt('cook_time_minutes', ...)
query = query.order('created_at', { ascending: false })
query = query.range(offset, offset + limit - 1)
```

## Scalability Expectations

| Dataset Size | With Indexes | Without Indexes |
|--------------|--------------|-----------------|
| 1,000 rows  | <10ms        | <50ms           |
| 10,000 rows  | <50ms        | <500ms          |
| 100,000 rows | <100ms       | <5s             |

## Implementation

Run the SQL in Supabase Dashboard > SQL Editor, or create a migration:
```bash
supabase db push
```
