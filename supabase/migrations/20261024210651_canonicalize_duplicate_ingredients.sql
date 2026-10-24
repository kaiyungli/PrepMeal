-- Resolve catalog identity by stable slugs, preserving retired rows for history.
-- Quantities, preparation notes, recipe nutrition and source ledgers are untouched.
DO $$
DECLARE
  pair record;
  retired public.ingredients%ROWTYPE;
  canonical public.ingredients%ROWTYPE;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('chicken-wing-mid-joint', 'chicken-wings'),
    ('green-pepper', 'green-bell-pepper'),
    ('fermented-black-bean', 'fermented-black-beans')
  ) AS pairs(old_slug, canonical_slug)
  LOOP
    SELECT * INTO retired FROM public.ingredients WHERE slug = pair.old_slug FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO canonical FROM public.ingredients WHERE slug = pair.canonical_slug FOR UPDATE;
    IF NOT FOUND OR canonical.name IS DISTINCT FROM retired.name THEN
      RAISE EXCEPTION 'Canonical ingredient missing or different: %', pair.canonical_slug;
    END IF;
    -- Do not silently create two rows for the same ingredient in one recipe.
    IF EXISTS (
      SELECT 1 FROM public.recipe_ingredients old_row
      JOIN public.recipe_ingredients new_row ON new_row.recipe_id = old_row.recipe_id
      WHERE old_row.ingredient_id = retired.id AND new_row.ingredient_id = canonical.id
    ) THEN RAISE EXCEPTION 'Recipe requires a manual ingredient-row merge: %', retired.slug; END IF;

    UPDATE public.recipe_ingredients SET ingredient_id = canonical.id WHERE ingredient_id = retired.id;
    UPDATE public.ingredient_substitutions SET ingredient_id = canonical.id WHERE ingredient_id = retired.id;
    UPDATE public.ingredient_substitutions SET substitute_ingredient_id = canonical.id WHERE substitute_ingredient_id = retired.id;
    UPDATE public.ingredients SET
      aliases = ARRAY(SELECT DISTINCT a FROM unnest(
        coalesce(canonical.aliases, ARRAY[]::text[]) || coalesce(retired.aliases, ARRAY[]::text[])
        || ARRAY[retired.slug, retired.name_en, retired.name_zh]
      ) AS a WHERE a IS NOT NULL AND btrim(a) <> '' ORDER BY a),
      name_en = coalesce(canonical.name_en, retired.name_en),
      name_zh = coalesce(canonical.name_zh, retired.name_zh, canonical.name)
    WHERE id = canonical.id;
    UPDATE public.ingredients SET is_active = false WHERE id = retired.id;
  END LOOP;
END $$;

-- These are equivalent counts only for the named ingredients. Never convert
-- grams, spoons, whole vegetables or slices of unrelated foods into counts.
UPDATE public.recipe_ingredients ri SET unit_id = target.id
FROM public.ingredients i, public.units original, public.units target,
  (VALUES ('egg', 'egg'), ('chili', 'stick'), ('bay-leaf', 'slice')) AS choice(slug, unit_code)
WHERE ri.ingredient_id = i.id AND i.slug = choice.slug
  AND ri.unit_id = original.id AND original.unit_type = 'count'
  AND original.code IN ('egg', 'pc', 'piece', 'stick', 'slice')
  AND target.code = choice.unit_code AND target.unit_type = 'count'
  AND ri.unit_id <> target.id;
