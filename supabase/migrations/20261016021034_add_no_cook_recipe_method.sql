-- Add no_cook while guarding against replacement of an unexpected CHECK.
-- Do not apply until independent schema review and controlled migration approval.
-- The expected expression was captured read-only from the live schema.
DO $$
DECLARE
  actual_def text;
  expected_def constant text :=
    'CHECK ((method = ANY (ARRAY[''stir_fry''::text, ''steamed''::text, ''fried''::text, ''braised''::text, ''boiled''::text, ''baked''::text])))';
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO actual_def
    FROM pg_constraint AS c
   WHERE c.conrelid = 'public.recipes'::regclass
     AND c.conname = 'recipes_method_check'
     AND c.contype = 'c';

  -- Fail closed for missing, changed, or already-migrated constraints.
  -- Ignore formatting whitespace only; never ignore expressions or operands.
  IF actual_def IS DISTINCT FROM expected_def THEN
    RAISE EXCEPTION 'recipes_method_check has unexpected definition; aborting migration';
  END IF;
END
$$;

ALTER TABLE public.recipes DROP CONSTRAINT recipes_method_check;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_method_check
  CHECK (method IN ('stir_fry', 'steamed', 'fried', 'braised', 'boiled', 'baked', 'no_cook'));
