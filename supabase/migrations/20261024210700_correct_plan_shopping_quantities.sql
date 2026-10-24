-- Each meal occurrence contributes its own servings / recipe base servings.
-- The mobile screen has no optional-ingredient selector: return base ingredients
-- only. The web endpoint supports explicit optional selections separately.
-- Preserve the existing signature, ownership gate, ACL and six-field response.
CREATE OR REPLACE FUNCTION public.get_menu_plan_shopping_list_json(p_plan_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  WITH owned_plan AS (
    SELECT mp.id FROM public.menu_plans mp
    WHERE mp.id = p_plan_id AND mp.user_id = auth.uid()
  ),
  user_unit_language AS (
    SELECT coalesce(nullif((SELECT up.unit_language FROM public.user_preferences up
      WHERE up.user_id = auth.uid()), ''), 'zh') AS lang
  ),
  line_items_raw AS (
    SELECT ri.ingredient_id, i.name, i.shopping_category, ri.created_at, ri.id,
      -- Invalid legacy counts use one serving; zero/negative quantities cannot
      -- subtract from other meals. Do not average servings or DISTINCT recipes.
      CASE WHEN ri.quantity > 0 AND ri.quantity < 'Infinity'::numeric
        THEN ri.quantity ELSE 0 END
      * CASE WHEN mpi.servings > 0 AND mpi.servings < 'Infinity'::numeric
        THEN mpi.servings ELSE 1 END
      / CASE WHEN r.base_servings > 0 THEN r.base_servings ELSE 1 END AS quantity,
      u.code AS unit_code, u.display_name_en, u.display_name_zh,
      CASE lower(trim(coalesce(u.code, '')))
        WHEN 'teaspoon' THEN 'tsp' WHEN 'tsp' THEN 'tsp'
        WHEN 'tablespoon' THEN 'tbsp' WHEN 'tbsp' THEN 'tbsp'
        WHEN 'milliliter' THEN 'ml' WHEN 'ml' THEN 'ml'
        WHEN 'liter' THEN 'l' WHEN 'l' THEN 'l'
        WHEN 'gram' THEN 'g' WHEN 'g' THEN 'g'
        WHEN 'kilogram' THEN 'kg' WHEN 'kg' THEN 'kg'
        WHEN 'cup' THEN 'cup' WHEN 'piece' THEN '件'
        ELSE coalesce(u.code, '') END AS normalized_unit
    FROM owned_plan op
    JOIN public.menu_plan_items mpi ON mpi.menu_plan_id = op.id
    JOIN public.recipes r ON r.id = mpi.recipe_id AND r.is_public = true
    JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN public.ingredients i ON i.id = ri.ingredient_id
    LEFT JOIN public.units u ON u.id = ri.unit_id
    WHERE ri.is_optional IS NOT TRUE
  ),
  line_items AS (
    SELECT lir.ingredient_id, lir.name, lir.shopping_category, lir.normalized_unit,
      coalesce(sum(lir.quantity), 0) AS quantity,
      (array_agg(nullif(lir.unit_code, '') ORDER BY lir.created_at NULLS LAST, lir.id))[1] AS unit_code,
      (array_agg(CASE WHEN (SELECT lang FROM user_unit_language) = 'en'
        THEN coalesce(nullif(lir.display_name_en, ''), nullif(lir.display_name_zh, ''))
        ELSE coalesce(nullif(lir.display_name_zh, ''), nullif(lir.display_name_en, '')) END
        ORDER BY lir.created_at NULLS LAST, lir.id))[1] AS unit_display
    FROM line_items_raw lir
    GROUP BY lir.ingredient_id, lir.name, lir.shopping_category, lir.normalized_unit
  )
  SELECT jsonb_build_object('items', coalesce((SELECT jsonb_agg(jsonb_build_object(
    'ingredient_id', li.ingredient_id, 'name', li.name,
    'shopping_category', li.shopping_category, 'quantity', li.quantity,
    'unit_code', li.unit_code, 'unit_display', li.unit_display
  ) ORDER BY li.shopping_category NULLS LAST, li.name, li.normalized_unit)
  FROM line_items li), '[]'::jsonb)) FROM owned_plan;
$$;

COMMENT ON FUNCTION public.get_menu_plan_shopping_list_json(uuid) IS
  'Owned-plan shopping list, base ingredients only. Each meal occurrence contributes '
  'quantity * meal servings / recipe base servings. Public recipes only. '
  'Groups by ingredient identity and compatible unit; preserves caller unit language. '
  'Returns SQL NULL for an unknown or unowned plan, and {"items":[]} for an empty owned plan.';
REVOKE ALL ON FUNCTION public.get_menu_plan_shopping_list_json(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_menu_plan_shopping_list_json(uuid) TO authenticated;
