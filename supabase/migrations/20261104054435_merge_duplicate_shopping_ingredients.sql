-- One food, one catalog row: the shopping list merges by ingredient id, so a
-- food stored under two ids is listed twice. Each pair below was confirmed
-- from the recipes' own preparation notes (2026-11-04 audit).
-- Quantities, units, preparation notes and recipe nutrition are untouched.
-- Retired rows stay (inactive) for history; their names become aliases.
DO $$
DECLARE
  pair record;
  retired public.ingredients%ROWTYPE;
  canonical public.ingredients%ROWTYPE;
BEGIN
  FOR pair IN SELECT * FROM (VALUES
    ('pork-mince', 'minced-pork'),             -- 免治豬肉 → 豬肉碎
    ('miso-paste', 'miso'),                    -- 味噌醬 → 味噌
    ('tuna', 'canned-tuna'),                   -- 吞拿魚（瀝乾）→ 吞拿魚罐頭
    ('vermicelli', 'mung-bean-glass-noodles')  -- 粉絲 → 乾綠豆粉絲
  ) AS pairs(old_slug, canonical_slug)
  LOOP
    SELECT * INTO retired FROM public.ingredients WHERE slug = pair.old_slug FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO canonical FROM public.ingredients WHERE slug = pair.canonical_slug FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Canonical ingredient missing: %', pair.canonical_slug;
    END IF;
    IF retired.shopping_category IS DISTINCT FROM canonical.shopping_category THEN
      RAISE EXCEPTION 'Shopping category differs: % / %', retired.slug, canonical.slug;
    END IF;
    -- (recipe_id, ingredient_id) is unique: never silently combine two rows.
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
        || ARRAY[retired.name, retired.slug, retired.name_en, retired.name_zh]
      ) AS a WHERE a IS NOT NULL AND btrim(a) <> '' AND a <> canonical.name ORDER BY a)
    WHERE id = canonical.id;
    UPDATE public.ingredients SET is_active = false WHERE id = retired.id;
  END LOOP;
END $$;

-- 豆腐 stays a general ingredient; only rows whose own note specifies fresh
-- firm tofu move to 硬豆腐.
DO $$
DECLARE
  tofu_id uuid;
  firm_id uuid;
  moved integer;
BEGIN
  SELECT id INTO tofu_id FROM public.ingredients WHERE slug = 'tofu';
  SELECT id INTO firm_id FROM public.ingredients WHERE slug = 'firm-tofu';
  IF tofu_id IS NULL OR firm_id IS NULL THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.recipe_ingredients t
    JOIN public.recipe_ingredients f ON f.recipe_id = t.recipe_id AND f.ingredient_id = firm_id
    WHERE t.ingredient_id = tofu_id AND t.prep_note LIKE '%鮮硬豆腐%'
  ) THEN RAISE EXCEPTION 'Recipe already lists firm tofu; manual merge needed'; END IF;
  UPDATE public.recipe_ingredients SET ingredient_id = firm_id
  WHERE ingredient_id = tofu_id AND prep_note LIKE '%鮮硬豆腐%';
  GET DIAGNOSTICS moved = ROW_COUNT;
  RAISE NOTICE 'Moved % tofu rows to firm tofu', moved;
END $$;
