import Link from 'next/link';
import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
import type { PracticalRecipe } from '@/features/guides/practicalExamples';
import { ExampleLink, GuideTable } from '@/components/guides/PracticalExamples';
export default function MarketGuide({ recipes, examples = [] }: { recipes: GuideRecipe[]; examples?: PracticalRecipe[] }) {
  return <GuidePage updated="2026-10-28" title="香港買餸與一週採購攻略" path="/hong-kong-market-shopping-guide" description="跟兩人五日晚餐例子，核對材料總量、家中存貨及一次或兩次採購安排。">
    <GuideSection title="將五日晚餐變成一張買餸清單">
      <p className="mb-4">先用<Link className="underline" href="/7-day-dinner-plan">兩人五日晚餐示例</Link>決定要煮邊幾餐，唔好見到特價先買一大袋再諗。以下按2026年10月28日核對嘅原食譜，用兩人份示範部分重複材料；唔係整週完整購物清單，調味料及其他鮮貨仍要逐道核對。</p>
      <GuideTable caption="兩人份材料換算例子（部分材料）" headers={['材料與菜式', '兩人需要', '買之前點核對']} rows={[
        [<span key="onion"><ExampleLink examples={examples} slug="tomato-tofu-rice" />＋<ExampleLink examples={examples} slug="prepmeal-batch2-04" />＋<ExampleLink examples={examples} slug="vegetable-egg-fried-rice" />嘅洋蔥</span>, '100g＋80g＋80g＝260g', '假設家中已量好可用洋蔥80g，尚欠180g；要比較去皮後可用重量，唔可直接當1個等於180g。'],
        [<span key="pasta"><ExampleLink examples={examples} slug="garlic-chicken-pasta" />＋<ExampleLink examples={examples} slug="garlic-butter-shrimp-pasta" />嘅意粉</span>, '200g＋180g＝380g乾重', '假設屋企有200g，尚欠180g；購買包裝係500g亦唔代表要一次煮晒。'],
        ['三道飯類嘅白飯', '360g＋500g＋360g＝1,220g熟飯', '呢個係煮好後重量，唔係買1,220g生米；唔好將乾米直接當熟飯等重。'],
        ['雞肉與蝦', '星期一雞胸240g；星期四蝦240g', '分開列出肉類、部位及處理後重量。唔好將不同肉類合成一行「肉480g」。'],
      ]} />
      <p className="mt-3">公式係「原用量 × 目標人數 ÷ 原配方人數」。例如壽喜燒原本已係2人份，洋蔥80g唔使再乘2。不同單位先保留，唔自行估算一瓣蒜幾克。生成器按餐單重算需求；家中存貨差額仍由你量度核對，唔係自動庫存扣減。</p>
    </GuideSection>
    <GuideSection title="兩次採購示例：星期日＋星期三">
      <ul className="list-disc pl-5 space-y-2"><li>星期日前先核對乾意粉、米、油、鹽、牛油及壽喜燒調味料，缺先買；鮮貨按星期一至三菜式同標籤期限決定。</li><li>星期三再核對星期四蝦意粉所需蝦、車厘茄，以及星期五雜菜蛋炒飯嘅蛋、粟米、甘筍。洋蔥如之前已買且仍適合使用，唔重複買。</li><li>只想去一次，就先確認雪櫃容量、食用期限及後半週食材可否按包裝急凍保存；唔好將五日鮮貨一律放保鮮格。未能安排就換菜或改兩次採購。</li></ul>
      <p className="mt-3">呢啲係手動採購安排，網站未會自動將清單分成星期日／星期三兩批。已買勾選只表示採購進度；臨時加人、換菜後仍要重新核對份量。</p>
    </GuideSection>
    <GuideSection title="到街市或超市，按呢個次序核對">
      <p>食安中心建議先揀乾貨，最後先攞冰鮮及急凍食物；生肉、家禽及海產同其他食品分袋，避免汁液污染。路程較長用冰袋保冷，回家盡快按標籤放好。價錢比較要連可食部分同包裝重量一齊睇，唔係只比較一盒幾錢。</p>
      <p className="mt-3 text-sm">參考：<a className="underline" href="https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_purchase.html">食安中心：購買食物</a>。臨出門前開完整清單，再檢查菜式有冇改動。</p>
    </GuideSection>
    <GuideSection title="先揀餐單，再寫清單">
      <p>出發前先確認要煮幾餐、每餐幾多人食。睇食譜時將主食、鮮貨、調味料分開核對；同名食材可以整理一齊，但不同單位唔好直接相加。例如一個洋蔥同100克洋蔥，未有量度資料前唔應當成相同份量。</p>
    </GuideSection>
    <GuideSection title="食譜用量，唔等於超市包裝">
      <p>食譜可能用200克肉，但店舖以一盒或一份出售。按包裝標示核對實際重量，再考慮餘下材料可以安排去邊餐。醬料亦要睇清楚品牌、成分及容量，唔好只憑包裝外觀當成可互換。</p>
    </GuideSection>
    <GuideSection title="街市定超市？按實際需要比較">
      <p>比較同一重量、品種及品質的食材，並留意是否需要另加處理費或配送費。本頁唔提供即時格價，亦唔保證街市一定比超市平。價錢會隨季節、供應、地區及品牌改變，請以購買當日標示為準。</p>
    </GuideSection>
    <GuideSection title="用網站購物清單記低採購進度">
      <ul className="list-disc pl-5 space-y-2"><li>生成餐單後可預覽購物清單；登入後亦可開啟已保存餐單的清單，逐項勾選已買，亦可以加入額外物品及備註。</li><li>有材料已經喺屋企，先核對實際份量；「已買」只係採購進度，唔係自動追蹤的庫存。</li><li>改菜式或人數後，再核對重新計算的材料。份量增加的項目可能需要重新確認。</li><li>出門前先連線載入已保存清單；離線保存有本機儲存限制，唔代表首次斷網都可以打開網站。</li></ul>
    </GuideSection>
    <GuideSection title="由現有家常菜開始安排"><GuideRecipeList recipes={recipes} /></GuideSection>
    <GuideSection title="帶住清單，最後再核對一次">
      <p>結帳前核對材料名稱、重量、數量及需要的調味料。保存方式以食品標籤及可靠食物安全指引為準，唔好單憑氣味或外觀判斷是否安全。本頁集中介紹採購安排，唔另訂不同食材的保存日數。</p>
    </GuideSection>
  </GuidePage>;
}
export async function getStaticProps() {
  const { getGuideProps } = await import('@/features/guides/guideRecipes.server');
  return getGuideProps('market');
}
