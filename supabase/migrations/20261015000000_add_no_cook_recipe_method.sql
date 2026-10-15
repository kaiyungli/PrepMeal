-- Add an accurate cooking method for cold-prepared recipes (e.g. Thai tam taeng).
-- Scope: only the public.recipes method CHECK constraint. No recipe data inserted.
-- Reviewed against live constraint name / allowed values on 2026-10-15.
-- Deploy through controlled Supabase migration workflow only after PR approval.

DO $$
DECLARE
  actual_def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO actual_def
    FROM pg_constraint AS c
   WHERE c.conrelid = 'public.recipes'::regclass
     AND c.conname = 'recipes_method_check'
     AND c.contype = 'c';

  IF actual_def IS NULL THEN
    RAISE EXCEPTION 'Expected recipes_method_check missing: aborting no_cook migration';
  END IF;

  -- Refuse to replace an unrelated / unexpected constraint.
  IF actual_def NOT LIKE '%stir_fry%'
     OR actual_def NOT LIKE '%steamed%'
     OR actual_def NOT LIKE '%fried%'
     OR actual_def NOT LIKE '%braised%'
     OR actual_def NOT LIKE '%boiled%'
     OR actual_def NOT LIKE '%baked%' THEN
    RAISE EXCEPTION 'Unexpected recipes_method_check definition: aborting no_cook migration';
  END IF;
END
$$;

ALTER TABLE public.recipes DROP CONSTRAINT recipes_method_check;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_method_check CHECK (
  method IN ('stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked', 'no_cook')
);
