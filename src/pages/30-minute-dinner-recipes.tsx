import Link from 'next/link';
import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
import type { PracticalRecipe } from '@/features/guides/practicalExamples';
import { ExampleLink, ExampleTiming, GuideTable } from '@/components/guides/PracticalExamples';
export default function QuickDinnerRecipes({ recipes, examples = [] }: { recipes: GuideRecipe[]; examples?: PracticalRecipe[] }) {
  return <GuidePage updated="2026-10-28" title="30分鐘快手家常菜" path="/30-minute-dinner-recipes" description="由真實食譜分清備料、烹調及熟飯前提，安排放工後嘅晚餐次序。">
    <GuideSection title="今晚有半個鐘，先揀唔使額外等待嘅菜">
      <p className="mb-4">由放低手袋到開飯，仲包括洗手、取材料、煲水同盛碟。網站食譜時間係估算，唔係兩人整餐保證時間。先睇材料是否已解凍、飯是否已煮好，以及有冇同時用煲同鑊嘅空間；第一次做唔好排得剛剛好。</p>
      <GuideTable caption="三款晚餐嘅時間前提" headers={['食譜', '原配方時間', '容易漏計嘅部分']} rows={[
        [<ExampleLink key="chicken" examples={examples} slug="garlic-chicken-pasta" />, <ExampleTiming key="ct" examples={examples} slug="garlic-chicken-pasta" />, '意粉要按包裝煮；雞肉要先可處理，雙爐可同時煮麵及煎雞，單爐就依次完成。'],
        [<ExampleLink key="tofu" examples={examples} slug="tomato-tofu-rice" />, <ExampleTiming key="tt" examples={examples} slug="tomato-tofu-rice" />, '材料寫白飯，即已熟飯。由生米煮起，須加上電飯煲實際所需時間。'],
        [<ExampleLink key="beef" examples={examples} slug="prepmeal-batch2-04" />, <ExampleTiming key="bt" examples={examples} slug="prepmeal-batch2-04" />, '原配方已係2人份；先有熟飯、薄切牛肉及所需調味料，唔好臨開煮先解凍。'],
      ]} />
    </GuideSection>
    <GuideSection title="實際次序：兩人蒜香雞肉意粉">
      <ol className="list-decimal pl-5 space-y-2"><li>先讀完整做法及意粉包裝。原配方1人份，兩人材料乘2：雞胸240g、乾意粉200g，調味同樣按份量核對，唔直接把25分鐘乘2。</li><li>準備煮麵水，蒜頭切片；用分開嘅器具處理生雞肉，處理後清潔雙手及工作面。</li><li>有兩個爐頭，可按食譜煮意粉，同時另鑊煎熟雞肉；只有一個爐頭就先煮麵，保留煮麵水，再用鑊處理雞肉。唔為咗趕鐘省略煮熟步驟。</li><li>雞肉熟後盛起，再炒蒜片、拌麵，最後雞肉回鑊。鍋太細就分批，預留額外時間，唔好一口氣塞滿鑊。</li></ol>
      <p className="mt-3">呢個係按原做法整理嘅操作次序，未做家用爐具計時實測。想另加蔬菜，就要再計處理同烹調，唔保證仍可半個鐘完成；想先安排幾日晚餐，可參考<Link className="underline" href="/7-day-dinner-plan">五日晚餐示例</Link>。</p>
    </GuideSection>
    <GuideSection title="先分清一道菜，同一餐飯">
      <p>一道炒菜需要20分鐘，唔代表連煮飯、洗菜及收拾都可以20分鐘完成。揀菜時先睇材料、備料及烹調步驟，再決定需唔需要另外煮主食或配菜。食譜時間係估算，份量、爐具同熟練程度都會影響實際所需時間。</p>
    </GuideSection>
    <GuideSection title={`目前推薦 ${recipes.length} 款快手菜`}>
      <p className="mb-4">以下只列出食譜資料標示總時間不超過30分鐘的菜式；點入查看準確材料、份量及完整步驟，唔以攻略摘要代替原食譜。</p>
      <GuideRecipeList recipes={recipes} />
    </GuideSection>
    <GuideSection title="放工後點樣安排先順手？">
      <ol className="list-decimal pl-5 space-y-2"><li>開煮前先睇完整做法，將需要醃製、解凍或預先浸泡的部分安排好。</li><li>先處理需要等待的主食，再準備配菜；只有爐具同操作空間足夠時才同時開兩道菜。</li><li>第一次煮新菜式留多一點時間。唔好為咗趕時間而縮短必要的烹調步驟。</li><li>若果同時整兩道菜，唔好直接把兩個預計時間當成整餐完成時間，亦唔保證可以完全重疊。</li></ol>
    </GuideSection>
    <GuideSection title="用材料重複，減少準備功夫">
      <p>例如兩道菜都用洋蔥，可以一次準備需要的份量；同一包蔬菜亦可以分配去不同餐。先核對餐單人數及材料總量，避免為咗慳時間而買多。想安排幾日晚餐，可以用生成器選3、5或7日，再逐道替換唔合適的菜式。</p>
    </GuideSection>
  </GuidePage>;
}
export async function getStaticProps() {
  const { getGuideProps } = await import('@/features/guides/guideRecipes.server');
  return getGuideProps('quick');
}
