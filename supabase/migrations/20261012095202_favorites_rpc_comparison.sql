-- Diagnostic-only reader. API supplies the verified caller's UUID.
-- No client role can execute this function; no SECURITY DEFINER or writes.
BEGIN;
CREATE FUNCTION public.get_favorites_recipes_comparison(p_user_id uuid)
RETURNS TABLE (recipe_id uuid, recipes jsonb)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT f.recipe_id, to_jsonb(recipe)
  FROM public.user_favorites AS f
  LEFT JOIN LATERAL (
    SELECT r.id, r.slug, r.name, r.image_url, r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.calories_per_serving, r.protein_g, r.carbs_g, r.fat_g, r.difficulty, r.cuisine, r.method, r.dish_type, r.primary_protein, r.budget_level, r.is_complete_meal, r.speed, r.created_at, r.description, r.diet, r.flavor, r.times_shown
    FROM public.recipes AS r
    WHERE r.id = f.recipe_id
  ) AS recipe ON true
  WHERE f.user_id = p_user_id;
$function$;
REVOKE ALL ON FUNCTION public.get_favorites_recipes_comparison(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_favorites_recipes_comparison(uuid) TO service_role;
COMMIT;
