import { describe, expect, it } from 'vitest';
import { recipeReaderStep, recipeReaderGuidance } from '@/features/recipes/mappers/recipeReaderText';

describe('reader-facing recipe steps', () => {
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
