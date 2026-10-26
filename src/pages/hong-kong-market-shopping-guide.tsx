import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { GuideRecipe } from '@/features/guides/guideRecipes';
export default function MarketGuide({ recipes }: { recipes: GuideRecipe[] }) {
  return <GuidePage title="香港買餸與一週採購攻略" path="/hong-kong-market-shopping-guide" description="由餐單倒推材料，分清食譜份量、購買包裝及家中存貨，減少漏買同重複購買。">
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
      <ul className="list-disc pl-5 space-y-2"><li>登入後打開餐單購物清單，逐項勾選已買，亦可以加入額外物品及備註。</li><li>有材料已經喺屋企，先核對實際份量；「已買」只係採購進度，唔係自動追蹤的庫存。</li><li>改菜式或人數後，再核對重新計算的材料。份量增加的項目可能需要重新確認。</li><li>出門前先連線載入已保存清單；離線保存有本機儲存限制，唔代表首次斷網都可以打開網站。</li></ul>
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
