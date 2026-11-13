import json
from pathlib import Path

root=Path('docs/qa/editorial-guidance-20261113')
payload=json.loads((root/'payload.json').read_text())
targets=json.loads((root/'targets.json').read_text())
assert len(payload)==303 and all(p['expected_hash'] for p in payload)
literal=json.dumps(payload,ensure_ascii=False,separators=(',',':'))
assert '$editorial_payload$' not in literal
query=(root/'catalogue-query.sql').read_text().strip().rstrip(';')
sql='''BEGIN;
CREATE TEMP TABLE editorial_input ON COMMIT DROP AS
SELECT value AS p FROM jsonb_array_elements($editorial_payload$'''+literal+'''$editorial_payload$::jsonb);
DO $guard$
BEGIN
 IF (SELECT count(*) FROM public.recipes WHERE is_public) <> 303 OR
    (SELECT count(DISTINCT p->>'id') FROM editorial_input) <> 303 THEN
   RAISE EXCEPTION 'Editorial catalogue precondition changed';
 END IF;
 PERFORM id FROM public.recipes WHERE id IN (SELECT (p->>'id')::uuid FROM editorial_input) ORDER BY id FOR UPDATE;
 PERFORM id FROM public.recipe_steps WHERE recipe_id IN (SELECT (p->>'id')::uuid FROM editorial_input) FOR UPDATE;
 PERFORM id FROM public.recipe_ingredients WHERE recipe_id IN (SELECT (p->>'id')::uuid FROM editorial_input) FOR UPDATE;
 IF (SELECT count(*) FROM public.units WHERE code='ml') <> 1 THEN RAISE EXCEPTION 'Water unit precondition changed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ingredients WHERE id='4d32e561-50ac-4bb4-be6e-43c12a72e397' AND name='水') THEN
   RAISE EXCEPTION 'Water ingredient precondition changed';
 END IF;
END $guard$;
CREATE TEMP TABLE editorial_current ON COMMIT DROP AS SELECT x.*,md5(to_jsonb(x)::text) AS precondition_hash FROM (
'''+query+'''
) x;
CREATE TEMP TABLE editorial_protected ON COMMIT DROP AS
 SELECT id, to_jsonb(r)-ARRAY['source_data','description','method','updated_at'] AS protected FROM public.recipes r;
DO $apply$
DECLARE rec record; item jsonb; rid uuid; n integer;
BEGIN
 FOR rec IN SELECT p FROM editorial_input LOOP
  rid:=(rec.p->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM editorial_current c WHERE c.id=rid AND c.precondition_hash=rec.p->>'expected_hash') THEN
    RAISE EXCEPTION 'Recipe precondition changed: %', rec.p->>'slug';
  END IF;
  IF EXISTS(SELECT 1 FROM public.recipes WHERE id=rid AND (jsonb_typeof(source_data) IS DISTINCT FROM 'object' OR source_data ? 'editorial_guidance')) THEN
    RAISE EXCEPTION 'Editorial metadata precondition changed: %', rec.p->>'slug';
  END IF;
  IF jsonb_array_length(rec.p->'guidance'->'cooking_tips')<>2 OR jsonb_array_length(rec.p->'guidance'->'pairing_suggestions')<>1 THEN
    RAISE EXCEPTION 'Invalid editorial content';
  END IF;
 END LOOP;
 FOR rec IN SELECT p FROM editorial_input LOOP
  rid:=(rec.p->>'id')::uuid;
  FOR item IN SELECT value FROM jsonb_array_elements(rec.p->'changed_steps') LOOP
   UPDATE public.recipe_steps SET text=item->>'text' WHERE recipe_id=rid AND step_no=(item->>'step_no')::integer AND text=item->>'old';
   GET DIAGNOSTICS n=ROW_COUNT;
   IF n<>1 THEN RAISE EXCEPTION 'Step precondition changed: %',rec.p->>'slug'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(rec.p->'ingredient_changes') LOOP
   IF item->'new'->>'id'<>'4d32e561-50ac-4bb4-be6e-43c12a72e397' OR item->'new'->>'unit'<>'ml' THEN
     RAISE EXCEPTION 'Only water notes or a missing water row may change';
   END IF;
   IF item->'old'='null'::jsonb THEN
     INSERT INTO public.recipe_ingredients(recipe_id,ingredient_id,quantity,unit_id,is_optional,prep_note)
       SELECT rid,'4d32e561-50ac-4bb4-be6e-43c12a72e397',(item->'new'->>'quantity')::numeric,id,(item->'new'->>'optional')::boolean,item->'new'->>'note'
       FROM public.units WHERE code='ml';
   ELSE
     IF (item->'old')-'note' IS DISTINCT FROM (item->'new')-'note' THEN RAISE EXCEPTION 'Existing ingredient amounts cannot change'; END IF;
     UPDATE public.recipe_ingredients SET prep_note=item->'new'->>'note' WHERE recipe_id=rid AND ingredient_id='4d32e561-50ac-4bb4-be6e-43c12a72e397';
     GET DIAGNOSTICS n=ROW_COUNT;
     IF n<>1 THEN RAISE EXCEPTION 'Water note precondition changed'; END IF;
   END IF;
  END LOOP;
  UPDATE public.recipes SET
    description=CASE WHEN rec.p->'recipe_updates' ? 'description' THEN rec.p->'recipe_updates'->>'description' ELSE description END,
    method=CASE WHEN rec.p->'recipe_updates' ? 'method' THEN rec.p->'recipe_updates'->>'method' ELSE method END,
    source_data=jsonb_set(source_data,'{editorial_guidance}',rec.p->'guidance',true)
    WHERE id=rid;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.recipes r JOIN editorial_protected p USING(id)
    WHERE to_jsonb(r)-ARRAY['source_data','description','method','updated_at'] IS DISTINCT FROM p.protected) THEN
   RAISE EXCEPTION 'Protected recipe fields changed';
 END IF;
END $apply$;
COMMIT;
'''
(root/'apply.sql').write_text(sql)
rollback=[]
for p,t in zip(payload,targets):
 rollback.append(dict(id=p['id'],slug=p['slug'],guidance=p['guidance'],changed_steps=p['changed_steps'],ingredient_changes=p['ingredient_changes'],
   old_recipe={k:t['expected'][k] for k in p['recipe_updates']},new_recipe=p['recipe_updates'],
   target_steps=t['target']['steps'] if p['changed_steps'] or p['ingredient_changes'] else None))
