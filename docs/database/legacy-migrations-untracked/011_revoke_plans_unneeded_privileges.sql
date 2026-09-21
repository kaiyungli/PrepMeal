-- Migration: 011_revoke_plans_unneeded_privileges
--
-- Least-privilege cleanup for the saved-plan tables. The `anon` and
-- `authenticated` roles were granted TRUNCATE, REFERENCES, and TRIGGER on
-- public.menu_plans and public.menu_plan_items. None of these are used by any
-- application path: PostgREST only issues SELECT/INSERT/UPDATE/DELETE, and no
-- client role runs DDL (creating FKs needs REFERENCES, creating triggers needs
-- TRIGGER, and the app deletes rows with DELETE, never TRUNCATE). Removing them
-- shrinks the attack surface without changing any behaviour.
--
-- This migration touches privileges ONLY. It does not alter table schema, FK
-- constraints, RLS enablement, RLS policies, or the SELECT/INSERT/UPDATE/DELETE
-- grants that RLS gates. Row-level ownership enforcement is unchanged.

REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.menu_plans, public.menu_plan_items
  FROM anon, authenticated;
