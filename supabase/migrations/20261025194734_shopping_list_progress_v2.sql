-- Shopping progress is private to the owner of the saved menu plan.
create table public.menu_plan_shopping_progress (
  plan_id uuid primary key references public.menu_plans(id) on delete cascade,
  progress jsonb not null default '{"version":1,"items":{},"extras":[]}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint shopping_progress_size check (octet_length(progress::text) <= 250000),
  constraint shopping_progress_shape check (coalesce(jsonb_typeof(progress) = 'object' and progress->>'version' = '1'
    and jsonb_typeof(progress->'items') = 'object' and jsonb_typeof(progress->'extras') = 'array', false))
);
alter table public.menu_plan_shopping_progress enable row level security;
revoke all on public.menu_plan_shopping_progress from anon;
grant select, insert, update on public.menu_plan_shopping_progress to authenticated;
create policy "owner reads shopping progress" on public.menu_plan_shopping_progress for select to authenticated
using (exists(select 1 from public.menu_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "owner inserts shopping progress" on public.menu_plan_shopping_progress for insert to authenticated
with check (exists(select 1 from public.menu_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
create policy "owner updates shopping progress" on public.menu_plan_shopping_progress for update to authenticated
using (exists(select 1 from public.menu_plans p where p.id = plan_id and p.user_id = (select auth.uid())))
with check (exists(select 1 from public.menu_plans p where p.id = plan_id and p.user_id = (select auth.uid())));

-- The existing meal plan RPC and progress insert share one transaction.
create function public.create_menu_plan_with_shopping(
  p_name text, p_week_start_date date, p_days_count integer, p_items jsonb, p_progress jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare new_plan_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  new_plan_id := public.create_menu_plan_atomic(p_name, p_week_start_date, p_days_count, p_items);
  insert into public.menu_plan_shopping_progress(plan_id, progress) values (new_plan_id, p_progress);
  return new_plan_id;
end;
$$;
revoke all on function public.create_menu_plan_with_shopping(text,date,integer,jsonb,jsonb) from public, anon;
grant execute on function public.create_menu_plan_with_shopping(text,date,integer,jsonb,jsonb) to authenticated;
