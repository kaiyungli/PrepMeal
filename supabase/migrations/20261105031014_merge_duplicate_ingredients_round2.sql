-- Merge ingredients the shopping list showed as separate lines for one food
-- (owner decisions, 2026-11-05). Quantities, units, preparation notes and
-- recipe nutrition are untouched. Retired rows stay inactive; their names
-- become aliases of the ingredient that replaces them.
DO $$
DECLARE
  moved integer := 0;
  n integer;
  pair record;
  retired public.ingredients%ROWTYPE;
  canonical public.ingredients%ROWTYPE;
BEGIN
  IF EXISTS (SELECT 1 FROM public.ingredients WHERE slug = 'bone-in-chicken-thigh') THEN
    RAISE NOTICE 'already applied'; RETURN;
  END IF;

  -- 雞腿肉: only the Filipino adobo row is bone-in; the rest are boneless.
  UPDATE public.recipe_ingredients ri SET ingredient_id = b.id
  FROM public.ingredients t, public.ingredients b, public.recipes r
  WHERE t.slug = 'chicken-thigh' AND b.slug = 'boneless-chicken-thigh'
    AND ri.ingredient_id = t.id AND r.id = ri.recipe_id AND r.name <> '菲律賓酸香醬油炆雞';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'Expected 3 boneless 雞腿肉 rows, found %', n; END IF;
  moved := moved + n;
  IF (SELECT count(*) FROM public.recipe_ingredients ri JOIN public.ingredients t ON t.id = ri.ingredient_id WHERE t.slug = 'chicken-thigh') <> 1 THEN
    RAISE EXCEPTION 'Expected only the bone-in row left on 雞腿肉';
  END IF;
  UPDATE public.ingredients SET slug = 'bone-in-chicken-thigh', name = '雞腿（帶皮帶骨）', name_zh = '雞腿（帶皮帶骨）',
    name_en = 'bone-in skin-on chicken thigh', aliases = ARRAY['帶骨雞髀', '雞髀']
  WHERE slug = 'chicken-thigh';

  -- 粟米: four recipes use kernels; the pork rib soup uses whole cobs.
  UPDATE public.recipe_ingredients ri SET ingredient_id = k.id
  FROM public.ingredients c, public.ingredients k, public.recipes r
  WHERE c.slug = 'corn' AND k.slug = 'corn-kernels' AND ri.ingredient_id = c.id AND r.id = ri.recipe_id
    AND r.name IN ('吞拿魚粟米焗薯', '粟米肉碎', '粟米蛋花湯', '雜菜蛋炒飯');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'Expected 4 corn kernel rows, found %', n; END IF;
  moved := moved + n;

  FOR pair IN SELECT * FROM (VALUES
    ('chicken-thigh-fillet', 'boneless-chicken-thigh', 6),  -- 雞扒 → 去骨雞腿肉
    ('sliced-beef', 'beef', 7),                             -- 牛肉片 → 牛肉
    ('vinegar', 'white-vinegar', 7),                        -- 醋 → 白醋
    ('stock', 'chicken-stock', 3),                          -- 高湯 → 雞湯
    ('mayonnaise', 'salad-dressing', 4)                     -- 蛋黃醬 → 沙律醬
  ) AS pairs(old_slug, canonical_slug, expected)
  LOOP
    SELECT * INTO retired FROM public.ingredients WHERE slug = pair.old_slug FOR UPDATE;
    SELECT * INTO canonical FROM public.ingredients WHERE slug = pair.canonical_slug FOR UPDATE;
    IF retired.id IS NULL OR canonical.id IS NULL THEN
      RAISE EXCEPTION 'Ingredient missing: % / %', pair.old_slug, pair.canonical_slug;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.recipe_ingredients o JOIN public.recipe_ingredients c ON c.recipe_id = o.recipe_id
      WHERE o.ingredient_id = retired.id AND c.ingredient_id = canonical.id
    ) THEN RAISE EXCEPTION 'Recipe lists both % and %', pair.old_slug, pair.canonical_slug; END IF;
    UPDATE public.recipe_ingredients SET ingredient_id = canonical.id WHERE ingredient_id = retired.id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> pair.expected THEN RAISE EXCEPTION 'Expected % rows on %, found %', pair.expected, pair.old_slug, n; END IF;
    moved := moved + n;
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

  IF moved <> 34 THEN RAISE EXCEPTION 'Expected 34 recipe rows moved, found %', moved; END IF;
END $$;
