-- Applied to prod 2026-11-06 with owner approval (record only).
-- The 156 recipe PNG images (avg 2.5 MB, 400 MB total) were copied to WebP
-- (quality 90, original size, max 1600px wide; 48.6 MB total) in the
-- `recipes` bucket as <name>-20261106-v1.webp, cache-control 1 year.
-- Original PNGs are kept. To revert:
--   update recipes set image_url = regexp_replace(image_url, '-20261106-v1\.webp$', '.png')
--   where image_url like '%-20261106-v1.webp';
update recipes
set image_url = regexp_replace(image_url, '\.png$', '-20261106-v1.webp', 'i')
where image_url ~* '^https://hivnajhqqvaokthzhugx\.supabase\.co/storage/v1/object/public/recipes/[^/?]+\.png$'
  and exists (
    select 1 from storage.objects o
    where o.bucket_id = 'recipes'
      and o.name = regexp_replace(regexp_replace(recipes.image_url, '^.*/recipes/', ''), '\.png$', '-20261106-v1.webp', 'i')
  );
