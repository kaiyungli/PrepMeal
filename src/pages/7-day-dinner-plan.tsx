import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
export default function SevenDayPlan({ recipes }: { recipes: GuideRecipe[] }) {
  return <GuidePage title="一週晚餐安排示例" path="/7-day-dinner-plan" description="用現有完整餐食譜作為一週安排起點，再按人數、口味及當日時間調整。">
    <GuideSection title="示例唔等於個人化營養餐單">
      <p>以下最多列出七道現有公開、標示為完整餐的食譜，方便逐日安排。完整餐係網站餐式分類，唔代表已符合每個人的營養需要。材料限制、活動量及食量各有不同，請按自己的情況調整；唔適合的菜式可以到生成器重新選擇。</p>
    </GuideSection>
    <GuideSection title="逐日晚餐靈感"><GuideRecipeList recipes={recipes} days /></GuideSection>
    <GuideSection title="買餸前先確認三件事">
      <ol className="list-decimal pl-5 space-y-2"><li>確認每天有幾多人食，食譜份量同實際人數是否相符。</li><li>打開每道菜材料表，核對家中已有材料、包裝大小及可用調味料。</li><li>按日程安排採購及備料，唔需要一次把整星期鮮貨買齊。</li></ol>
    </GuideSection>
    <GuideSection title="用生成器調整成自己的版本">
      <p>生成器可以選擇3、5或7日及整份餐單人數。先生成餐單，再鎖定想保留的菜、逐道替換其他菜式；不足的位置可以按「添加」補菜。保存餐單及查看購物清單需要登入，本頁示例唔會自動存入你的帳戶。</p>
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
