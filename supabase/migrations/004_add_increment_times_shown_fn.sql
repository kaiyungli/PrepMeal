-- Add RPC function for atomic increment of times_shown
CREATE OR REPLACE FUNCTION public.increment_recipe_times_shown(p_recipe_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.recipes
  SET times_shown = COALESCE(times_shown, 0) + 1
  WHERE id = p_recipe_id;
$$;
