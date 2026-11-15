// Presentation-only edits: preserve stored recipes and their reviewed fingerprints.
// Match known editorial phrases rather than removing arbitrary cooking guidance.
export function recipeReaderStep(text: string, recipeId?: string | number): string {
  const copy = text
    .replaceAll('須補少量水並記錄實際用量', '逐少補水')
    .replaceAll('；本版不另改蛋水比例', '')
    .replaceAll('不再為試味另加超出材料表的生抽', '豆瓣醬和生抽已有鹹味，先試味，避免過鹹')
    .replaceAll('魚肉變白並容易分開後取出，倒走多餘魚水。', '確認魚柳最厚處中心熟透、魚肉容易分開後取出，倒走多餘魚水。')
    .replaceAll('小心翻面，再煎 1 至 2 分鐘至兩面金黃。', '小心翻面，再煎約1至2分鐘，至兩面金黃、中心蛋液完全凝固；時間按蛋餅厚度調整。');
  // Recipe-specific wording must not introduce instructions into unrelated dishes.
  if (recipeId === '52043e65-9e24-44a7-9434-dbc66ce36c02') {
    return copy.replaceAll('最後加入鹽少許和黑胡椒少許調味即可。', '最後加入材料表的鹽及黑胡椒調味。');
  }
  if (recipeId === '7975d3e4-6b85-428a-b7f0-8a9468d4302a') {
    return copy.replaceAll('豉油、糖及約8毫升水', '豉油、糖及材料表的清水');
  }
  return copy;
}

export function recipeReaderGuidance(text: string): string {
  return text
    .replaceAll('本頁的湯不是另外的飯量', '主食份量另行計算')
    .replaceAll('全份350毫升水分前段少量炒番茄與後段煮湯使用，不在兩段各加一份。',
      '先從350毫升水中取少量煮番茄，再加入餘下的水煮湯。')
    .replaceAll('糖是選配，不為去苦而無限加糖；鹽與水仍按材料表總量。',
      '糖屬選配，可先試味再決定是否加入；鹽及水按材料表用量。')
    .replaceAll('最多20毫升是選配水上限，不是每次必加；鹽按材料表調味，不再加生抽。',
      '鑊內太乾時才逐少加入選配水，最多20毫升；按材料表加入鹽調味。');
}
