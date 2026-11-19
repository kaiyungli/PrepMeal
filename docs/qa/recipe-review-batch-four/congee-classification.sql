-- Applied 2026-11-19 after fresh input review. Refuses stale inputs and repeat application.
BEGIN;
DO $fix$
DECLARE oldrow jsonb; newrow jsonb; actual jsonb;
BEGIN
 SELECT to_jsonb(r) INTO oldrow FROM public.recipes r WHERE id='a8d4792f-c55f-4b96-a4b8-3d7ad91dc085' FOR UPDATE;
 SELECT to_jsonb(q) INTO actual FROM (select r.id,r.slug,r.name,r.description,r.method,r.meal_role,r.is_complete_meal,r.primary_protein,r.base_servings,r.total_time_minutes,r.diet,r.flavor,(select jsonb_agg(jsonb_build_object('step_no',s.step_no,'text',s.text) order by s.step_no) from public.recipe_steps s where s.recipe_id=r.id) as steps,(select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'quantity',trim_scale(ri.quantity),'unit',u.code,'note',ri.prep_note,'optional',ri.is_optional) order by i.id) from public.recipe_ingredients ri join public.ingredients i on i.id=ri.ingredient_id left join public.units u on u.id=ri.unit_id where ri.recipe_id=r.id) as ingredients from public.recipes r where r.slug='chicken-congee') q;
 IF actual IS DISTINCT FROM '{"id":"a8d4792f-c55f-4b96-a4b8-3d7ad91dc085","slug":"chicken-congee","name":"雞粥","description":"雞肉煮入白粥，粥底綿滑，味道清鮮，適合早餐或清淡晚餐。","method":"boiled","meal_role":"soup","is_complete_meal":false,"primary_protein":"chicken","base_servings":1,"total_time_minutes":40,"diet":[],"flavor":["salty"],"steps":[{"text":"白米洗淨，瀝乾後放入鍋中。","step_no":1},{"text":"加入雞湯700毫升，煮滾後轉小火。","step_no":2},{"text":"小火煮 25 至 30 分鐘，間中攪拌，煮至米粒開花。","step_no":3},{"text":"加入雞絲和薑絲，再煮 5 分鐘至雞肉熟透。","step_no":4},{"text":"加入鹽少許和白胡椒少許調味。","step_no":5},{"text":"試味後即可上碗。","step_no":6}],"ingredients":[{"id":"04ee8d43-6725-4a54-a056-6d08b07cca3e","name":"白胡椒","note":null,"unit":"tsp","optional":false,"quantity":0.25},{"id":"3214d3bc-6d7a-49f7-a605-ca5c5aefe8f0","name":"白米","note":"重量為未煮生米","unit":"g","optional":false,"quantity":60},{"id":"92a6a27a-ad0b-4375-b166-935d7455c9ff","name":"鹽","note":null,"unit":"tsp","optional":false,"quantity":0.5},{"id":"97bfe128-a7b7-4b58-89fb-caa68463405a","name":"薑","note":"切絲","unit":"slice","optional":false,"quantity":2},{"id":"a10b07f2-5c59-4f75-bc2d-ed79af879da9","name":"雞湯","note":null,"unit":"ml","optional":false,"quantity":700},{"id":"dd41a640-0806-4003-8a40-9a25a3a8dc9d","name":"雞胸肉","note":"切絲","unit":"g","optional":false,"quantity":100}]}'::jsonb OR oldrow->>'dish_type'<>'soup' OR oldrow->'source_data'->'editorial_guidance'->>'source_fingerprint'<>'3191412003fc33ab1d313e25394357c19df795d6690d372b170917767f86f538' THEN RAISE EXCEPTION 'Congee reviewed inputs changed'; END IF;
 UPDATE public.recipes SET meal_role='complete_meal',is_complete_meal=true,dish_type='staple',
 source_data=jsonb_set(source_data,'{editorial_guidance,source_fingerprint}','"1c775db17eb1fea3b580cd836dc2bdc52278f4b539d625172f8746de74c22a61"'::jsonb)
 WHERE id='a8d4792f-c55f-4b96-a4b8-3d7ad91dc085';
 SELECT to_jsonb(r) INTO newrow FROM public.recipes r WHERE id='a8d4792f-c55f-4b96-a4b8-3d7ad91dc085';
 IF (oldrow-'meal_role'-'is_complete_meal'-'dish_type'-'updated_at'-'source_data') IS DISTINCT FROM (newrow-'meal_role'-'is_complete_meal'-'dish_type'-'updated_at'-'source_data')
 OR ((oldrow->'source_data')-'editorial_guidance') IS DISTINCT FROM ((newrow->'source_data')-'editorial_guidance')
 OR ((oldrow->'source_data'->'editorial_guidance')-'source_fingerprint') IS DISTINCT FROM ((newrow->'source_data'->'editorial_guidance')-'source_fingerprint')
 THEN RAISE EXCEPTION 'Unrelated congee fields changed'; END IF;
END $fix$;
COMMIT;
