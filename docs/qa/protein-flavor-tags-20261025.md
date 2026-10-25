# Protein / flavor data repair — 2026-10-25

Reviewed all 288 public recipes. Updated 42 recipes: 39 protein-array repairs and 30 empty flavor arrays completed. No recipe ID, name, primary protein, dietary tag, ingredient, quantity, method, nutrition, evidence or image changes.

`primary_protein` is the principal food group for the positive filter. `protein[]` also identifies other required food groups for exclusions. Empty plant-only arrays are valid, so they are not filled with invented animal/soy groups. Optional additions are not promoted to mandatory base groups. Fish sauce and chicken stock are included where they are explicit required ingredients; this is not a substitute for package allergen checks. Existing sauce classifications outside these explicit reviewed identities are preserved.

Removed incorrect shrimp classifications from scallops and the chicken/egg Singapore noodles. For unspecified mixed seafood, retain the existing shrimp group and also add seafood; do not assume a purchased blend excludes shrimp. Added fish to the surimi-based crab-stick dish. Sweet/sour tags for sweet-and-sour dishes follow the listed sugar/ketchup/vinegar sauce; small seasoning sugar alone does not trigger sweet. No heat tag is inferred merely from white pepper or green bell pepper.

| Recipe | Protein before → after | Flavor after |
|---|---|---|
| 南瓜濃湯 | ∅ → chicken | sweet, salty |
| 青咖哩雞 | chicken → chicken, fish | spicy, salty |
| 粟米斑塊 | egg → egg, fish | salty, sweet |
| 肉碎粉絲煲 | ∅ → pork | salty |
| 咕嚕肉 | ∅ → pork | salty, sweet, sour |
| 洋蔥炒蛋 | ∅ → egg | salty |
| 蟹柳滑蛋豆腐 | egg, mixed, tofu → egg, mixed, tofu, fish | salty, sweet |
| 午餐肉炒蛋 | ∅ → egg, pork | salty |
| 生炒骨 | ∅ → pork | salty, sweet, sour |
| 白汁海鮮飯 | shrimp → shrimp, seafood | salty |
| 忌廉蘑菇湯 | ∅ → chicken | salty |
| 紅咖哩雞 | chicken → chicken, fish | spicy, salty |
| 泰式炒河粉（雞肉） | chicken → chicken, egg | salty, sweet |
| 泰式菠蘿炒飯 | chicken → chicken, egg, fish | sweet, salty |
| 打拋豬飯 | pork → pork, fish | spicy, salty |
| 香煎帶子 | shrimp → seafood | salty |
| 泰式雞絲炒米粉 | chicken → chicken, fish | spicy, salty |
| 蒜蓉通菜 | ∅ →  | salty |
| 蒜片牛肉粒 | ∅ → beef | salty |
| 洋蔥炒雞扒 | ∅ → chicken | salty |
| 蝦米粉絲紹菜 | ∅ → shrimp | salty |
| 椒鹽豆腐 | ∅ → tofu | salty |
| 青瓜炒蛋 | ∅ → egg | salty |
| 肉碎蒸蛋 | egg → egg, pork | salty |
| 番茄薯仔肉碎 | ∅ → pork | salty, sour |
| 涼瓜煎蛋 | ∅ → egg | salty |
| 豉椒炒蜆 | ∅ → seafood | salty |
| 洋蔥豬扒 | ∅ → pork | salty |
| 腐乳通菜 | ∅ →  | salty |
| 京都骨 | ∅ → pork | salty, sweet, sour |
| 豉汁蒸排骨 | ∅ → pork | salty |
| 粟米肉碎 | ∅ → pork | salty, sweet |
| 涼瓜炒牛肉 | ∅ → beef | salty |
| 青椒炒蛋 | ∅ → egg | salty |
| 菜脯煎蛋 | ∅ → egg | salty |
| 豆角炒蛋 | ∅ → egg | salty |
| 薯仔炆雞翼 | ∅ → chicken | salty |
| 餐蛋公仔麵 | ∅ → egg, pork | salty |
| 鹹魚蒸肉餅 | ∅ → pork, fish | salty |
| 肉碎豆腐 | tofu → tofu, pork | salty |
| 星洲炒米 | shrimp, egg → chicken, egg | salty, spicy |
| 蒜香茄子 | ∅ →  | salty |

Validation: 2,212 unit tests and 175 component tests passed; TypeScript, ESLint and whitespace checks passed. PGlite verifies batch application, preservation of all non-tag fields, rollback on ingredient changes, and replay rejection. Actual homepage/shared filters and generation exclusion hooks exercise the reviewed records. Production migration version: 20261025104222.
