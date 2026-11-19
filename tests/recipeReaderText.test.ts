import { describe, expect, it } from 'vitest';
import { recipeReaderStep, recipeReaderGuidance } from '@/features/recipes/mappers/recipeReaderText';

describe('reader-facing recipe steps', () => {
  it('keeps listed seasoning amounts explicit without altering unrelated recipes', () => {
    expect(recipeReaderStep('最後加入鹽約半茶匙和黑胡椒少許調味即可。', 'c33d2e50-6191-4830-8c20-368b188396e3')).toBe('最後加入材料表的鹽及黑胡椒調味。');
    expect(recipeReaderStep('最後加入鹽約半茶匙和黑胡椒少許調味即可。', 'unrelated')).toBe('最後加入鹽約半茶匙和黑胡椒少許調味即可。');
    expect(recipeReaderStep('吞拿魚瀝乾，與粟米粒和黑胡椒少許拌勻。', '8bb606da-1fa9-4a7b-b7c9-77a8c7286bce')).toBe('吞拿魚瀝乾，與粟米粒和材料表的黑胡椒拌勻。');
    expect(recipeReaderStep('吞拿魚瀝乾，與粟米粒和黑胡椒少許拌勻。', 'unrelated')).toBe('吞拿魚瀝乾，與粟米粒和黑胡椒少許拌勻。');
    expect(recipeReaderStep('雞蛋打入碗中，加入牛奶、鹽少許和黑椒少許，打至蛋白蛋黃完全混合。', '7a38108c-faf6-422c-b353-67581d940fb4')).toBe('雞蛋打入碗中，加入牛奶及材料表的鹽和黑胡椒，打至蛋白蛋黃完全混合。');
    expect(recipeReaderStep('雞蛋打入碗中，加入牛奶、鹽少許和黑椒少許，打至蛋白蛋黃完全混合。', 'unrelated')).toBe('雞蛋打入碗中，加入牛奶、鹽少許和黑椒少許，打至蛋白蛋黃完全混合。');
  });
  it('preserves fully-set egg instructions and table oil for tuna pancakes', () => {
    expect(recipeReaderStep('蛋剛熟仍滑嫩時立即上碟。', 'c987684d-6054-4a8e-8157-7634cbdda1e1')).toBe('蛋液完全凝固後立即上碟，避免久炒。');
    expect(recipeReaderStep('蛋剛熟仍滑嫩時立即上碟。', 'unrelated')).toBe('蛋剛熟仍滑嫩時立即上碟。');
    expect(recipeReaderStep('平底鑊加入少量油，中小火加熱。', '7bbaa915-bc87-4c6e-863c-206245a94af9')).toBe('平底鑊加入材料表的食油，中小火加熱。');
    expect(recipeReaderStep('平底鑊加入少量油，中小火加熱。', 'unrelated')).toBe('平底鑊加入少量油，中小火加熱。');
  });
  it('keeps functional rice and tray preparation while removing duplicate editorial prose', () => {
    expect(recipeReaderStep('米用約1000毫升水浸20分鐘瀝乾；同時雞絲拌生抽、糖、粟粉、紹酒及1/4茶匙油，雪櫃醃20分鐘。南瓜切1厘米粒、冬菇切片、蒜蔥切碎。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。', '07ae992e-ee0a-4002-b7b9-a8ec848d13da')).toBe('米用約1000毫升水浸20分鐘瀝乾；同時雞絲拌生抽、糖、粟粉、紹酒及1/4茶匙油，雪櫃醃20分鐘。南瓜切1厘米粒、冬菇切片、蒜蔥切碎。');
    expect(recipeReaderStep('米用約1000毫升水浸20分鐘瀝乾；同時雞絲拌生抽、糖、粟粉、紹酒及1/4茶匙油，雪櫃醃20分鐘。南瓜切1厘米粒、冬菇切片、蒜蔥切碎。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。', 'unrelated')).toBe('米用約1000毫升水浸20分鐘瀝乾；同時雞絲拌生抽、糖、粟粉、紹酒及1/4茶匙油，雪櫃醃20分鐘。南瓜切1厘米粒、冬菇切片、蒜蔥切碎。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。');
    expect(recipeReaderStep('魚柳用廚紙抹乾，放入焗盤。', 'dd1ee9ab-c33b-49e7-8fb0-769c6c908a69')).toBe('魚柳用廚紙抹乾備用。');
    expect(recipeReaderStep('魚柳用廚紙抹乾，放入焗盤。', 'unrelated')).toBe('魚柳用廚紙抹乾，放入焗盤。');
    expect(recipeReaderStep('焗爐預熱180°C；雞件抹乾，不清洗生雞。薯仔切約3厘米角，雞件與薯仔在深焗盤單層排好。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。', '5ac57672-0c3c-4eec-8976-2f219e4c54ae')).toBe('焗爐預熱180°C；雞件抹乾，不清洗生雞。薯仔切約3厘米角，雞件與薯仔在深焗盤單層排好。');
    expect(recipeReaderStep('焗爐預熱180°C；雞件抹乾，不清洗生雞。薯仔切約3厘米角，雞件與薯仔在深焗盤單層排好。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。', 'unrelated')).toBe('焗爐預熱180°C；雞件抹乾，不清洗生雞。薯仔切約3厘米角，雞件與薯仔在深焗盤單層排好。 份量按一人編定，選能容納材料的小型鍋具；湯汁煮食期間按蒸發量逐少補熱水，避免乾燒。');
  });
  it('removes audit prose without losing existing cooked-centre thresholds', () => {
    expect(recipeReaderStep('牛肉回鑊炒至全熟，河粉熱透，即可上碟；本版不另加洋蔥或黑椒。', 'b43272f4-41a7-49b9-92cd-a273435cbf92')).toBe('牛肉回鑊炒至全熟，河粉熱透，即可上碟。');
    expect(recipeReaderStep('牛肉回鑊炒至全熟，河粉熱透，即可上碟；本版不另加洋蔥或黑椒。', 'unrelated')).toBe('牛肉回鑊炒至全熟，河粉熱透，即可上碟；本版不另加洋蔥或黑椒。');
    expect(recipeReaderStep('用乾淨食物溫度計檢查最厚或重疊處的牛肉，中心達75°C並維持至少30秒。這是本稿採用的保守熟度標準，薄牛肉熟透後應及時取出，避免繼續久蒸變韌。', '78e61036-69dc-4e9e-af32-da9a2f526031')).toBe('用乾淨食物溫度計檢查最厚或重疊處的牛肉，中心達75°C並維持至少30秒。牛肉熟透後及時取出，避免久蒸變韌。');
    expect(recipeReaderStep('用乾淨食物溫度計檢查最厚或重疊處的牛肉，中心達75°C並維持至少30秒。這是本稿採用的保守熟度標準，薄牛肉熟透後應及時取出，避免繼續久蒸變韌。', 'unrelated')).toBe('用乾淨食物溫度計檢查最厚或重疊處的牛肉，中心達75°C並維持至少30秒。這是本稿採用的保守熟度標準，薄牛肉熟透後應及時取出，避免繼續久蒸變韌。');
    expect(recipeReaderStep('將蒸菜、豆腐、牛肉及盤汁配熟飯食用。沒有額外調味料；若另加生抽、油、蛋或改用肥牛，需另計營養。', '78e61036-69dc-4e9e-af32-da9a2f526031')).toBe('將蒸菜、豆腐、牛肉及盤汁配熟飯食用。');
    expect(recipeReaderStep('將蒸菜、豆腐、牛肉及盤汁配熟飯食用。沒有額外調味料；若另加生抽、油、蛋或改用肥牛，需另計營養。', 'unrelated')).toBe('將蒸菜、豆腐、牛肉及盤汁配熟飯食用。沒有額外調味料；若另加生抽、油、蛋或改用肥牛，需另計營養。');
    expect(recipeReaderStep('不用追求油炸硬殼或大面積燶黑；取出盛碟，全部為一人份，不另淋油。', '8c5a7274-16a5-492f-a7f3-1877c7ed9017')).toBe('取出盛碟，不另淋油。');
    expect(recipeReaderStep('不用追求油炸硬殼或大面積燶黑；取出盛碟，全部為一人份，不另淋油。', 'unrelated')).toBe('不用追求油炸硬殼或大面積燶黑；取出盛碟，全部為一人份，不另淋油。');
  });
  it('retains pasteurized-egg carbonara handling and useful cooking-water quantities', () => {
    expect(recipeReaderStep('必須使用經巴士德消毒的全蛋；去殼後與巴馬臣芝士拌勻，生蛋器具與即食食物分開。')).toBe('必須使用經巴士德消毒的全蛋；去殼後與巴馬臣芝士拌勻，生蛋器具與即食食物分開。');
    expect(recipeReaderStep('加入蛋芝士液，立即快速拌勻；這個做法不保證蛋液全熟，不能以普通生蛋代替。')).toBe('加入蛋芝士液，立即快速拌勻；這個做法不保證蛋液全熟，不能以普通生蛋代替。');
    expect(recipeReaderStep('加入全部300毫升水及1茶匙生抽，煮滾後蓋好轉中小火約10–12分鐘，至冬瓜半透明且可輕易刺入。')).toBe('加入全部300毫升水及1茶匙生抽，煮滾後蓋好轉中小火約10–12分鐘，至冬瓜半透明且可輕易刺入。');
  });
  it('naturalizes named pantry guidance without changing the specified ingredients', () => {
    expect(recipeReaderGuidance('午餐肉已有鹹味，本版不另加鹽；雞蛋須完全凝固後才上碟。')).toBe('午餐肉已有鹹味，毋須另加鹽；雞蛋完全凝固後才上碟。');
    expect(recipeReaderGuidance('吞拿魚與豆腐先瀝乾，餅糊才較容易定形，不必為吸水而隨意加大量生粉。')).toBe('吞拿魚與豆腐先瀝乾，餅糊才較容易定形；生粉按材料表用量加入。');
    expect(recipeReaderGuidance('本版用普通美式黃芥末醬，不把芥末籽醬或辣芥末直接當同一份量替代。')).toBe('使用普通美式黃芥末醬；芥末籽醬或辣芥末味道不同，不宜直接按相同份量替代。');
  });
  it('splits the listed lemon-butter fish pepper between seasoning and sauce only for that recipe', () => {
    const id = 'fe923544-02da-4eba-a61e-436366cf0d59';
    const first = '魚柳用廚紙抹乾，兩面灑少量鹽和黑胡椒。';
    expect(recipeReaderStep(first, id)).toBe('魚柳用廚紙抹乾，兩面灑上材料表的鹽及部分黑胡椒。');
    expect(recipeReaderStep('加入檸檬汁和少量黑椒，轉小火輕輕拌成醬汁。', id)).toBe('加入檸檬汁及餘下黑胡椒，轉小火輕輕拌成醬汁。');
    expect(recipeReaderStep(first, 'other')).toBe(first);
    const optionalGarlic = '如選用蒜頭，先切碎；平底鑊加入牛油，小火炒香蒜頭，未選用則直接煮溶牛油。';
    expect(recipeReaderStep(optionalGarlic, id)).toBe(optionalGarlic);
  });
  it('aligns tomato egg tofu oil and egg completion wording without changing the water amount', () => {
    const id = '4355baeb-12b9-483b-9d61-696fcdb505ab';
    expect(recipeReaderStep('鍋中加入少量油，中火炒番茄 2 分鐘至出汁。', id)).toBe('鍋中加入材料表的食油，中火炒番茄約2分鐘至出汁。');
    const end = '蛋液剛熟即關火，上碟即可。';
    expect(recipeReaderStep(end, id)).toBe('蛋液完全凝固後關火，上碟即可。');
    expect(recipeReaderStep(end, 'other')).toBe(end);
    const water = '加入豆腐和 2 湯匙水，輕輕推勻。';
    expect(recipeReaderStep(water, id)).toBe(water);
  });
  it('removes editorial exclusions while keeping potato pork oil split and cooking completion', () => {
    const id = '789c4dc7-e011-4813-8385-0da404e939e4';
    const prep = '豬肉碎備用，不另加鹽、白胡椒或未列出的醃料。';
    expect(recipeReaderStep(prep, id)).toBe('豬肉碎備用。');
    expect(recipeReaderStep(prep, 'other')).toBe(prep);
    expect(recipeReaderGuidance('一茶匙半油分兩段用，豬肉碎炒散至全熟才加蔥，不另添醃料或鹽。'))
      .toBe('一茶匙半油分兩次使用；豬肉碎炒散至全熟後，再加入蔥花。');
    const cooking = '加入生抽1茶匙、老抽半茶匙及糖1茶匙，炒至豬肉完全熟透、薯仔軟熟。';
    expect(recipeReaderStep(cooking, id)).toBe(cooking);
  });
  it('retains useful shrimp egg water allocation and the radish egg completion condition in natural tips', () => {
    expect(recipeReaderGuidance('45毫升水分成蛋液15毫升與鍋內30毫升，不在兩處各倒一次全份。'))
      .toBe('先取15毫升水拌入蛋液，餘下30毫升用來煮豆腐和蝦仁。');
    expect(recipeReaderGuidance('菜脯已有鹹味，本版不另加鹽；翻面後確認中心蛋液全熟才上碟。'))
      .toBe('菜脯已有鹹味，毋須另加鹽；翻面後確認中心蛋液全熟才上碟。');
    expect(recipeReaderGuidance('通菜瀝乾後快炒，腐乳汁已提供鹹味，不另加未列的鹽或生抽。'))
      .toBe('通菜瀝乾後快炒；腐乳已有鹹味，毋須再加鹽或生抽。');
  });
  it('matches salmon oil and celery garlic preparation to their ingredient tables only for those recipes', () => {
    const oil = '平底鑊加入少量油，中火加熱。';
    expect(recipeReaderStep(oil, '98324881-2f67-4fea-8c6b-95631c644f86')).toBe('平底鑊加入材料表的橄欖油，中火加熱。');
    expect(recipeReaderStep(oil, 'other')).toBe(oil);
    const garlic = '鑊中加入食油1茶匙及切碎的蒜頭，中火炒香。';
    expect(recipeReaderStep(garlic, '66129a6f-9968-4737-b2ae-68c4b0dd3821')).toBe('鑊中加入食油1茶匙及蒜片，中火炒香。');
    expect(recipeReaderStep(garlic, 'other')).toBe(garlic);
  });
  it('keeps teriyaki salmon as a fish dish without assigning an unlisted fixed rice portion', () => {
    const step = '三文魚剛熟後盛起，可配 180 克白飯食用。';
    expect(recipeReaderStep(step, '42cacc97-ca27-4bbf-8f30-9b284160e223')).toBe('三文魚熟透後盛起，按需要另配白飯。');
    expect(recipeReaderStep(step, 'other')).toBe(step);
  });
  it('keeps onion beef seasoning allocation and doneness while removing editorial exclusions', () => {
    const id = '68abae98-7609-4337-ab3b-4e4a6597bd76';
    expect(recipeReaderStep('牛肉切薄片，拌入生抽1茶匙及材料表的一部分黑胡椒，冷藏醃10分鐘；本版不加入生粉。', id))
      .toBe('牛肉切薄片，拌入生抽1茶匙及部分黑胡椒，冷藏醃約10分鐘。');
    expect(recipeReaderStep('加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；火太猛先調低，不另加未列出的醃料。', id))
      .toBe('加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；如火力太大，可先調低。');
    const safety = '繼續翻炒至牛肉完全熟透，中心達75°C並維持至少30秒後盛起；時間按肉片厚度調整。';
    expect(recipeReaderStep(safety, id)).toBe(safety);
    expect(recipeReaderGuidance('按材料表使用生抽、蠔油與黑胡椒；本版不額外加入未列出的蒜蓉或生粉。'))
      .toBe('生抽和黑胡椒分兩次加入，先用部分醃肉，餘下留待炒肉時與蠔油一同加入。');
  });
  it('preserves chicken-wing safety and the useful 120/15/105ml fish-sauce water split', () => {
    const wing = '加蓋續煮，時間按雞翼大小調整；以探針量度最厚肉位，避開骨頭，達75°C並維持30秒。';
    expect(recipeReaderStep(wing, 'af939a33-ebe9-4b4a-ae2d-07c46ba2331d')).toBe(wing);
    const water = '先從全份120毫升水中取15毫升冷水，拌勻1茶匙生粉留用；魚柳抹乾，拌入材料表的鹽和白胡椒。';
    expect(recipeReaderStep(water, '00049f07-c924-4c47-9a48-ff373b6c445b')).toBe(water);
    const rest = '小鍋加入粟米粒及餘下105毫升水，中火煮約3分鐘至粟米熱透。';
    expect(recipeReaderStep(rest, '00049f07-c924-4c47-9a48-ff373b6c445b')).toBe(rest);
  });
  it('allocates all black-pepper beef starch to marinating without adding a new slurry', () => {
    const step = '牛肉切片，用材料表所列的部分生抽、生粉及黑胡椒拌勻，醃10分鐘。';
    expect(recipeReaderStep(step, '6d9a3e2d-31d9-4621-aef0-856038c1373b'))
      .toBe('牛肉切片，加入材料表的全部生粉，以及部分生抽和黑胡椒拌勻，醃約10分鐘。');
    expect(recipeReaderStep(step, 'other')).toBe(step);
    expect(recipeReaderGuidance('生抽、生粉與黑胡椒先分出醃肉部分，餘下才在炒肉時加，不重複用全份。'))
      .toContain('生粉全部用來醃肉');
  });
  it('keeps pancake preparation in order and retains its existing doneness requirement', () => {
    const id = 'e45784b5-3593-4509-acc3-a2e02d3089b6';
    expect(recipeReaderStep('將豆腐、蛋液、蔥花和鹽少許放入碗中拌勻。', id)).toContain('材料表的鹽');
    expect(recipeReaderStep('如材料太濕，先把豆腐多餘水分瀝去，再與蛋液拌勻；不另加未列入材料表的生粉。', id))
      .toBe('豆腐須在拌入蛋液前瀝乾，較容易煎成形。');
    expect(recipeReaderStep('平底鑊加入少量油，中小火加熱。', id)).toContain('材料表的食油');
    const final = '小心翻面再煎約2至3分鐘，按厚度延長至中心蛋液全熟；食物中心達75°C並維持至少30秒後上碟。';
    expect(recipeReaderStep(final, id)).toBe(final);
  });
  it('ties the borscht seasoning wording to its stated ingredient amounts only for that recipe', () => {
    const step = '最後加入鹽少許和黑胡椒少許調味即可。';
    expect(recipeReaderStep(step, '52043e65-9e24-44a7-9434-dbc66ce36c02')).toBe('最後加入材料表的鹽及黑胡椒調味。');
    expect(recipeReaderStep(step, 'other-recipe')).toBe(step);
    expect(recipeReaderStep(step)).toBe(step);
  });
  it('preserves the approved approximate water amount in ginger-scallion tofu', () => {
    const step = '加入蔥綠、豉油、糖及約8毫升水，煮至冒泡約30秒。';
    expect(recipeReaderStep(step, '7975d3e4-6b85-428a-b7f0-8a9468d4302a')).toBe(step);
    expect(recipeReaderStep(step, 'other-recipe')).toBe(step);
  });
  it('keeps optional sugar and water guidance in natural reader-facing language', () => {
    expect(recipeReaderGuidance('糖是選配，不為去苦而無限加糖；鹽與水仍按材料表總量。'))
      .toBe('糖屬選配，可先試味再決定是否加入；鹽及水按材料表用量。');
    expect(recipeReaderGuidance('最多20毫升是選配水上限，不是每次必加；鹽按材料表調味，不再加生抽。'))
      .toBe('鑊內太乾時才逐少加入選配水，最多20毫升；按材料表加入鹽調味。');
  });
  it('uses the existing fish tip completion condition in the serving step', () => {
    expect(recipeReaderStep('魚肉變白並容易分開後取出，倒走多餘魚水。'))
      .toBe('確認魚柳最厚處中心熟透、魚肉容易分開後取出，倒走多餘魚水。');
  });
  it('keeps the egg cooking time range while clarifying that the centre must set', () => {
    expect(recipeReaderStep('小心翻面，再煎 1 至 2 分鐘至兩面金黃。'))
      .toBe('小心翻面，再煎約1至2分鐘，至兩面金黃、中心蛋液完全凝固；時間按蛋餅厚度調整。');
  });
  it('describes the water-only tomato preparation consistently and preserves its total', () => {
    expect(recipeReaderGuidance('全份350毫升水分前段少量炒番茄與後段煮湯使用，不在兩段各加一份。'))
      .toBe('先從350毫升水中取少量煮番茄，再加入餘下的水煮湯。');
  });
  it('clarifies separate staple portions without changing named dishes or unrelated copy', () => {
    expect(recipeReaderGuidance('可配「豉汁蒸排骨」與「蒜蓉生菜」，再按需要配主食；本頁的湯不是另外的飯量。'))
      .toBe('可配「豉汁蒸排骨」與「蒜蓉生菜」，再按需要配主食；主食份量另行計算。');
    expect(recipeReaderGuidance('全份120毫升水預留15毫升開生粉水。')).toBe('全份120毫升水預留15毫升開生粉水。');
  });
  it('keeps water adjustment and cooking safety without asking readers to keep an audit log', () => {
    const step = '中心達75°C並維持至少30秒。未熟便繼續加蓋煮；如水分不足，須補少量水並記錄實際用量，不能乾燒或只看表面顏色。';
    expect(recipeReaderStep(step)).toBe('中心達75°C並維持至少30秒。未熟便繼續加蓋煮；如水分不足，逐少補水，不能乾燒或只看表面顏色。');
  });
  it('preserves the exact egg and water quantities', () => {
    expect(recipeReaderStep('加入水120毫升及鹽1/8茶匙，攪拌均勻；本版不另改蛋水比例。'))
      .toBe('加入水120毫升及鹽1/8茶匙，攪拌均勻。');
  });
  it('explains the seasoning advice without changing the stated amount', () => {
    expect(recipeReaderStep('加入生抽1茶匙；不再為試味另加超出材料表的生抽。'))
      .toBe('加入生抽1茶匙；豆瓣醬和生抽已有鹹味，先試味，避免過鹹。');
  });
  it('preserves unrelated instructions and is idempotent', () => {
    const step = '保持小火；記錄實際用量以外的注意事項不應被刪除。';
    expect(recipeReaderStep(step)).toBe(step);
    const original = '如水分不足，須補少量水並記錄實際用量。';
    expect(recipeReaderStep(recipeReaderStep(original))).toBe(recipeReaderStep(original));
  });
});
