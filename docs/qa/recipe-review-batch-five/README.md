# Fifth recipe batch — reader copy review

Status: Draft for user review. No database writes, merge or deployment in this batch.
Desk review only; no test-cooking claim. Ten public recipe pages returned HTTP 200
on 2026-11-19. The branch starts from main `13db2bb5`.

## Ten reviewed recipes

| Recipe / slug | Review outcome |
| --- | --- |
| 味噌三文魚 / miso-salmon | Existing quantities, oven sequence and doneness tip retained |
| 煎三文魚 / pan-fried-salmon | Name the listed olive oil in the pan-heating step |
| 照燒三文魚 / teriyaki-salmon | Remove the unlisted fixed 180g rice serving; keep rice optional and separate |
| 蒜香雞翼 / garlic-chicken-wings | Keep preparation and existing temperature guidance; material uses 4 pieces while step uses 150g bone-in, possibly an existing unit conversion, not a confirmed defect |
| 照燒雞粒 / teriyaki-chicken-cubes-xhs | Existing seasoning, water and cooking steps retained |
| 牛肉炒洋蔥 / beef-onion-stir-fry | Remove repeated editorial exclusions; preserve split seasoning quantities, chilled marination and final doneness instruction |
| 肉碎蒸蛋 / minced-pork-steamed-egg | Existing 120ml water and meat/egg-centre doneness guidance retained |
| 紫菜蛋花湯 / seaweed-egg-drop-soup-xhs | Existing 300ml water, optional wash handling and fully-set egg instruction retained |
| 清炒西芹百合 / celery-lily-stir-fry | Change minced garlic in step to sliced garlic, matching ingredient preparation note |
| 粟米斑塊 / corn-fish-fillet-sauce | Keep useful 120ml total / 15ml slurry / 105ml corn-sauce split and existing fish/egg doneness instructions |

## Exact copy changes

These are presentation-only exact-phrase replacements. Recipe data, ingredient
quantities, nutrition and editorial fingerprints remain unchanged. Step edits
are scoped to recipe IDs. The existing common pairing rules are unchanged.

| Recipe / field | Before | After |
| --- | --- | --- |
| 煎三文魚 step | 平底鑊加入少量油，中火加熱。 | 平底鑊加入材料表的橄欖油，中火加熱。 |
| 照燒三文魚 step | 三文魚剛熟後盛起，可配 180 克白飯食用。 | 三文魚熟透後盛起，按需要另配白飯。 |
| 清炒西芹百合 step | 鑊中加入食油1茶匙及切碎的蒜頭，中火炒香。 | 鑊中加入食油1茶匙及蒜片，中火炒香。 |
| 牛肉炒洋蔥 step | 牛肉切薄片，拌入生抽1茶匙及材料表的一部分黑胡椒，冷藏醃10分鐘；本版不加入生粉。 | 牛肉切薄片，拌入生抽1茶匙及部分黑胡椒，冷藏醃約10分鐘。 |
| 牛肉炒洋蔥 step | 洋蔥切絲，材料表的食油及餘下生抽、蠔油備用；本版不加入蒜頭。 | 洋蔥切絲，食油、餘下生抽及蠔油備用。 |
| 牛肉炒洋蔥 step | 加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；火太猛先調低，不另加未列出的醃料。 | 加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；如火力太大，可先調低。 |
| 牛肉炒洋蔥 tip | 按材料表使用生抽、蠔油與黑胡椒；本版不額外加入未列出的蒜蓉或生粉。 | 生抽和黑胡椒分兩次加入，先用部分醃肉，餘下留待炒肉時與蠔油一同加入。 |

No confirmed issue requiring a hosted data update was found in this scoped
review. The chicken-wing piece/weight relationship is recorded for any future
quantity-basis audit, without inventing a new conversion or changing the recipe.

## Validation scope

- Reader-copy unit tests cover recipe scoping, unlisted rice portion removal,
  preserved seasoning allocation, retained doneness and the unchanged useful
  corn-sauce water split.
- Existing SSR suite adds assertions for the four changed recipes, including
  absence of removed editorial exclusions and retained safety wording.
- Independent parent code review and final checks are recorded in the PR.
- Remote Preview, physical cooking, physical mobile and cross-browser tests
  are not claimed by this desk review.