rollback_literal=json.dumps(rollback,ensure_ascii=False,separators=(',',':'))
rollback_sql='''BEGIN;
CREATE TEMP TABLE editorial_rollback ON COMMIT DROP AS SELECT value AS p FROM jsonb_array_elements($editorial_payload$'''+rollback_literal+'''$editorial_payload$::jsonb);
DO $rollback$
DECLARE rec record; item jsonb; rid uuid; current_steps jsonb; n integer;
BEGIN
 PERFORM id FROM public.recipes WHERE id IN(SELECT (p->>'id')::uuid FROM editorial_rollback) ORDER BY id FOR UPDATE;
 PERFORM id FROM public.recipe_steps WHERE recipe_id IN(SELECT (p->>'id')::uuid FROM editorial_rollback) FOR UPDATE;
 PERFORM id FROM public.recipe_ingredients WHERE recipe_id IN(SELECT (p->>'id')::uuid FROM editorial_rollback) FOR UPDATE;
 FOR rec IN SELECT p FROM editorial_rollback LOOP
  rid:=(rec.p->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.recipes WHERE id=rid AND source_data->'editorial_guidance'=rec.p->'guidance') THEN RAISE EXCEPTION 'Rollback metadata precondition changed'; END IF;
  IF rec.p->'target_steps'<>'null'::jsonb THEN
   SELECT jsonb_agg(jsonb_build_object('step_no',step_no,'text',text) ORDER BY step_no) INTO current_steps FROM public.recipe_steps WHERE recipe_id=rid;
   IF current_steps IS DISTINCT FROM rec.p->'target_steps' THEN RAISE EXCEPTION 'Rollback step precondition changed'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each_text(rec.p->'new_recipe') e JOIN public.recipes r ON r.id=rid WHERE to_jsonb(r)->>e.key IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Rollback recipe precondition changed'; END IF;
 END LOOP;
 FOR rec IN SELECT p FROM editorial_rollback LOOP
  rid:=(rec.p->>'id')::uuid;
  FOR item IN SELECT value FROM jsonb_array_elements(rec.p->'changed_steps') LOOP
   UPDATE public.recipe_steps SET text=item->>'old' WHERE recipe_id=rid AND step_no=(item->>'step_no')::integer AND text=item->>'text';
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(rec.p->'ingredient_changes') LOOP
   IF NOT EXISTS(SELECT 1 FROM public.recipe_ingredients ri JOIN public.units u ON u.id=ri.unit_id WHERE ri.recipe_id=rid
       AND ri.ingredient_id=(item->'new'->>'id')::uuid AND ri.quantity=(item->'new'->>'quantity')::numeric
       AND ri.is_optional=(item->'new'->>'optional')::boolean AND ri.prep_note IS NOT DISTINCT FROM item->'new'->>'note' AND u.code='ml') THEN
     RAISE EXCEPTION 'Rollback water precondition changed';
   END IF;
   IF item->'old'='null'::jsonb THEN
    DELETE FROM public.recipe_ingredients WHERE recipe_id=rid AND ingredient_id=(item->'new'->>'id')::uuid;
   ELSE
    UPDATE public.recipe_ingredients SET prep_note=item->'old'->>'note' WHERE recipe_id=rid AND ingredient_id=(item->'old'->>'id')::uuid;
   END IF;
  END LOOP;
  UPDATE public.recipes SET source_data=source_data-'editorial_guidance',
    description=CASE WHEN rec.p->'old_recipe' ? 'description' THEN rec.p->'old_recipe'->>'description' ELSE description END,
    method=CASE WHEN rec.p->'old_recipe' ? 'method' THEN rec.p->'old_recipe'->>'method' ELSE method END WHERE id=rid;
 END LOOP;
END $rollback$;
COMMIT;
'''
(root/'rollback.sql').write_text(rollback_sql)
print(f'Prepared apply SQL ({len(sql)} characters) and guarded rollback ({len(rollback_sql)} characters).')
