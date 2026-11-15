// Reviewed named pairings for three ten-recipe editorial batches (one soup has no named dish).
// Immutable IDs resolve through the public catalogue, including after slug changes.
// Exact copy matching prevents a future editorial change from using stale pairings.
export const REVIEWED_RECIPE_PAIRINGS: Record<string, { suggestion: string; recipeIds: string[] }> = {
  "91132717-231d-4916-81ee-5e886b5ffd16": {
    "suggestion": "可配蒜蓉西蘭花及白飯；蛋已在這道菜內，不必為湊菜數再加一道蛋菜。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "709f465d-f8db-439f-a76b-1991283aa424": {
    "suggestion": "可配豉汁蒸排骨及一份蔬菜；想簡單一點，也可配白飯及蔬菜。",
    "recipeIds": [
      "68c07822-4ff1-41fb-a225-735dea948702"
    ]
  },
  "24a17129-1fb6-4168-9f0a-4239b45a1dcb": {
    "suggestion": "可配「蒜蓉西蘭花」及白飯；如要加湯，可選「菠菜豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b",
      "c5ba657e-15c2-4d48-9d33-bfc70ead04e9"
    ]
  },
  "5ada5229-ef1e-4931-841b-436db62c8943": {
    "suggestion": "可配蠔油生菜及白飯；這道菜已有豬肉和豆腐，可按整餐需要決定是否另加肉菜。",
    "recipeIds": [
      "86dd6cd9-46c7-431e-a671-5516b0558286"
    ]
  },
  "68c07822-4ff1-41fb-a225-735dea948702": {
    "suggestion": "可配蒜蓉西蘭花及白飯；配菜選清淡做法，較容易與豉汁味道配合。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "147d483b-7b07-4f47-8fa8-5312423a27da": {
    "suggestion": "可配蠔油生菜及白飯；雞翼醬汁已有甜味，不必再配另一道蜜汁菜。",
    "recipeIds": [
      "86dd6cd9-46c7-431e-a671-5516b0558286"
    ]
  },
  "fb489d22-6358-40d3-ab88-8bb362258d46": {
    "suggestion": "可配蒜蓉西蘭花及白飯；白飯另計，不包含在雞扒的一人份材料內。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "1007e867-9dc6-44ab-868e-46b297f4710b": {
    "suggestion": "可配照燒雞扒及白飯；也可與肉碎豆腐配成一餐。",
    "recipeIds": [
      "fb489d22-6358-40d3-ab88-8bb362258d46",
      "5ada5229-ef1e-4931-841b-436db62c8943"
    ]
  },
  "29f64d43-dd17-4428-8708-445c8ecf6cd3": {
    "suggestion": "可配蒜蓉西蘭花；如想加湯，可選不重複雞蛋的蔬菜清湯。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "86dd6cd9-46c7-431e-a671-5516b0558286": {
    "suggestion": "可配豉汁蒸排骨或肉碎豆腐，再按需要配白飯。",
    "recipeIds": [
      "68c07822-4ff1-41fb-a225-735dea948702",
      "5ada5229-ef1e-4931-841b-436db62c8943"
    ]
  },
  "1f18bcb4-3f67-4db7-b7be-2e56501952e4": {
    "suggestion": "可配「清炒椰菜」及白飯；如要加湯，可選「菠菜豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "2aaec965-feb8-4b14-a62a-5633ab8ceb19",
      "c5ba657e-15c2-4d48-9d33-bfc70ead04e9"
    ]
  },
  "c8307f45-9b0c-47e9-b540-67ba64c4a239": {
    "suggestion": "這道菜已有薯仔，可配「清炒芥蘭」；其他主食按整餐份量安排。",
    "recipeIds": [
      "19ccf93b-df76-400a-b8a5-9fc4f9ccd25e"
    ]
  },
  "abe99804-e55c-4db9-a2bf-a1c2eb78bc61": {
    "suggestion": "可配「蒸水蛋」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424"
    ]
  },
  "884c47af-bb79-435c-a4ec-21151721833a": {
    "suggestion": "可配「薑蔥豉油蒸豆腐（簡易版）」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "7975d3e4-6b85-428a-b7f0-8a9468d4302a"
    ]
  },
  "a869d6e3-1079-4dd8-a519-eb601216421c": {
    "suggestion": "可配「豆腐雞蛋白菜卷」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "78974fcd-ba79-402e-b6aa-2e0572c708e8"
    ]
  },
  "bb681471-3c7b-472d-936a-e834eac6bc1f": {
    "suggestion": "可配「蒜蓉生菜」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "201affc0-a59d-4012-9656-346d4a1d5fff",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  },
  "116a305a-d4ad-48a8-8862-a5a467d0b914": {
    "suggestion": "可配「豉汁蒸排骨」與「蒜蓉生菜」，再按需要配主食；本頁的湯不是另外的飯量。",
    "recipeIds": [
      "68c07822-4ff1-41fb-a225-735dea948702",
      "201affc0-a59d-4012-9656-346d4a1d5fff"
    ]
  },
  "f6620034-a8ac-4cde-a116-c1ccfd3bfd15": {
    "suggestion": "可配「清炒椰菜」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "2aaec965-feb8-4b14-a62a-5633ab8ceb19",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  },
  "6eeaa50a-da2c-40d6-9545-103c274eba63": {
    "suggestion": "可配「蒜蓉生菜」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "201affc0-a59d-4012-9656-346d4a1d5fff",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  },
  "2aaec965-feb8-4b14-a62a-5633ab8ceb19": {
    "suggestion": "可配「蒸水蛋」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424"
    ]
  },
  "c5ba657e-15c2-4d48-9d33-bfc70ead04e9": {
    "suggestion": "可配「蒸水蛋」與「蒜蓉西蘭花」，再按需要配主食；本頁的湯不是另外的飯量。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424",
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "19ccf93b-df76-400a-b8a5-9fc4f9ccd25e": {
    "suggestion": "可配「蒸水蛋」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424"
    ]
  },
  "201affc0-a59d-4012-9656-346d4a1d5fff": {
    "suggestion": "可配「蒸水蛋」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424"
    ]
  },
  "4b437b93-e3ec-4399-8f76-de6dac058eb7": {
    "suggestion": "可配「蒸水蛋」與「蒜蓉西蘭花」，再按需要配主食；本頁的湯不是另外的飯量。",
    "recipeIds": [
      "709f465d-f8db-439f-a76b-1991283aa424",
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "7975d3e4-6b85-428a-b7f0-8a9468d4302a": {
    "suggestion": "可配「蒜蓉西蘭花」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  },
  "78974fcd-ba79-402e-b6aa-2e0572c708e8": {
    "suggestion": "可配「清炒菜心」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "b5402590-4c59-41b6-9a2d-69ccabb3b991",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  },
  "b5402590-4c59-41b6-9a2d-69ccabb3b991": {
    "suggestion": "可配「薑蔥豉油蒸豆腐（簡易版）」及白飯，把這道菜作蔬菜配搭；各道份量另按餐單安排。",
    "recipeIds": [
      "7975d3e4-6b85-428a-b7f0-8a9468d4302a"
    ]
  },
  "52043e65-9e24-44a7-9434-dbc66ce36c02": {
    "suggestion": "這道菜已有薯仔，可配「蒜蓉西蘭花」；其他主食按整餐份量安排。",
    "recipeIds": [
      "1007e867-9dc6-44ab-868e-46b297f4710b"
    ]
  },
  "26e8f9ed-c5d9-4b24-930e-fc6045a11f5b": {
    "suggestion": "可配「清炒椰菜」及白飯；如要加湯，可選「海帶豆腐湯」，各道份量分開計。",
    "recipeIds": [
      "2aaec965-feb8-4b14-a62a-5633ab8ceb19",
      "4b437b93-e3ec-4399-8f76-de6dac058eb7"
    ]
  }
};
