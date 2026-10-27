import Link from 'next/link';
import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
import type { PracticalRecipe } from '@/features/guides/practicalExamples';
import { ExampleLink, ExampleTiming, GuideTable } from '@/components/guides/PracticalExamples';
export default function SevenDayPlan({ recipes, examples = [] }: { recipes: GuideRecipe[]; examples?: PracticalRecipe[] }) {
  const days = [
    ['星期一', 'garlic-chicken-pasta', '意粉即煮，唔需要預先有熟飯；忙碌嘅星期一先用熟悉做法。'],
    ['星期二', 'tomato-tofu-rice', '轉用豆腐；洋蔥亦可安排去星期三，先分開兩晚所需重量。'],
    ['星期三', 'prepmeal-batch2-04', '用薄切牛肉同小鍋煮；要預備熟飯及核對味醂、清酒等調味料。'],
    ['星期四', 'garlic-butter-shrimp-pasta', '沿用星期一買嘅乾意粉，但轉蝦及牛油風味；蝦另外安排採購或解凍。'],
    ['星期五', 'vegetable-egg-fried-rice', '以蛋同雜菜收尾；須先有妥善保存嘅熟飯，唔係由生米開始計16分鐘。'],
  ];
  return <GuidePage updated="2026-10-28" title="一週晚餐安排示例" path="/7-day-dinner-plan" description="以星期一至五兩人晚餐示範揀菜、換算份量及集中買餸，再按自己的時間調整。">
    <GuideSection title="上班族兩人五日晚餐：一個可調整起點">
      <p className="mb-4">假設星期一至五都返工，每晚兩人食，家中有一個鑊、一個煲及電飯煲。以下係編輯安排，唔係系統替你保存咗嘅餐單。先核對兩人食量、材料限制同器具；列出嘅時間係原食譜估算，增加份量可能需要分批煮。</p>
      <GuideTable caption="星期一至五兩人晚餐示例" headers={['日子及菜式', '份量與時間', '點解咁安排']} rows={days.map(([day, slug, reason]) => [<span key={day}>{day}<br /><ExampleLink examples={examples} slug={slug} /></span>, <ExampleTiming key={slug} examples={examples} slug={slug} />, reason])} />
      <p className="mt-3">原配方1人份，兩人食時材料乘2；原配方2人份則用原份量。先到生成器選5日、2人，再逐個位置選擇或換成想食嘅菜；本表唔會一按自動匯入。完整餐係網站分類，唔等於個人化營養評估。</p>
    </GuideSection>
    <GuideSection title="一次買齊，定分兩次？先睇自己嘅一週">
      <p>例如星期日買星期一至三所需材料及全週乾貨，星期三放工再補星期四、五鮮貨。呢個係行程示例，唔代表所有鮮貨都可放到指定日子；先睇食用期限、包裝保存指示同雪櫃空間。只有一日買餸，就先決定後半週材料可否按標籤急凍保存，或改用合適嘅耐存材料食譜。</p>
      <p className="mt-3">星期三臨時出街食，就移除當晚菜式，再開購物清單核對；未買材料可減，已買材料要另行安排，系統唔會自動改派去另一餐。星期一、四同用意粉，但唔應為咗用清材料而硬加另一份主食。</p>
    </GuideSection>
    <GuideSection title="想順手準備翌日午餐？先計份量再計保存">
      <p>兩人晚餐加一人午餐，可以按3份計材料，但要自己分裝；目前生成器嘅人數會套用整份餐單，未有獨立午餐排程或逐餐不同人數。唔需要每日帶飯，就分開核對嗰晚材料，唔好將全週人數都改大。</p>
      <p className="mt-3">按食安中心建議，預留下一餐嘅熟食可在開飯前用乾淨容器分出，盡快冷卻及放雪櫃。帶返工要控制運送溫度：凍食保持4°C或以下，到公司有雪櫃就即時冷存；翻熱中心至少75°C，唔好翻熱多於一次。未能妥善冷存就唔好靠「聞落正常」判斷。</p>
      <p className="mt-3 text-sm">參考：<a className="underline" href="https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_leftovers.html">食安中心：處理剩餘食物</a>、<a className="underline" href="https://www.cfs.gov.hk/tc_chi/consumer_zone/packed_meals.html">自備餐盒</a>。採購例子見<Link className="underline" href="/hong-kong-market-shopping-guide">買餸攻略</Link>。</p>
    </GuideSection>
    <GuideSection title="示例唔等於個人化營養餐單">
      <p>以下最多列出七道現有公開、標示為完整餐的食譜，方便逐日安排。完整餐係網站餐式分類，唔代表已符合每個人的營養需要。材料限制、活動量及食量各有不同，請按自己的情況調整；唔適合的菜式可以到生成器重新選擇。</p>
    </GuideSection>
    <GuideSection title="其他完整餐選擇"><GuideRecipeList recipes={recipes} /></GuideSection>
    <GuideSection title="買餸前先確認三件事">
      <ol className="list-decimal pl-5 space-y-2"><li>確認每天有幾多人食，食譜份量同實際人數是否相符。</li><li>打開每道菜材料表，核對家中已有材料、包裝大小及可用調味料。</li><li>按日程安排採購及備料，唔需要一次把整星期鮮貨買齊。</li></ol>
    </GuideSection>
    <GuideSection title="用生成器調整成自己的版本">
      <p>生成器可以選擇3、5或7日及整份餐單人數。先生成餐單，再鎖定想保留的菜、逐道替換其他菜式；不足的位置可以按「添加」補菜。訪客可預覽購物清單，保存餐單到帳戶需要登入，本頁示例唔會自動存入你的帳戶。</p>
    </GuideSection>
    <GuideSection title="計劃改咗，材料亦要再核對">
      <p>如果其中一晚外出食飯，或改用另一道菜，購買前要再核對總材料。呢份示例唔提供固定一週價錢，實際開支取決於人數、食材品牌、季節及購買地點，唔應該用舊估價當成今日報價。</p>
    </GuideSection>
  </GuidePage>;
}
export async function getStaticProps() {
  const { getGuideProps } = await import('@/features/guides/guideRecipes.server');
  return getGuideProps('week');
}
