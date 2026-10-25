# Legacy recipe nutrition evidence — 2026-10-25

Reviewed 156 public recipes without the standard nutrition evidence object. All recipe IDs, ingredient identities and quantities, approved images, primary protein, protein arrays and flavor tags are preserved. Added notes distinguish dry/wet and edible/purchased weights; the wet-wood-ear preparation is clarified to match its 120g input.

- 153 recipes receive newly calculated reference-based input estimates.
- Three unsupported bone-soup totals are withheld (null), not zero: 菜乾豬骨湯, 西洋菜陳腎湯, 粟米紅蘿蔔豬骨湯. Their meat yields, final broth quantities and consumed portions are unknown; dried cabbage / preserved gizzard also lack suitable preparation evidence. Existing unverified totals cannot be recovered by multiplying bone purchase weight by a generic meat table.
- Removed 40 existing nutrition claims that are unsupported after recalculation or withholding. No new nutrition claims are added. Other dietary tags are preserved.

Primary evidence: USDA FDC profiles verified in earlier catalog work; newly retrieved USDA Standard Reference28 ASCII tables (2015 release); current TFDA official food-composition download, with food IDs, preparation descriptions, refusal percentages and raw macro cells preserved; explicit reference manufacturer labels for selected sauces. The registry stores each exact source/version. Reused references remain labelled as prior verification rather than falsely claimed to have been downloaded again.

The author/original-recipe evidence is a separate issue. This batch does not recover original recipes, conduct kitchen tests or validate finished-food lab nutrition. All outputs are estimates and limits are exposed in recipe provenance.

Calculation contract:

- One person per recipe, as the stored base_servings records specify. Sum all mandatory edible inputs; optional items are excluded and listed separately.
- Count all added oil and coating starch as consumed. No guessed frying absorption or sauce leftovers. This can overestimate actual consumed energy.
- Rice, pasta, rice vermicelli and glass noodles use dry input weights; cooked rice, wet wide noodles, chilled rice cakes and wet udon use the stated wet/cooked basis. Wet wood ear and kelp are never treated as dry weights.
- Pork ribs use TFDA I0304301 edible fraction59.1%; shell-on clams use J3101001 edible fraction24.5%. These sample yields are proxies, not actual weighings. Boneless chops/thighs and fillets use edible raw input weights.
- Count ingredients use disclosed reference masses: eggs50g; middle wings20g edible/unit (TFDA two-section-wing proxy); frozen scallops13g/unit; salted duck egg61g edible/unit; fuyu16g/unit; white bread29g/slice; lime44g juice/fruit. Actual sizes vary.
- An unspecified instant noodle cake is explicitly modelled as70g without the optional seasoning packet. Unspecified dressing uses a French-dressing reference. Unspecified seafood blend uses equal raw edible weights of shrimp/squid/clam. Unspecified spice blends and some spoon masses are clearly labelled editorial approximations.
- Liquids use approximate1g/ml unless the source is explicitly per100ml (dark soy). No per100ml label is silently treated as per100g.
- Decimal arithmetic; half-up rounding to whole kcal and one decimal place for macros. Sodium, micronutrients, cooking retention and finished-food weight are outside this batch.

Several old low energy totals are inconsistent with the stored cream/oil/rice quantities. This batch changes the estimate, not the ingredient portions. For example, the 80–100ml cream pasta recipes use the specified heavy-cream reference and disclose that lower-fat cooking cream will differ.

