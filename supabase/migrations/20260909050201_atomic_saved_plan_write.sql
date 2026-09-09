-- Create one saved menu plan and all of its items in a single transaction.
--
-- This is the canonical Web/Mobile write boundary. It deliberately runs as
-- SECURITY INVOKER so the caller's authenticated role and the existing RLS
-- policies on menu_plans/menu_plan_items remain authoritative.

CREATE OR REPLACE FUNCTION public.create_menu_plan_atomic(
  p_name text,
  p_week_start_date date,
  p_days_count integer,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_item_count integer;
  v_avg_servings integer;
  v_preview_items jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Authentication required';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' OR char_length(btrim(p_name)) > 120 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Plan name must contain 1 to 120 characters';
  END IF;

  IF p_week_start_date IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Week start date is required';
  END IF;

  IF p_days_count IS NULL OR p_days_count < 1 OR p_days_count > 7 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Days count must be between 1 and 7';
  END IF;

  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Items must be an array containing 1 to 100 entries';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE jsonb_typeof(item) <> 'object'
       OR jsonb_typeof(item->'day_index') <> 'number'
       OR (item->>'day_index') !~ '^-?[0-9]+$'
       OR COALESCE(item->>'meal_type', '') NOT IN ('breakfast', 'lunch', 'dinner', 'snack')
       OR COALESCE(item->>'recipe_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR jsonb_typeof(item->'servings') <> 'number'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Each item requires a valid day, meal type, recipe id, and servings';
  END IF;

  -- A caller must not be able to turn a guessed private recipe UUID into an
  -- owned plan reference and then read its ingredients through a plan-scoped
  -- shopping-list path. Generated plans are composed from public recipes, so
  -- enforce that invariant again at the authoritative write boundary.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.recipes r
      WHERE r.id = (item->>'recipe_id')::uuid
        AND r.is_public IS TRUE
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Every recipe must exist and be public';
  END IF;

  -- Cast only after the shape checks above have succeeded. This keeps malformed
  -- JSON on the validation path instead of leaking a PostgreSQL cast error.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item
    WHERE (item->>'day_index')::integer < 0
       OR (item->>'day_index')::integer >= p_days_count
       OR (item->>'servings')::numeric <= 0
       OR (item->>'servings')::numeric > 100
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Each item requires a valid day, meal type, recipe id, and servings';
  END IF;

  INSERT INTO public.menu_plans (
    user_id,
    title,
    start_date,
    end_date
  )
  VALUES (
    v_user_id,
    btrim(p_name),
    p_week_start_date,
    p_week_start_date + (p_days_count - 1)
  )
  RETURNING id INTO v_plan_id;

  INSERT INTO public.menu_plan_items (
    menu_plan_id,
    date,
    meal_slot,
    recipe_id,
    servings,
    item_order,
    source
  )
  SELECT
    v_plan_id,
    p_week_start_date + parsed.day_index,
    parsed.meal_type,
    parsed.recipe_id,
    parsed.servings,
    row_number() OVER (
      PARTITION BY parsed.day_index, parsed.meal_type
      ORDER BY parsed.input_order
    )::integer,
    'generated'
  FROM (
    SELECT
      (item->>'day_index')::integer AS day_index,
      item->>'meal_type' AS meal_type,
      (item->>'recipe_id')::uuid AS recipe_id,
      (item->>'servings')::numeric AS servings,
      input_order
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS input(item, input_order)
  ) AS parsed;

  SELECT
    count(*)::integer,
    round(avg(mpi.servings))::integer
  INTO v_item_count, v_avg_servings
  FROM public.menu_plan_items mpi
  WHERE mpi.menu_plan_id = v_plan_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', preview.id,
        'date', preview.date,
        'meal_slot', preview.meal_slot,
        'servings', preview.servings,
        'recipe', CASE
          WHEN preview.recipe_id IS NULL THEN NULL
          ELSE jsonb_build_object(
            'id', preview.recipe_id,
            'name', preview.recipe_name,
            'image_url', preview.recipe_image_url
          )
        END
      )
      ORDER BY preview.item_order
    ),
    '[]'::jsonb
  )
  INTO v_preview_items
  FROM (
    SELECT
      mpi.id,
      mpi.date,
      mpi.meal_slot,
      mpi.servings,
      mpi.item_order,
      r.id AS recipe_id,
      r.name AS recipe_name,
      r.image_url AS recipe_image_url
    FROM public.menu_plan_items mpi
    LEFT JOIN public.recipes r ON r.id = mpi.recipe_id
    WHERE mpi.menu_plan_id = v_plan_id
      AND mpi.date = (
        SELECT min(first_item.date)
        FROM public.menu_plan_items first_item
        WHERE first_item.menu_plan_id = v_plan_id
      )
    ORDER BY mpi.date, mpi.item_order
    LIMIT 2
  ) AS preview;

  UPDATE public.menu_plans
  SET
    avg_servings = COALESCE(v_avg_servings, 2),
    item_count = v_item_count,
    preview_items = v_preview_items
  WHERE id = v_plan_id;

  RETURN v_plan_id;
END;
$$;

COMMENT ON FUNCTION public.create_menu_plan_atomic(text, date, integer, jsonb) IS
  'Authenticated Web/Mobile saved-plan write boundary. Validates input and '
  'creates menu_plans, menu_plan_items, and cached summary fields atomically. '
  'SECURITY INVOKER: existing table grants and RLS enforce ownership.';

REVOKE ALL ON FUNCTION public.create_menu_plan_atomic(text, date, integer, jsonb)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.create_menu_plan_atomic(text, date, integer, jsonb)
  TO authenticated;
