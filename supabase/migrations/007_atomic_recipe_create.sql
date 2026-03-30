-- Migration: 007_atomic_recipe_create
-- Create transaction-safe SQL function for admin recipe creation

-- ============================================================
-- admin_create_recipe_atomic
-- Creates recipe + related data in single transaction
-- ============================================================
CREATE OR REPLACE FUNCTION admin_create_recipe_atomic(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT,
  p_cuisine TEXT,
  p_dish_type TEXT,
  p_difficulty TEXT,
  p_prep_time_minutes INT,
  p_cook_time_minutes INT,
  p_base_servings INT,
  p_image_url TEXT,
  p_calories_per_serving NUMERIC,
  p_is_public BOOLEAN,
  p_ingredients JSONB,
  p_steps JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipe_id UUID;
  v_result JSONB;
BEGIN
  -- Insert recipe (no tags column)
  INSERT INTO recipes (
    name, slug, description, cuisine, dish_type, difficulty,
    prep_time_minutes, cook_time_minutes, base_servings,
    image_url, calories_per_serving, is_public
  ) VALUES (
    p_name, p_slug, p_description, p_cuisine, p_dish_type, p_difficulty,
    p_prep_time_minutes, p_cook_time_minutes, p_base_servings,
    p_image_url, p_calories_per_serving, p_is_public
  )
  RETURNING id INTO v_recipe_id;

  -- Insert ingredients (using prep_note column)
  IF jsonb_typeof(COALESCE(p_ingredients, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(p_ingredients, '[]'::jsonb)) > 0 THEN
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id, is_optional, prep_note, group_key)
    SELECT 
      v_recipe_id,
      (j->>'ingredient_id')::UUID,
      (j->>'quantity')::NUMERIC,
      (j->>'unit_id')::UUID,
      COALESCE((j->>'is_optional')::BOOLEAN, FALSE),
      NULLIF(j->>'notes', ''),
      NULLIF(j->>'group_key', '')
    FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) AS j;
  END IF;

  -- Insert steps
  IF jsonb_typeof(COALESCE(p_steps, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(p_steps, '[]'::jsonb)) > 0 THEN
    INSERT INTO recipe_steps (recipe_id, step_no, text, time_seconds)
    SELECT 
      v_recipe_id,
      (j->>'step_no')::INT,
      j->>'text',
      NULLIF((j->>'time_seconds')::TEXT, '')::INT
    FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) AS j;
  END IF;

  -- Return created recipe
  SELECT jsonb_build_object(
    'recipe', (
      SELECT jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'slug', r.slug,
        'description', r.description,
        'cuisine', r.cuisine,
        'dish_type', r.dish_type,
        'difficulty', r.difficulty,
        'prep_time_minutes', r.prep_time_minutes,
        'cook_time_minutes', r.cook_time_minutes,
        'base_servings', r.base_servings,
        'image_url', r.image_url,
        'calories_per_serving', r.calories_per_serving,
        'is_public', r.is_public
      )
      FROM recipes r WHERE r.id = v_recipe_id
    ),
    'ingredients', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ri.id,
        'recipe_id', ri.recipe_id,
        'ingredient_id', ri.ingredient_id,
        'quantity', ri.quantity,
        'unit_id', ri.unit_id,
        'is_optional', ri.is_optional,
        'notes', ri.prep_note,
        'group_key', ri.group_key
      )), '[]'::JSONB)
      FROM recipe_ingredients ri WHERE ri.recipe_id = v_recipe_id
    ),
    'steps', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'recipe_id', rs.recipe_id,
        'step_no', rs.step_no,
        'text', rs.text,
        'time_seconds', rs.time_seconds
      ) ORDER BY rs.step_no), '[]'::JSONB)
      FROM recipe_steps rs WHERE rs.recipe_id = v_recipe_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;