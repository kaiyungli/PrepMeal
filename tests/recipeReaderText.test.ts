import { describe, expect, it } from 'vitest';
import { recipeReaderStep, recipeReaderGuidance } from '@/features/recipes/mappers/recipeReaderText';

describe('reader-facing recipe steps', () => {
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
