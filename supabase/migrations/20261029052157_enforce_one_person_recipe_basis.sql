-- Recipe inputs always represent one person. Plan item servings remain free
-- to represent the intended number of diners; shopping lists multiply inputs.
-- Validate existing rows instead of silently relabelling/scaling their inputs.
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_one_person_basis CHECK (base_servings = 1);

COMMENT ON CONSTRAINT recipes_one_person_basis ON public.recipes IS
  'Recipe ingredients and steps must use a one-person base; scale multi-person inputs before insertion.';

ALTER TABLE public.recipes ADD CONSTRAINT recipes_one_person_metadata_basis CHECK (
  COALESCE(source_data->>'base_servings', '1') = '1'
  AND COALESCE(source_data->'nutrition'->>'servings', '1') = '1'
);
