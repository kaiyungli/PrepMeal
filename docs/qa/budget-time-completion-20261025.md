# Recipe budget and time completion — 2026-10-25

47 public recipes reviewed:31 missing budget tiers and16 missing preparation/cooking time pairs; these groups do not overlap. All existing total durations are retained.

Budget is the existing qualitative editorial tier (budget/normal/premium), not a monetary quote, price scrape or market-price guarantee. Small-portion egg/tofu/vegetable/mince/pantry dishes are budget; full meat/fish/shellfish portions and specialty salted-fish patties are normal. Comparisons include existing 麻婆豆腐 / 蒸肉餅 (budget), 青椒牛肉 / 蒜香豬扒粒 / 蜜糖雞翼 / 粟米魚柳飯 (normal). No missing recipe is forced into premium solely for containing seafood.

Time estimates are reviewed from the actual sequence of preparation, marination/chilling, heating and cooking. Do not sum timer fields blindly: some tasks overlap. Preparation includes explicitly stated marination/chilling; cooking includes preheating/boiling and finishing. Frozen ingredients are assumed thawed. Rice dishes use the listed cooked rice; thawing and cooking raw rice separately are not included. Beef tenderness can require longer simmering. Public notes explain these limits. No kitchen timing has been performed.

| Recipe | Budget | Prep | Cook | Total |
|---|---|---:|---:|---:|
| 青瓜炒蛋 | budget | 5 | 6 | 11 |
| 蒜蓉通菜 | budget | 8 | 5 | 13 |
| 洋蔥炒雞扒 | normal | 8 | 10 | 18 |
| 涼瓜煎蛋 | budget | 8 | 7 | 15 |
| 腐乳通菜 | budget | 8 | 5 | 13 |
| 京都骨 | normal | 15 | 20 | 35 |
| 豉汁蒸排骨 | normal | 15 | 20 | 35 |
| 清炒節瓜 | budget | 3 | 7 | 10 |
| 蒜香豬扒粒 | normal | 15 | 10 | 25 |
| 清炒西芹百合 | budget | 4 | 6 | 10 |
| 蜜糖雞翼 | normal | 20 | 15 | 35 |
| 香煎帶子 | premium | 5 | 10 | 15 |
| 餐蛋公仔麵 | budget | 5 | 8 | 13 |
| 鹹魚蒸肉餅 | normal | 15 | 12 | 27 |
| 肉碎豆腐 | budget | 8 | 10 | 18 |
| 蒜香茄子 | budget | 8 | 10 | 18 |
| 涼拌青瓜粉絲 | budget | 20 | 5 | 25 |
| 肉碎粉絲煲 | budget | 10 | 15 | 25 |
| 粟米斑塊 | normal | 10 | 12 | 22 |
| 上湯娃娃菜 | budget | 5 | 10 | 15 |
| 上湯浸菠菜 | budget | 3 | 7 | 10 |
| 咕嚕肉 | normal | 15 | 18 | 33 |
| 洋蔥炒蛋 | budget | 5 | 6 | 11 |
| 午餐肉炒蛋 | budget | 5 | 6 | 11 |
| 生炒骨 | normal | 15 | 20 | 35 |
| 白汁海鮮飯 | premium | 5 | 15 | 20 |
| 蠔油西蘭花 | budget | 3 | 7 | 10 |
| 豉油皇炒芽菜 | budget | 5 | 5 | 10 |
| 西多士配炒蛋 | budget | 5 | 10 | 15 |
| 鮮茄豬扒飯 | normal | 15 | 15 | 30 |
| 粟米魚柳飯 | normal | 8 | 12 | 20 |
| 蒜片牛肉粒 | normal | 8 | 8 | 16 |
| 蝦米粉絲紹菜 | budget | 10 | 12 | 22 |
| 椒鹽豆腐 | budget | 10 | 10 | 20 |
| 咖哩牛腩飯 | normal | 10 | 80 | 90 |
| 豆豉鯪魚炒油麥菜 | budget | 8 | 7 | 15 |
| 肉碎蒸蛋 | budget | 10 | 12 | 22 |
| 番茄薯仔肉碎 | budget | 10 | 18 | 28 |
| 豉椒炒蜆 | normal | 15 | 8 | 23 |
| 洋蔥豬扒 | normal | 10 | 12 | 22 |
| 粟米肉碎 | budget | 8 | 10 | 18 |
| 涼瓜炒牛肉 | normal | 12 | 8 | 20 |
| 青椒炒蛋 | budget | 5 | 6 | 11 |
| 菜脯煎蛋 | budget | 5 | 6 | 11 |
| 豆角炒蛋 | budget | 8 | 7 | 15 |
| 薯仔炆雞翼 | normal | 10 | 20 | 30 |
| 蒜蓉蒸南瓜 | budget | 5 | 15 | 20 |

Validation: 2,221 unit tests and175 component tests passed; TypeScript, ESLint and whitespace checks passed. PGlite covers exact completion/preservation, rollback and replay rejection, and generation budget preferences. Production migration20261025122255 succeeded: all47 target fields, existing nutrition evidence and public notes match, while all288 public recipes/images remain. Missing budget tiers and missing prep/cook breakdowns are both zero.
