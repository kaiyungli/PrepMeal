-- Recipe detail in one database round trip.
--
-- get_recipe_detail_json did not return base_servings, source_data, slug,
-- meal_role, or each ingredient's is_optional / prep_note, so
-- src/features/recipes/services/getRecipeDetail.ts made two more sequential
-- queries for every recipe detail (≈3 round trips, ~1.2 s on the server).
-- This version returns those fields, so the service uses the RPC result
-- directly. Same signature, same SECURITY DEFINER + search_path, same
-- public-only rule. Ingredients keep the order the site shows today
-- (physical row order, as the old follow-up query returned them).
-- Read-only; no data change.

CREATE OR REPLACE FUNCTION public.get_recipe_detail_json(p_id_or_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_recipe_id uuid;
BEGIN
  -- Detect if input is UUID by pattern
  IF p_id_or_slug ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    SELECT r.id
    INTO v_recipe_id
    FROM public.recipes r
    WHERE r.id = p_id_or_slug::uuid
      AND r.is_public = true
    LIMIT 1;
  ELSE
    SELECT r.id
    INTO v_recipe_id
    FROM public.recipes r
    WHERE r.slug = p_id_or_slug
      AND r.is_public = true
    LIMIT 1;
  END IF;

  IF v_recipe_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'name', r.name,
    'image_url', r.image_url,
    'description', r.description,
    'base_servings', r.base_servings,
    'source_data', r.source_data,
    'meal_role', r.meal_role,
    'difficulty', r.difficulty,
    'method', r.method,
    'speed', r.speed,
    'calories_per_serving', r.calories_per_serving,
    'protein_g', r.protein_g,
    'carbs_g', r.carbs_g,
    'fat_g', r.fat_g,
    'total_time_minutes', r.total_time_minutes,
    'cook_time_minutes', r.cook_time_minutes,
    'prep_time_minutes', r.prep_time_minutes,
    'cuisine', r.cuisine,
    'primary_protein', r.primary_protein,
    'dish_type', r.dish_type,
    'diet', r.diet,
    'is_complete_meal', r.is_complete_meal,
    'created_at', r.created_at,

    'ingredients', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'slug', i.slug,
            'shopping_category', i.shopping_category,
            'quantity', ri.quantity,
            'is_optional', COALESCE(ri.is_optional, false),
            'prep_note', ri.prep_note,
            'unit', CASE
              WHEN u.id IS NULL THEN NULL
              ELSE jsonb_build_object(
                'code', u.code,
                'name', u.name
              )
            END
          )
          -- Physical row order: the order the site shows today (the old
          -- follow-up query had no ORDER BY and read rows in this order).
          ORDER BY ri.ctid
        )
        FROM public.recipe_ingredients ri
        JOIN public.ingredients i
          ON i.id = ri.ingredient_id
        LEFT JOIN public.units u
          ON u.id = ri.unit_id
        WHERE ri.recipe_id = v_recipe_id
      ),
      '[]'::jsonb
    ),

    'steps', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_no', rs.step_no,
            'text', rs.text,
            'time_seconds', rs.time_seconds
          )
          ORDER BY rs.step_no ASC
        )
        FROM public.recipe_steps rs
        WHERE rs.recipe_id = v_recipe_id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM public.recipes r
  WHERE r.id = v_recipe_id;

  RETURN v_result;
END;
$function$;
