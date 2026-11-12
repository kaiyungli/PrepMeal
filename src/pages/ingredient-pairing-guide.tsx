import Link from 'next/link';
import { GuidePage, GuideSection, GuideRecipeList } from '@/components/guides/GuidePage';
import type { IngredientGuideData, ProteinSection } from '@/features/guides/topicRecipes';

const CFS_PURCHASE = 'https://www.cfs.gov.hk/tc_chi/consumer_zone/safefood_all/five_keys_apply_purchase.html';

// Hand-written notes per main ingredient. Recipe lists under each note come
// from the current public catalogue.
const SECTIONS: { key: ProteinSection; title: string; notes: string[] }[] = [
  { key: 'chicken', title: '雞肉', notes: [
    '雞胸肉瘦、熟得快，但煮過龍會鞋；切薄片或者切粒，炒或者煎到剛熟就上碟。去骨雞腿肉有少少脂肪，蒸、炆、煎都較易保持嫩滑，適合第一次試新菜式。',
    '一人份大約用120至180克。生雞同熟食、沙律菜要用唔同砧板，處理完洗手同清潔枱面。',
  ] },
  { key: 'pork', title: '豬肉', notes: [
    '豬肉碎最就手：蒸肉餅、炒菜加少少都得。梅頭肉同排骨適合蒸或者炆，豬扒適合煎或者焗。',
    '肉碎同排骨買返嚟當日煮最好；想留遲啲煮，就分成每次用嘅份量先放冰格，煮前一晚移落雪櫃解凍。',
  ] },
  { key: 'beef', title: '牛肉', notes: [
    '炒牛肉揀薄切或者逆紋切嘅部位，醃少少生粉再大火快炒；牛腩就要慢炆，放工煮唔切嘅話，可以週末預先炆定。',
    '牛肉同番茄、洋蔥、西蘭花、薯仔都夾，同一個洋蔥可以分開兩晚用。',
  ] },
  { key: 'fish', title: '魚', notes: [
    '魚柳（例如龍脷柳）冇骨、熟得快，蒸大約8至10分鐘、煎每邊數分鐘，適合趕時間嘅晚上。三文魚同鯖魚油份較多，用焗爐或者平底鑊煎都唔使落太多油。',
    '急凍魚柳要預早放雪櫃解凍，煮前用廚紙抹乾，蒸或者煎都唔會出太多水。',
  ] },
  { key: 'shrimp', title: '蝦', notes: [
    '急凍蝦仁最方便，炒蛋、炒飯、蒸蛋都用得；蝦一轉色就熟，煮太耐會縮細變韌。',
    '解凍後用少少鹽同生粉抓勻再沖水，可以去走表面雜質，口感更爽。',
  ] },
  { key: 'tofu', title: '豆腐', notes: [
    '嫩豆腐適合蒸同煮湯；硬豆腐唔易散，適合煎、炒同炆。豆腐本身味淡，配豉汁、肉碎、番茄或者蠔油就夠味。',
    '豆腐開盒後要放雪櫃，盡快用完；想做全素，記得核對醬料有冇蠔油或者魚露。',
  ] },
  { key: 'egg', title: '雞蛋', notes: [
    '雞蛋係最方便嘅蛋白質：炒蛋、蒸水蛋、煎蛋都可以十分鐘內完成，同番茄、青瓜、勝瓜、蝦仁都夾。',
    '雞蛋放雪櫃保存；有裂痕嘅蛋唔好買。蒸水蛋用中小火，蛋面先會滑。',
  ] },
];

export default function IngredientPairingGuide({ data }: { data: IngredientGuideData }) {
  return <GuidePage updated="2026-11-07" title="按主要材料揀晚餐" path="/ingredient-pairing-guide"
    description="雪櫃有雞、豬、牛、魚、蝦、豆腐或者雞蛋？睇處理同份量要點，再揀站內食譜同蔬菜配菜。">
    <GuideSection title="先睇雪櫃有乜，再揀菜">
      <p>好多時唔係唔識煮，而係唔知用手上材料煮乜。以下按主要材料分類，每類寫低我哋整理食譜時最常用嘅處理同份量要點，再列出站內用該材料嘅食譜。網站全部食譜都以1人份計，幾多人食就將材料乘幾多。</p>
      <p className="mt-3">一餐通常可以一個主菜加一個蔬菜，再配白飯或者麵。主菜同蔬菜盡量用唔同煮法，例如一個用鑊炒、一個用煲灼或者蒸，爐頭唔使爭。</p>
    </GuideSection>
    {SECTIONS.map(section => (
      <GuideSection key={section.key} title={section.title}>
        {section.notes.map((note, i) => <p key={i} className={i ? 'mt-3' : ''}>{note}</p>)}
        <div className="mt-4"><GuideRecipeList recipes={data.byProtein[section.key] || []} /></div>
      </GuideSection>
    ))}
    <GuideSection title="配一個蔬菜">
      <p>以下蔬菜配菜大部分十至十五分鐘完成，可以喺主菜蒸緊或者炆緊嘅時候煮。葉菜灼或者炒都要瀝乾水；同一包菜可以分兩晚用，但要留意食用期限。</p>
      <div className="mt-4"><GuideRecipeList recipes={data.vegSides} /></div>
    </GuideSection>
    <GuideSection title="買餸同處理要點">
      <ul className="list-disc pl-5 space-y-2">
        <li>食安中心建議先揀乾貨，最後先攞冰鮮及急凍食物；生肉、家禽及海產要同其他食物分袋。</li>
        <li>急凍材料要預早放雪櫃解凍，唔好放喺室溫解凍。</li>
        <li>處理生肉後，先洗手同清潔砧板，先再處理即食材料。</li>
      </ul>
      <p className="mt-3 text-sm">參考：<a className="underline" href={CFS_PURCHASE}>食物安全中心：購買食物</a>。想一次過安排幾晚，可以用<Link className="underline" href="/generate">一週晚餐生成器</Link>，再睇<Link className="underline" href="/hong-kong-market-shopping-guide">買餸攻略</Link>。</p>
    </GuideSection>
  </GuidePage>;
}

export async function getStaticProps() {
  const { getIngredientGuideProps } = await import('@/features/guides/topicRecipes.server');
  return getIngredientGuideProps();
}
