# Recipe detail guidance — 2026-10-25

Replace translated-label substring checks with catalogue method/role codes. Cooking advice is specific to the seven supported methods, with no smoke-point instruction, blanket cold rinsing or unnecessary filler. Pairing uses complete meals/staples, protein mains/sides, vegetable sides and soups; staples no longer receive a second rice/noodle recommendation. Unknown classifications omit advice rather than guessing.

Cooked leftovers: small portions/shallow containers, cool promptly and refrigerate within two hours at 4°C or below; reheat thoroughly only once; discard refrigerated leftovers older than three days. No-cook dishes receive cold storage advice and cooling guidance for any precooked ingredients, without a blanket reheating instruction. A visible CFS source link is included.

Sources verified 2026-10-25:
- https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_reminder.html
- https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_leftovers.html

Detail API hydration/fallback and normalization now retain meal_role, preserving public visibility checks. This supports both full detail and preview content through their shared component.

Validation: all method branches, role-specific pairing, cold versus cooked storage, actual shared component rendering, legacy RPC role hydration and API normalization. TypeScript passes. Existing ingredient, provenance and deferred-render component checks pass. No recipe DB changes or source backfill in this release.
