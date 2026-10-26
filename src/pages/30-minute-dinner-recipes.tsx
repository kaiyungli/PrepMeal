import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
export default function QuickDinnerRecipes({ recipes }: { recipes: GuideRecipe[] }) {
  return <GuidePage title="30分鐘快手家常菜" path="/30-minute-dinner-recipes" description="從現有食譜中挑選預計總時間30分鐘內的菜式，按自己的晚餐安排配搭。">
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
