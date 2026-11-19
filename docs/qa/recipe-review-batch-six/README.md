# Sixth recipe batch — reader copy review

Draft user-review batch added to PR183. Ten public recipe pages returned HTTP
200 on 2026-11-19. Desk review only; no test-cooking, database write, merge or
deployment in this batch. Batch five remains unchanged.

## Review scope

| Recipe / slug | Outcome |
| --- | --- |
| 蒜香蝦仁 / garlic-shrimp-xhs | Existing quantities and shrimp-centre completion guidance retained |
| 蒜蓉通菜 / garlic-water-spinach | Existing preparation, water and cooking sequence retained |
| 洋蔥豬扒 / onion-pork-chop | Existing quantities and explicit handling of marinade that touched raw pork retained |
| 滑蛋蝦仁豆腐煲 / shrimp-egg-tofu-pot | Naturalize the useful 15ml/30ml water allocation tip; keep steps and total45ml |
| 番茄滑蛋豆腐煲 / tomato-egg-tofu-pot | Tie oil to listed amount; align serving step with existing fully-set egg tip |
| 薯仔炒肉碎 / minced-pork-potato | Remove editorial exclusions; keep oil split and full pork/potato completion |
| 薯仔炆雞翼 / potato-braised-chicken-wings | Existing preparation,180ml water and probe/doneness guidance retained |
| 腐乳通菜 / fermented-beancurd-water-spinach | Naturalize existing no-additional-salt advice |
| 菜脯煎蛋 / preserved-radish-omelette | Remove「本版」while retaining existing salt and egg-completion advice |
| 檸檬牛油魚柳 / lemon-butter-fish-fillet | Explicitly split the listed black pepper between fish and sauce |

## Exact before/after copy

| Recipe / field | Before | After |
| --- | --- | --- |
| 檸檬牛油魚柳 step | 魚柳用廚紙抹乾，兩面灑少量鹽和黑胡椒。 | 魚柳用廚紙抹乾，兩面灑上材料表的鹽及部分黑胡椒。 |
| 檸檬牛油魚柳 step | 加入檸檬汁和少量黑椒，轉小火輕輕拌成醬汁。 | 加入檸檬汁及餘下黑胡椒，轉小火輕輕拌成醬汁。 |
| 番茄滑蛋豆腐煲 step | 鍋中加入少量油，中火炒番茄 2 分鐘至出汁。 | 鍋中加入材料表的食油，中火炒番茄約2分鐘至出汁。 |
| 番茄滑蛋豆腐煲 step | 蛋液剛熟即關火，上碟即可。 | 蛋液完全凝固後關火，上碟即可。 |
| 薯仔炒肉碎 step | 豬肉碎備用，不另加鹽、白胡椒或未列出的醃料。 | 豬肉碎備用。 |
| 滑蛋蝦仁豆腐煲 tip | 45毫升水分成蛋液15毫升與鍋內30毫升，不在兩處各倒一次全份。 | 先取15毫升水拌入蛋液，餘下30毫升用來煮豆腐和蝦仁。 |
| 薯仔炒肉碎 tip | 一茶匙半油分兩段用，豬肉碎炒散至全熟才加蔥，不另添醃料或鹽。 | 一茶匙半油分兩次使用；豬肉碎炒散至全熟後，再加入蔥花。 |
| 腐乳通菜 tip | 通菜瀝乾後快炒，腐乳汁已提供鹹味，不另加未列的鹽或生抽。 | 通菜瀝乾後快炒；腐乳已有鹹味，毋須再加鹽或生抽。 |
| 菜脯煎蛋 tip | 菜脯已有鹹味，本版不另加鹽；翻面後確認中心蛋液全熟才上碟。 | 菜脯已有鹹味，毋須另加鹽；翻面後確認中心蛋液全熟才上碟。 |

Presentation-only exact-phrase edits; step changes are recipe-ID scoped.
Stored quantities, recipe data, nutrition and editorial fingerprints remain
unchanged. Existing common pairing rules are untouched. No confirmed hosted
data repair is proposed by this batch.

## Verification

Reader-copy regressions cover pepper allocation and recipe scoping, retained
optional garlic, listed oil, egg completion, unchanged two-tablespoon water,
pork cooking completion, oil split and useful shrimp water allocation. The
303-recipe SSR suite checks all six changed recipes' output and preserved
conditions. Final test results and independent parent review are recorded in
the PR. Remote Preview, physical mobile, cross-browser and cooking trials are
not claimed by this desk review.
