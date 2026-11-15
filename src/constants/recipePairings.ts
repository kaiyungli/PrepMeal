// Reviewed named pairings for the ten-recipe editorial review (the soup has no named dish).
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
  }
};
