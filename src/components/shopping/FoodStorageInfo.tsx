export default function FoodStorageInfo() {
  return <details className="mt-3 text-sm leading-6 text-[#756B5F]">
    <summary className="min-h-9 cursor-pointer font-medium">食物保存及帶飯提示</summary>
    <div className="space-y-2 py-2">
      <p>一次買齊係逐晚煮，唔係煮晒五日放保鮮格。後半週用嘅生肉及魚按標籤分裝急凍（−18°C 或以下），用前於 0–4°C 雪櫃解凍；生熟分開。鮮菜、豆腐及開封食品按包裝期限及狀態安排，必要時第二批補買。</p>
      <p>帶飯先分起一份，迅速冷卻並於 2 小時內放入 4°C 或以下雪櫃。運送用保溫袋配至少兩個冷源，到公司即冷存；食用前翻熱至中心至少 75°C，只翻熱一次。冇冷存條件時唔好沿用呢個帶飯安排。</p>
      <p>清單「白飯」按熟重計，唔係生米重量；需預先煮好並妥善冷存。單位大小或密度未確認時，克數同瓣數／匙數會分開列。煮食用水唔列入待買項目。</p>
      <a href="https://www.cfs.gov.hk/tc_chi/consumer_zone/packed_meals.html" target="_blank" rel="noreferrer" className="underline">食物安全中心：自備餐盒</a>
    </div>
  </details>;
}
