import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
export default function ClassicRecipes({ recipes }: { recipes: GuideRecipe[] }) {
  return <GuidePage title={`${recipes.length}款家常菜靈感`} path="/50-classic-hk-recipes" description="從現有中式食譜揀家常菜，先睇主食、主菜及配菜，再配合人數同煮食時間安排。">
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
