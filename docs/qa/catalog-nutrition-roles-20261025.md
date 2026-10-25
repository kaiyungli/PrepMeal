# Catalogue nutrition and role repair — 2026-10-25

Garlic chicken had no source nutrition evidence. USDA FoodData Central API was read directly for six SR Legacy entries (171077,169230,169698,170931,174277,172336); profiles and exact ingredient weights are in garlic-chicken-nutrition-20261025.json. Sum is 299.61 kcal, 37.4015g protein, 7.9907g carbohydrate, 12.3222g fat per one-person recipe. Keep rounded 300 kcal; correct macros to 37.4/8.0/12.3 and remove low_fat. Existing high_protein and low_calorie still satisfy app rules. Raw skinless boneless breast and generic soy sauce/canola oil are explicit reference assumptions; this is an input estimate, not measured intake. Quantities, steps and images unchanged.

Ten null roles are repaired explicitly, following existing app definition: complete_meal is a standalone rice/noodle dish, not a balanced-nutrition claim. Six staples (lemon broccoli pasta, tuna corn rice, cold soba, arrabbiata, tuna rice balls, japchae) become complete_meal with the matching boolean. Bacon potato salad and SPAM potato hash become protein_side; braised pumpkin and Korean braised potato become veg_side. Optional meat does not make the latter vegetarian bases protein mains. Existing dish_type, protein, diet and ingredient choices are retained.

The SQL is one atomic DO block with expected row guards: exactly ten still-null roles and one chicken row with original macros. Replay fails safely. Existing source metadata is merged, not replaced; prior role/boolean and nutrition values are recorded. No schema, ACL or application logic changes.

Validation: PostgreSQL/PGlite execution, source preservation and replay guard; real planner slot matching and nutrition-tag rules; independent nutrient summation. Production readback and ingredient fingerprint checked after execution.

Applied production migration 20261025052638. Readback: zero null roles, zero role/flag conflicts, chicken 300/37.4/8.0/12.3 with high_protein and low_calorie. All 2,127 ingredient rows have identical before/after MD5 5d90027fcc6ccbd5d8ca385e62a9b0ad.