| Recipe | Previous kcal | New kcal | Notes |
|---|---:|---:|---|
| 蒜香牛油蝦意粉 | 500 | 595 | reference estimate |
| 紅咖哩雞 | 430 | 670 | reference estimate |
| 泰式雞絲炒米粉 | 500 | 553 | reference estimate |
| 蒜蓉通菜 | 120 | 172 | reference estimate |
| 洋蔥炒雞扒 | 390 | 544 | reference estimate |
| 番茄肉醬意粉 | 560 | 708 | reference estimate |
| 青瓜炒蛋 | 220 | 287 | reference estimate |
| 涼瓜煎蛋 | 250 | 286 | reference estimate |
| 腐乳通菜 | 150 | 193 | reference estimate |
| 京都骨 | 560 | 719 | reference estimate |
| 豉汁蒸排骨 | 430 | 411 | reference estimate |
| 蛋炒飯 | 420 | 393 | reference estimate |
| 清炒節瓜 | 110 | 85 | reference estimate |
| 南瓜濃湯 | 220 | 573 | reference estimate |
| 咖哩雞 | 420 | 361 | reference estimate |
| 冬瓜蝦米湯 | 95 | 54 | reference estimate |
| 蠔油生菜 | 85 | 106 | reference estimate |
| 白汁蘑菇雞扒意粉 | 540 | 942 | reference estimate |
| 蒸肉餅 | 300 | 313 | reference estimate |
| 涼拌青瓜粉絲 | 150 | 200 | reference estimate |
| 焗豬扒飯 | 650 | 790 | reference estimate |
| 白汁雞肉意粉 | 560 | 888 | reference estimate |
| 牛油蘑菇意粉 | 460 | 553 | reference estimate |
| 青咖哩雞 | 420 | 676 | reference estimate |
| 粟米斑塊 | 360 | 439 | reference estimate |
| 肉碎粉絲煲 | 420 | 450 | reference estimate |
| 上湯娃娃菜 | 120 | 97 | reference estimate |
| 上湯浸菠菜 | 100 | 105 | reference estimate |
| 麻婆豆腐 | 250 | 347 | reference estimate |
| 上海炒年糕 | 480 | 633 | reference estimate |
| 咕嚕肉 | 520 | 695 | reference estimate |
| 洋蔥炒蛋 | 240 | 309 | reference estimate |
| 雜菜炒烏冬 | 430 | 411 | reference estimate |
| 青醬雜菜意粉 | 480 | 639 | reference estimate |
| 涼拌番茄 | 60 | 49 | reference estimate |
| 照燒三文魚 | 390 | 497 | reference estimate |
| 牛油煎蝦 | 260 | 272 | reference estimate |
| 午餐肉炒蛋 | 360 | 438 | reference estimate |
| 生炒骨 | 540 | 728 | reference estimate |
| 番茄蛋花湯 | 120 | 134 | reference estimate |
| 羅勒番茄雞肉燴飯 | 520 | 766 | reference estimate |
| 豉汁蒸魚柳 | 220 | 261 | reference estimate |
| 白汁海鮮飯 | 680 | 757 | reference estimate |
| 吞拿魚粟米焗薯 | 450 | 537 | reference estimate |
| 雞胸沙律 | 320 | 335 | reference estimate |
| 焗雞扒飯 | 620 | 867 | reference estimate |
| 忌廉蘑菇湯 | 240 | 522 | reference estimate |
| 豬肉炒椰菜 | 320 | 333 | reference estimate |
| 韓式辣炒雞 | 380 | 567 | reference estimate |
| 蒜香豬扒粒 | 280 | 334 | reference estimate |
| 番茄豆腐 | 160 | 331 | reference estimate |
| 照燒雞扒 | 390 | 478 | reference estimate |
| 番茄豆腐燴飯 | 420 | 449 | reference estimate |
| 白灼蝦 | 180 | 164 | reference estimate |
| 牛肉炒洋蔥 | 310 | 334 | reference estimate |
| 菜乾豬骨湯 | 180 | withheld | insufficient evidence |
| 西洋菜陳腎湯 | 170 | withheld | insufficient evidence |
| 清炒西芹百合 | 110 | 143 | reference estimate |
| 日式親子丼 | 630 | 586 | reference estimate |
| 蠔油西蘭花 | 130 | 115 | reference estimate |
| 蜜糖雞翼 | 320 | 250 | reference estimate |
| 白蘿蔔牛肉湯 | 180 | 151 | reference estimate |
| 紫菜蛋花湯 | 90 | 83 | reference estimate |
| 粟米蛋花湯 | 130 | 202 | reference estimate |
| 節瓜鹹蛋湯 | 140 | 133 | reference estimate |
| 泰式炒河粉（雞肉） | 540 | 528 | reference estimate |
| 泰式菠蘿炒飯 | 510 | 522 | reference estimate |
| 羅宋湯 | 260 | 416 | reference estimate |
| 涼拌青瓜 | 70 | 104 | reference estimate |
| 蕃茄炒蛋 | 180 | 211 | reference estimate |
| 梅菜蒸肉餅 | 320 | 420 | reference estimate |
| 香煎鯛魚柳 | 240 | 278 | reference estimate |
| 煎三文魚 | 360 | 497 | reference estimate |
| 泰式香煎魚柳 | 250 | 231 | reference estimate |
| 茄汁煮魚柳 | 250 | 280 | reference estimate |
| 照燒雞粒 | 300 | 253 | reference estimate |
| 番茄滑蛋豆腐煲 | 230 | 240 | reference estimate |
| 韓式泡菜炒飯 | 370 | 360 | reference estimate |
| 打拋豬飯 | 520 | 576 | reference estimate |
| 吞拿魚豆腐蛋餅 | 310 | 360 | reference estimate |
| 泰式檸檬蒸魚柳 | 220 | 193 | reference estimate |
| 豉油皇炒芽菜 | 120 | 114 | reference estimate |
| 雜菜蛋炒飯 | 430 | 543 | reference estimate |
| 西多士配炒蛋 | 500 | 387 | reference estimate |
| 鮮茄豬扒飯 | 620 | 622 | reference estimate |
| 粟米魚柳飯 | 580 | 529 | reference estimate |
| 照燒豆腐丼 | 410 | 432 | reference estimate |
| 香煎帶子 | 220 | 115 | reference estimate |
| 韓式泡菜滑蛋豆腐 | 260 | 221 | reference estimate |
| 脆脆薯仔餅 | 300 | 380 | reference estimate |
| 韓式泡菜豆腐湯 | 170 | 111 | reference estimate |
| 味噌豆腐湯 | 120 | 140 | reference estimate |
| 蒜片牛肉粒 | 380 | 346 | reference estimate |
| 蝦米粉絲紹菜 | 280 | 265 | reference estimate |
| 椒鹽豆腐 | 300 | 512 | reference estimate |
| 酸辣薯仔絲 | 120 | 220 | reference estimate |
| 咖哩牛腩飯 | 650 | 864 | reference estimate |
| 節瓜瘦肉湯 | 160 | 170 | reference estimate |
| 粟米紅蘿蔔豬骨湯 | 180 | withheld | insufficient evidence |
| 滑蛋牛肉 | 320 | 373 | reference estimate |
| 肉碎蒸蛋 | 330 | 340 | reference estimate |
| 番茄薯仔肉碎 | 390 | 380 | reference estimate |
| 豉椒炒蜆 | 280 | 210 | reference estimate |
| 洋蔥豬扒 | 440 | 458 | reference estimate |
| 蝦仁豆腐蒸蛋 | 220 | 209 | reference estimate |
| 粟米肉碎 | 350 | 420 | reference estimate |
| 涼瓜炒牛肉 | 360 | 341 | reference estimate |
| 奄列 | 220 | 306 | reference estimate |
| 青椒炒蛋 | 250 | 287 | reference estimate |
| 菜脯煎蛋 | 260 | 285 | reference estimate |
| 西蘭花蝦仁蒸蛋 | 210 | 158 | reference estimate |
| 豆腐蛋餅 | 230 | 235 | reference estimate |
| 豆角炒蛋 | 260 | 311 | reference estimate |
| 薯仔炆雞翼 | 460 | 342 | reference estimate |
| 蔥花煎蛋 | 180 | 220 | reference estimate |
| 蒜香蝦仁 | 220 | 193 | reference estimate |
| 焗芝士肉醬千層茄子 | 460 | 501 | reference estimate |
| 香煎雞胸配蒜香雜菜 | 360 | 372 | reference estimate |
| 雞扒飯 | 560 | 701 | reference estimate |
| 蒜香牛肉粒 | 360 | 284 | reference estimate |
| 蒜香雞胸 | 300 | 300 | reference estimate |
| 日式咖哩雜菜飯 | 520 | 595 | reference estimate |
| 焗雜菜千層茄子 | 360 | 420 | reference estimate |
| 黑椒牛柳粒配薯蓉 | 520 | 498 | reference estimate |
| 餐蛋公仔麵 | 610 | 646 | reference estimate |
| 忌廉菠菜蘑菇雞肉飯 | 560 | 844 | reference estimate |
| 蒜香雞肉意粉 | 520 | 710 | reference estimate |
| 香煎豬扒配蘋果洋蔥汁 | 480 | 414 | reference estimate |
| 蒜蓉蒸南瓜 | 140 | 182 | reference estimate |
| 鹹魚蒸肉餅 | 420 | 402 | reference estimate |
| 雞粥 | 320 | 457 | reference estimate |
| 蝦仁炒蛋 | 260 | 423 | reference estimate |
| 味噌焗魚柳 | 250 | 256 | reference estimate |
| 蘑菇忌廉意粉 | 500 | 919 | reference estimate |
| 滑蛋蝦仁 | 280 | 284 | reference estimate |
| 涼拌木耳 | 80 | 88 | reference estimate |
| 蒜蓉豆苗 | 90 | 129 | reference estimate |
| 涼拌秋葵 | 70 | 118 | reference estimate |
| 肉碎豆腐 | 360 | 404 | reference estimate |
| 番茄薯仔魚湯 | 210 | 323 | reference estimate |
| 香煎杏鮑菇 | 100 | 122 | reference estimate |
| 清炒芥蘭 | 80 | 115 | reference estimate |
| 雞絲炒米粉 | 500 | 560 | reference estimate |
| 檸檬牛油魚柳 | 260 | 241 | reference estimate |
| 星洲炒米 | 520 | 617 | reference estimate |
| 清蒸魚柳 | 220 | 187 | reference estimate |
| 菠菜豆腐湯 | 110 | 121 | reference estimate |
| 味噌三文魚 | 380 | 467 | reference estimate |
| 海帶豆腐湯 | 115 | 115 | reference estimate |
| 蒜蓉金針菇 | 60 | 144 | reference estimate |
| 蒜香茄子 | 210 | 207 | reference estimate |
| 番茄魚片湯 | 180 | 141 | reference estimate |
| 香煎雞胸（簡易版） | 280 | 273 | reference estimate |
| 香草煎鱈魚 | 270 | 166 | reference estimate |
| 黑椒牛肉片 | 340 | 252 | reference estimate |
| 涼拌娃娃菜 | 90 | 77 | reference estimate |

39 recipe diet arrays lose 40 unsupported nutritional claims. Added 36 ingredient notes without changing quantities, and clarified one wet-wood-ear preparation step.

Production migration 20261025112800 applied successfully. Every one of the156 recipe snapshots, ingredient identities/quantities/notes and preparation steps matches the audited outcome (zero mismatches). 2,217 unit tests and175 component tests passed; TypeScript, ESLint and whitespace checks passed. All288 public recipes and approved images are retained.
