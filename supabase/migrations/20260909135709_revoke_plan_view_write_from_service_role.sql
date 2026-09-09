-- The preceding plan-view hardening migration granted SELECT to service_role
-- but did not first remove the role's pre-existing ALL privileges. Reset each
-- ACL explicitly so service_role is read-only on both views.

REVOKE ALL ON TABLE public.v_menu_plan_shopping_list FROM service_role;
GRANT SELECT ON TABLE public.v_menu_plan_shopping_list TO service_role;

REVOKE ALL ON TABLE public.vw_menu_plan_grocery_items FROM service_role;
GRANT SELECT ON TABLE public.vw_menu_plan_grocery_items TO service_role;
