-- Migration: 006_atomic_recipe_ops
-- Create transaction-safe SQL functions for admin recipe operations

-- ============================================================
-- admin_update_recipe_atomic
-- Updates recipe + replaces all related data in single transaction
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_recipe_atomic(
  p_recipe_id UUID,
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
  p_method TEXT,
  p_speed TEXT,
  p_servings_unit TEXT,
  p_meal_role TEXT,
  p_is_complete_meal BOOLEAN,
  p_primary_protein TEXT,
  p_budget_level TEXT,
  p_reuse_group TEXT,
  p_ingredients JSONB,
  p_steps JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update recipe row
  UPDATE recipes SET
    name = p_name,
    slug = p_slug,
    description = p_description,
    cuisine = p_cuisine,
    dish_type = p_dish_type,
    difficulty = p_difficulty,
    prep_time_minutes = p_prep_time_minutes,
    cook_time_minutes = p_cook_time_minutes,
    base_servings = p_base_servings,
    image_url = p_image_url,
    calories_per_serving = p_calories_per_serving,
    is_public = p_is_public,
    method = p_method,
    speed = p_speed,
    servings_unit = p_servings_unit,
    meal_role = p_meal_role,
    is_complete_meal = p_is_complete_meal,
    primary_protein = p_primary_protein,
    budget_level = p_budget_level,
    reuse_group = p_reuse_group
  WHERE id = p_recipe_id;

  -- Delete existing ingredients
  DELETE FROM recipe_ingredients WHERE recipe_id = p_recipe_id;

  -- Insert new ingredients
  IF jsonb_typeof(COALESCE(p_ingredients, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(p_ingredients, '[]'::jsonb)) > 0 THEN
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit_id, is_optional, prep_note, group_key)
    SELECT 
      p_recipe_id,
      (j->>'ingredient_id')::UUID,
      (j->>'quantity')::NUMERIC,
      (j->>'unit_id')::UUID,
      COALESCE((j->>'is_optional')::BOOLEAN, FALSE),
      NULLIF(j->>'notes', ''),
      NULLIF(j->>'group_key', '')
    FROM jsonb_array_elements(COALESCE(p_ingredients, '[]'::jsonb)) AS j;
  END IF;

  -- Delete existing steps
  DELETE FROM recipe_steps WHERE recipe_id = p_recipe_id;

  -- Insert new steps
  IF jsonb_typeof(COALESCE(p_steps, '[]'::jsonb)) = 'array'
      AND jsonb_array_length(COALESCE(p_steps, '[]'::jsonb)) > 0 THEN
    INSERT INTO recipe_steps (recipe_id, step_no, text, time_seconds)
    SELECT 
      p_recipe_id,
      (j->>'step_no')::INT,
      j->>'text',
      NULLIF((j->>'time_seconds')::TEXT, '')::INT
    FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) AS j;
  END IF;

  -- Return updated recipe
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
        'is_public', r.is_public,
        'method', r.method,
        'speed', r.speed,
        'servings_unit', r.servings_unit,
        'meal_role', r.meal_role,
        'is_complete_meal', r.is_complete_meal,
        'primary_protein', r.primary_protein,
        'budget_level', r.budget_level,
        'reuse_group', r.reuse_group
      )
      FROM recipes r WHERE r.id = p_recipe_id
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
      FROM recipe_ingredients ri WHERE ri.recipe_id = p_recipe_id
    ),
    'steps', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'recipe_id', rs.recipe_id,
        'step_no', rs.step_no,
        'text', rs.text,
        'time_seconds', rs.time_seconds
      ) ORDER BY rs.step_no), '[]'::JSONB)
      FROM recipe_steps rs WHERE rs.recipe_id = p_recipe_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ============================================================
-- admin_delete_recipe_atomic
-- Deletes recipe + all related data in single transaction
-- ============================================================
CREATE OR REPLACE FUNCTION admin_delete_recipe_atomic(
  p_recipe_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  -- Delete recipe_ingredients
  DELETE FROM recipe_ingredients WHERE recipe_id = p_recipe_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete recipe_steps
  DELETE FROM recipe_steps WHERE recipe_id = p_recipe_id;
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;

  -- Delete recipe_equipment (composite key, no id column)
  DELETE FROM recipe_equipment WHERE recipe_id = p_recipe_id;
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;

  -- Delete menu_plan_items
  DELETE FROM menu_plan_items WHERE recipe_id = p_recipe_id;
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;

  -- Delete recipe
  DELETE FROM recipes WHERE id = p_recipe_id;
  GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;

  RETURN jsonb_build_object(
    'success', TRUE,
    'deleted_rows', v_deleted_count,
    'deleted_id', p_recipe_id
  );
END;
$$;
