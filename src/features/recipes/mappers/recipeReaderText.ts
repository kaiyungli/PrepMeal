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
  if (recipeId === '98324881-2f67-4fea-8c6b-95631c644f86') {
    return copy.replaceAll('平底鑊加入少量油，中火加熱。', '平底鑊加入材料表的橄欖油，中火加熱。');
  }
  if (recipeId === '42cacc97-ca27-4bbf-8f30-9b284160e223') {
    return copy.replaceAll('三文魚剛熟後盛起，可配 180 克白飯食用。', '三文魚熟透後盛起，按需要另配白飯。');
  }
  if (recipeId === '66129a6f-9968-4737-b2ae-68c4b0dd3821') {
    return copy.replaceAll('鑊中加入食油1茶匙及切碎的蒜頭，中火炒香。', '鑊中加入食油1茶匙及蒜片，中火炒香。');
  }
  if (recipeId === '68abae98-7609-4337-ab3b-4e4a6597bd76') {
    return copy
      .replaceAll('牛肉切薄片，拌入生抽1茶匙及材料表的一部分黑胡椒，冷藏醃10分鐘；本版不加入生粉。',
        '牛肉切薄片，拌入生抽1茶匙及部分黑胡椒，冷藏醃約10分鐘。')
      .replaceAll('洋蔥切絲，材料表的食油及餘下生抽、蠔油備用；本版不加入蒜頭。',
        '洋蔥切絲，食油、餘下生抽及蠔油備用。')
      .replaceAll('加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；火太猛先調低，不另加未列出的醃料。',
        '加入餘下生抽1茶匙、蠔油1茶匙及餘下黑胡椒拌勻；如火力太大，可先調低。');
  }
  if (recipeId === '52043e65-9e24-44a7-9434-dbc66ce36c02') {
    return copy.replaceAll('最後加入鹽少許和黑胡椒少許調味即可。', '最後加入材料表的鹽及黑胡椒調味。');
  }
  if (recipeId === '6d9a3e2d-31d9-4621-aef0-856038c1373b') {
    return copy.replaceAll('牛肉切片，用材料表所列的部分生抽、生粉及黑胡椒拌勻，醃10分鐘。',
      '牛肉切片，加入材料表的全部生粉，以及部分生抽和黑胡椒拌勻，醃約10分鐘。');
  }
  if (recipeId === 'e45784b5-3593-4509-acc3-a2e02d3089b6') {
    return copy
      .replaceAll('將豆腐、蛋液、蔥花和鹽少許放入碗中拌勻。', '將豆腐、蛋液、蔥花和材料表的鹽放入碗中拌勻。')
      .replaceAll('如材料太濕，先把豆腐多餘水分瀝去，再與蛋液拌勻；不另加未列入材料表的生粉。',
        '豆腐須在拌入蛋液前瀝乾，較容易煎成形。')
      .replaceAll('平底鑊加入少量油，中小火加熱。', '平底鑊加入材料表的食油，中小火加熱。');
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
      '鑊內太乾時才逐少加入選配水，最多20毫升；按材料表加入鹽調味。')
    .replaceAll('生抽、生粉與黑胡椒先分出醃肉部分，餘下才在炒肉時加，不重複用全份。',
      '生粉全部用來醃肉；生抽和黑胡椒分兩次加入，先用部分醃肉，餘下留待炒肉時加入。')
    .replaceAll('牛肉前段轉色後仍須回鑊煮熟，鹽是選配，不在已有蠔油汁外再無限加鹽。',
      '牛肉回鑊後仍須煮熟；蠔油已有鹹味，先試味再決定是否加入選配鹽。')
    .replaceAll('按材料表使用生抽、蠔油與黑胡椒；本版不額外加入未列出的蒜蓉或生粉。',
      '生抽和黑胡椒分兩次加入，先用部分醃肉，餘下留待炒肉時與蠔油一同加入。');
}
