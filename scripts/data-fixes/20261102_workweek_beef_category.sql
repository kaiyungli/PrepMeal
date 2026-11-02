-- Applied via Supabase on 2026-11-02. Idempotent, guarded data repair.
-- Before: category NULL, shopping_category seasoning.
-- The database accepts meat_seafood; the UI maps that to its meat section.
UPDATE public.ingredients
SET shopping_category = 'meat_seafood', category = COALESCE(category, 'meat_seafood')
WHERE id = '99ec431d-d195-49e4-9cdb-6118aff7d33b'
  AND slug = 'ribeye-beef-slices' AND shopping_category = 'seasoning';
-- Rollback, only if needed:
-- UPDATE public.ingredients SET shopping_category='seasoning', category=NULL
-- WHERE id='99ec431d-d195-49e4-9cdb-6118aff7d33b'
--   AND slug='ribeye-beef-slices' AND shopping_category='meat_seafood';
