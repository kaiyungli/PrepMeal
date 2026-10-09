-- Draft: apply only after separate database approval. No existing RPC changed.
-- The canonical create and metadata write share one transaction. Any failure
-- (including a later metadata constraint) rolls back recipe AND child rows.
CREATE OR REPLACE FUNCTION public.admin_import_recipe_atomic_v2(p_recipe jsonb, p_metadata jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE
  v_result jsonb;
  v_recipe public.recipes;
  v_field text;
  v_value jsonb;
BEGIN
  IF jsonb_typeof(p_recipe) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_metadata) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid import object' USING ERRCODE = '22023';
  END IF;
  FOREACH v_field IN ARRAY ARRAY['protein','diet','flavor','protein_g','carbs_g','fat_g','total_time_minutes'] LOOP
    IF NOT p_metadata ? v_field THEN
      RAISE EXCEPTION 'Missing metadata field %', v_field USING ERRCODE = '22023';
    END IF;
    v_value := p_metadata->v_field;
    IF v_field IN ('protein','diet','flavor') THEN
      IF jsonb_typeof(v_value) <> 'array' THEN
        RAISE EXCEPTION 'Invalid tag array %', v_field USING ERRCODE = '22023';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_value) AS e(value)
                 WHERE jsonb_typeof(value) <> 'string' OR btrim(value #>> '{}') = '') THEN
        RAISE EXCEPTION 'Invalid tag in %', v_field USING ERRCODE = '22023';
      END IF;
    ELSIF v_value <> 'null'::jsonb THEN
      IF jsonb_typeof(v_value) <> 'number' THEN
        RAISE EXCEPTION 'Invalid numeric metadata %', v_field USING ERRCODE = '22023';
      END IF;
      IF (v_value #>> '{}')::numeric < 0 THEN
        RAISE EXCEPTION 'Negative metadata %', v_field USING ERRCODE = '22023';
      END IF;
      IF v_field = 'total_time_minutes' AND
         ((v_value #>> '{}')::numeric <> trunc((v_value #>> '{}')::numeric)
          OR (v_value #>> '{}')::numeric > 2147483647) THEN
        RAISE EXCEPTION 'Invalid total time' USING ERRCODE = '22023';
      END IF;
    END IF;
  END LOOP;
  v_result := public.admin_create_recipe_atomic(
    p_name => (p_recipe->>'p_name')::text,
    p_slug => (p_recipe->>'p_slug')::text,
    p_description => (p_recipe->>'p_description')::text,
    p_cuisine => (p_recipe->>'p_cuisine')::text,
    p_dish_type => (p_recipe->>'p_dish_type')::text,
    p_difficulty => (p_recipe->>'p_difficulty')::text,
    p_prep_time_minutes => (p_recipe->>'p_prep_time_minutes')::integer,
    p_cook_time_minutes => (p_recipe->>'p_cook_time_minutes')::integer,
    p_base_servings => (p_recipe->>'p_base_servings')::integer,
    p_image_url => (p_recipe->>'p_image_url')::text,
    p_calories_per_serving => (p_recipe->>'p_calories_per_serving')::numeric,
    p_is_public => (p_recipe->>'p_is_public')::boolean,
    p_method => (p_recipe->>'p_method')::text,
    p_speed => (p_recipe->>'p_speed')::text,
    p_servings_unit => (p_recipe->>'p_servings_unit')::text,
    p_meal_role => (p_recipe->>'p_meal_role')::text,
    p_is_complete_meal => (p_recipe->>'p_is_complete_meal')::boolean,
    p_primary_protein => (p_recipe->>'p_primary_protein')::text,
    p_budget_level => (p_recipe->>'p_budget_level')::text,
    p_reuse_group => (p_recipe->>'p_reuse_group')::text,
    p_ingredients => p_recipe->'p_ingredients',
    p_steps => p_recipe->'p_steps'
  );
  UPDATE public.recipes SET
    protein = ARRAY(SELECT jsonb_array_elements_text(p_metadata->'protein')),
    diet = ARRAY(SELECT jsonb_array_elements_text(p_metadata->'diet')),
    flavor = ARRAY(SELECT jsonb_array_elements_text(p_metadata->'flavor')),
    protein_g = (p_metadata->>'protein_g')::numeric,
    carbs_g = (p_metadata->>'carbs_g')::numeric,
    fat_g = (p_metadata->>'fat_g')::numeric,
    total_time_minutes = (p_metadata->>'total_time_minutes')::numeric::integer
  WHERE id = (v_result->'recipe'->>'id')::uuid
  RETURNING * INTO STRICT v_recipe;
  RETURN jsonb_set(v_result, '{recipe}', to_jsonb(v_recipe));
END
$fn$;

REVOKE ALL ON FUNCTION public.admin_import_recipe_atomic_v2(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_recipe_atomic_v2(jsonb, jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
