import Link from 'next/link';
import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
import type { PracticalRecipe } from '@/features/guides/practicalExamples';
import { ExampleLink, ExampleTiming, GuideTable } from '@/components/guides/PracticalExamples';
export default function ClassicRecipes({ recipes, examples = [] }: { recipes: GuideRecipe[]; examples?: PracticalRecipe[] }) {
  return <GuidePage updated="2026-10-28" title={`${recipes.length}款家常菜靈感`} path="/50-classic-hk-recipes" description="用具體一肉一菜及豆腐配菜示例，核對兩人份量、主食同爐具安排。">
    <GuideSection title="兩人一肉一菜：唔使每道都搶同一個鑊">
      <p className="mb-4">想食家常餸飯，可以先選一個主菜，再用另一種烹調方法做配菜。以下兩組係配搭例子，白飯要另外安排；網站嘅主菜／配菜分類唔代表一餐已符合每個人嘅營養需要。</p>
      <GuideTable caption="兩組家常餸飯配搭" headers={['配搭', '兩人份量點核對', '器具與次序']} rows={[
        [<span key="meat"><ExampleLink examples={examples} slug="prepmeal-batch4-15" />＋<ExampleLink examples={examples} slug="poached-baby-napa" /></span>, '雞球原配方2人份，毋須乘2；娃娃菜原配方1人份，兩人材料乘2，娃娃菜360g。白飯另計。', '電飯煲先開；雞球用鑊，娃娃菜用小煲。有兩爐才考慮並行，否則先完成一道再做另一道。'],
        [<span key="tofu"><ExampleLink examples={examples} slug="prepmeal-batch3-16" />＋<ExampleLink examples={examples} slug="poached-spinach-broth" /></span>, '蒸豆腐原配方4人份，兩人按一半材料計；菠菜原配方1人份，兩人按2倍，菠菜320g。白飯另計。', '豆腐需要蒸架，菠菜用小煲；只有一個煲就要先後煮，或改選不用蒸架嘅菜式。'],
      ]} />
      <p className="mt-3">以上份量例子按2026年10月28日公開配方核對，實際煮之前再睇最新詳情。原配方係幾多人份，要逐道睇，唔好所有菜一律乘2。</p>
    </GuideSection>
    <GuideSection title="點比較時間同材料，先唔會煮到手忙腳亂？">
      <p><ExampleLink examples={examples} slug="prepmeal-batch4-15" />：<ExampleTiming examples={examples} slug="prepmeal-batch4-15" />；<ExampleLink examples={examples} slug="poached-baby-napa" />：<ExampleTiming examples={examples} slug="poached-baby-napa" />。兩道並行唔代表一定30分鐘完成，備料、煮飯、清洗器具同分批煮都會影響。</p>
      <p className="mt-3">先檢查有冇現成豆豉醬、高湯、蒸架及合適鍋蓋。兩道都要蒜頭，可以先量好總量，但生肉同即食材料要分開處理。對大豆、魚、貝類或其他食材敏感，就逐項核對材料及調味料標籤，唔單憑「蔬菜」或「豆腐」菜名判斷。</p>
      <p className="mt-3">想減少每天重新揀餸，可以先鎖定一兩道熟悉嘅主菜，再逐晚替換其他菜式；<Link className="underline" href="/7-day-dinner-plan">一週安排示例</Link>同<Link className="underline" href="/hong-kong-market-shopping-guide">採購攻略</Link>會示範下一步。</p>
    </GuideSection>
    <GuideSection title="由今晚有幾多人食開始">
      <p>揀家常菜唔一定要由名菜開始。先決定幾多人食、有幾多時間，同埋想食一份完整餐，定係另外煮飯配餸。以下係目前公開食譜的選集，唔係銷量排名、營養評分，亦唔代表每一道都係香港傳統菜。</p>
    </GuideSection>
    <GuideSection title="目前可查看的家常菜"><GuideRecipeList recipes={recipes} /></GuideSection>
    <GuideSection title="點樣組合一餐？">
      <ul className="list-disc pl-5 space-y-2"><li>已經包含主食的飯麵類，可以先確認食譜人數，再按需要另加配菜。</li><li>只有餸菜的食譜，需另外安排飯、麵或其他主食，唔好將一碟配菜當成完整餐。</li><li>同一餐盡量配合不同材料及烹調方法，亦要考慮爐頭、蒸架及鑊的使用次序。</li><li>有食材限制時，點入逐項核對材料及致敏原說明；菜名或標籤不能代替完整材料表。</li></ul>
    </GuideSection>
    <GuideSection title="做法同份量以食譜詳情為準">
      <p>本頁唔另外提供簡化配方，避免攻略同詳情出現兩套數字。每道菜的材料、份量、時間及步驟請查看連結內的現有食譜。食譜選集會隨公開資料更新；如果搵唔到原本想睇的菜，可以到食譜列表搜尋，或通知我們核對。</p>
    </GuideSection>
  </GuidePage>;
}
export async function getStaticProps() {
  const { getGuideProps } = await import('@/features/guides/guideRecipes.server');
  return getGuideProps('classic');
}
