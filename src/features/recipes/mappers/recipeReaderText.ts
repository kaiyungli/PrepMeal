// Presentation-only edits: preserve stored recipes and their reviewed fingerprints.
// Match known editorial phrases rather than removing arbitrary cooking guidance.
export function recipeReaderStep(text: string): string {
  return text
    .replaceAll('須補少量水並記錄實際用量', '逐少補水')
    .replaceAll('；本版不另改蛋水比例', '')
    .replaceAll('不再為試味另加超出材料表的生抽', '豆瓣醬和生抽已有鹹味，先試味，避免過鹹')
    .replaceAll('魚肉變白並容易分開後取出，倒走多餘魚水。', '確認魚柳最厚處中心熟透、魚肉容易分開後取出，倒走多餘魚水。')
    .replaceAll('小心翻面，再煎 1 至 2 分鐘至兩面金黃。', '小心翻面，再煎約1至2分鐘，至兩面金黃、中心蛋液完全凝固；時間按蛋餅厚度調整。');
}

export function recipeReaderGuidance(text: string): string {
  return text
    .replaceAll('本頁的湯不是另外的飯量', '主食份量另行計算')
    .replaceAll('全份350毫升水分前段少量炒番茄與後段煮湯使用，不在兩段各加一份。',
      '先從350毫升水中取少量煮番茄，再加入餘下的水煮湯；兩段用水合共350毫升。');
}
