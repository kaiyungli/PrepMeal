// Presentation-only edits: preserve stored recipes and their reviewed fingerprints.
// Match known editorial phrases rather than removing arbitrary cooking guidance.
export function recipeReaderStep(text: string): string {
  return text
    .replaceAll('須補少量水並記錄實際用量', '逐少補水')
    .replaceAll('；本版不另改蛋水比例', '')
    .replaceAll('不再為試味另加超出材料表的生抽', '豆瓣醬和生抽已有鹹味，先試味，避免過鹹');
}
