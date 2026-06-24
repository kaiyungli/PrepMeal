import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

// Weekly dinner plan data
const weeklyPlan = [
  { day: '星期一', recipe: '青瓜炒蛋', slug: 'cucumber-scrambled-egg', time: '15分鐘', difficulty: '簡易' },
  { day: '星期二', recipe: '咖哩牛腩飯', slug: 'curry-beef-rice', time: '45分鐘', difficulty: '中等' },
  { day: '星期三', recipe: '鹽焗雞翼', slug: 'salt-baked-chicken-wings', time: '30分鐘', difficulty: '中等' },
  { day: '星期四', recipe: '清蒸石斑', slug: 'steamed-fish', time: '20分鐘', difficulty: '簡易' },
  { day: '星期五', recipe: '楊州炒飯', slug: 'yangzhou-fried-rice', time: '25分鐘', difficulty: '中等' },
  { day: '星期六', recipe: '乾炒牛河', slug: 'dry-fried-beef-hor-fun', time: '20分鐘', difficulty: '中等' },
  { day: '星期日', recipe: '煲仔飯', slug: 'cantonese-clay-pot-rice', time: '60分鐘', difficulty: '較難' },
];

const tips = [
  { title: '備料時間', content: '可以係週末一次過買定哂七日既材料，咁樣平日就唔洗咁忙。' },
  { title: '醃製技巧', content: '肉類可以前一晚醃好，放入雪櫃，第二日直接就可以落鑊，會快手好多。' },
  { title: '一鍋兩用', content: '例如蒸魚既時候，可以同時用另一隻煲煮飯，一舉兩得。' },
  { title: '剩餘材料', content: '如果買既材料用唔晒，可以第二日整其他菜式，唔好浪費。' },
];

export default function SevenDayDinnerPlan() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "一週七天晚餐食譜完整攻略 - 星期一至星期日",
    "description": "精選一週七天晚餐食譜，等你今晚唔洗諗煮咩。從星期一既快手15分鐘青瓜炒蛋，到星期日既煲仔飯，幫你安排好哂。",
    "author": { "@type": "Organization", "name": "今晚食乜" },
    "datePublished": "2026-06-24",
    "dateModified": "2026-06-24"
  };

  return (
    <Layout>
      <SEO
        title="一週七天晚餐食譜完整攻略 | 今晚食乜"
        description="精選一週七天晚餐食譜，等你今晚唔洗諗煮咩。星期一至星期日每日唔同選擇，全部都有詳細做法。"
        canonical="https://eatwhathk.com/7-day-dinner-plan"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3A2010] mb-6 text-center">
          一週七天晚餐食譜完整攻略
        </h1>
        
        <p className="text-lg text-[#5A4030] mb-8 text-center">
          星期一至星期日，每日唔同選擇，等你今晚唔洗再諗煮咩！
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解要做一週晚餐計劃？</h2>
          <p className="text-[#5A4030] mb-4">
            香港人生活繁忙，每日放工已經好攰，唔想再用腦諗今晚煮咩。
            如果你每晚都要諗「今晚食咩」呢個問題，其實係一個幾大既心理負擔。
            所以我建議每個星期用15分鐘時間，做好一週既晚餐計劃，咁樣：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>唔洗每日都用腦</strong> - 事先諗好哂，唔洗臨場諗</li>
            <li><strong>可以去盡情享受</strong> - 諗都唔洗諗，直接跟住plan做</li>
            <li><strong>時間自己話事</strong> - 知道幾點開始整，幾點有得食</li>
            <li><strong>屋企人開心</strong> - 每日都有安排，唔洗為今晚食咩拗氣</li>
            <li><strong>慳錢慳時間</strong> - 一次過買齊材料，唔洗周圍走</li>
            <li><strong>健康均衡</strong> - 可以控制每日既營養配搭</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">一週晚餐計劃既原則</h2>
          <p className="text-[#5A4030] mb-4">
            整一週晚餐計劃既時候，可以跟住以下既原則：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>快慢交替</strong> - 星期一、三、五可以安排快手菜，星期二、四可以安排複雜啲既</li>
            <li><strong>葷素均衡</strong> - 每日至少有一碟蔬菜，蛋白質都要足夠</li>
            <li><strong>唔好重複</strong> - 連續兩日都係同一種肉，會食到悶</li>
            <li><strong>按心情安排</strong> - 邊日邊種心情，就配相應既菜式</li>
            <li><strong>預留彈性</strong> - 可以有一日或者半日既buffer，唔洗一定要跟足</li>
            <li><strong>配搭靈活</strong> - 如果某日真係唔想整，可以出去食或者叫外賣</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">整週既材料購買攻略</h2>
          <p className="text-[#5A4030] mb-4">
            如果你想一次過買齊七日既材料，可以參考以下既 shopping list：
          </p>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-medium text-[#9B6035] mb-2">街市/超市清單</h3>
            <ul className="list-disc pl-5 space-y-1 text-[#5A4030] text-sm">
              <li><strong>蛋類</strong> - 雞蛋1盒（10隻）</li>
              <li><strong>肉類</strong> - 牛腩1斤、豬扒1斤、雞翼1斤</li>
              <li><strong>海鮮</strong> - 石斑1條、蝦半斤</li>
              <li><strong>蔬菜</strong> - 青瓜2條、菜心1斤、洋蔥2個、薯仔2個</li>
              <li><strong>主食</strong> - 米1包、河粉1包、蛋炒飯材料1份</li>
              <li><strong>配料</strong> - 蔥、薑、蒜、鹽、豉油、咖喱磚</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">整週既時間管理技巧</h2>
          <p className="text-[#5A4030] mb-4">
            要做到每日都可以準時食到晚飯，時間管理非常重要：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>備料時間</strong> - 星期六日花30分鐘切定啲材料，平日就可以快手好多</li>
            <li><strong>醃製時間</strong> - 肉類前一晚醃好，第二日直接落鑊，可以慳15分鐘</li>
            <li><strong>一鍋兩用</strong> - 蒸魚既同時可以用另一隻煲煮飯，一舉兩得</li>
            <li><strong>先後次序</strong> - 先整要耐既餸，中間整配菜，咁樣唔洗得閒等</li>
            <li><strong>提前準備</strong> - 湯可以先煲滾定，放係度保温，餸整好就可以食</li>
            <li><strong>分段時間</strong> - 如果真係好忙，可以分兩日整，例如頭晚醃定肉，第二晚先整</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">每週採購清單</h2>
          <p className="text-[#5A4030] mb-4">
            以下係建議既每週採購清單，可以慳你時間：
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-[#9B6035] mb-2">街市必買</h3>
              <ul className="text-sm text-[#5A4030] space-y-1">
                <li>新鮮既肉類（牛、豬、雞）</li>
                <li>海鮮（魚、蝦）</li>
                <li>新鮮蔬菜</li>
                <li>蛋類</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-medium text-[#9B6035] mb-2">超市必買</h3>
              <ul className="text-sm text-[#5A4030] space-y-1">
                <li>米/河粉</li>
                <li>調味料</li>
                <li>罐頭</li>
                <li>乾貨</li>
              </ul>
            </div>
          </div>
        </section>


        <section className="bg-white rounded-xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">一週晚餐時間表</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5DCC8]">
                  <th className="py-2 text-[#9B6035]">日期</th>
                  <th className="py-2 text-[#9B6035]">食譜</th>
                  <th className="py-2 text-[#9B6035]">時間</th>
                  <th className="py-2 text-[#9B6035]">難度</th>
                </tr>
              </thead>
              <tbody>
                {weeklyPlan.map((item) => (
                  <tr key={item.day} className="border-b border-[#E5DCC8]">
                    <td className="py-3 text-[#3A2010] font-medium">{item.day}</td>
                    <td className="py-3">
                      <a href={`/recipes/${item.slug}`} className="text-[#9B6035] hover:underline">
                        {item.recipe}
                      </a>
                    </td>
                    <td className="py-3 text-[#5A4030]">{item.time}</td>
                    <td className="py-3 text-[#5A4030]">{item.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解要一週晚餐計劃？</h2>
          <p className="text-[#5A4030] mb-4">
            香港人生活繁忙，每日放工都已經好攰，仲要諗今晚煮咩既問題，簡直係另一個負擔。
            如果你事先做好一週既晚餐計劃，咁樣：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>慳時間</strong> - 唔洗每日都用腦諗，唔洗每日都行超市</li>
            <li><strong>慳金錢</strong> - 一次過買齊材料，唔洗散買咁貴</li>
            <li><strong>健康</strong> - 每日都有蔬菜同蛋白質，營養均衡</li>
            <li><strong>開心</strong> - 唔洗為今晚食咩拗氣，家庭和諧啲</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">一週晚餐詳細做法</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期一 - 青瓜炒蛋 + 粟米蛋花湯</h3>
              <p className="text-[#5A4030]">
                星期一係每週既開始，通常都係最忙既時候。呢日既選擇係兩個快手菜：
                青瓜炒蛋15分鐘就搞掂，粟米蛋花湯10分鐘就整好。
                加埋都係25分鐘，放工翻到屋企就即刻有得食。
                <a href="/recipes/cucumber-scrambled-egg" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期二 - 咖哩牛腩飯</h3>
              <p className="text-[#5A4030]">
                星期二可以整啲較為複雜既野。咖哩牛腩要啲時間，
                但係可以週末整定，放工翻熱就有得食。配埋白飯，
                一個人食到好滿足。
                <a href="/recipes/curry-beef-rice" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期三 - 鹽焗雞翼</h3>
              <p className="text-[#5A4030]">
                星期三既選擇係小朋友最鍾意既雞翼。
                鹽焗雞翼香噴噴，屋企人一定鍾意食。
                配埋一碟蒜蓉炒菜心，營養均衡。
                <a href="/recipes/salt-baked-chicken-wings" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期四 - 清蒸石斑</h3>
              <p className="text-[#5A4030]">
                星期四要補下既時候。蒸魚最健康，
                低脂肪高蛋白，岩哂注重健康既人士。
                蒸10分鐘就搞掂。
                <a href="/recipes/steamed-fish" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期五 - 楊州炒飯</h3>
              <p className="text-[#5A4030]">
                星期五放工心情好，整多啲配料既炒飯一家人食。
                楊州炒飯配料豐富，蛋、叉燒、蝦仁全部都有。
                <a href="/recipes/yangzhou-fried-rice" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期六 - 乾炒牛河</h3>
              <p className="text-[#5A4030]">
                星期六可以晏少少起身，整啲濕濕地既嘢食。
                乾炒牛河係香港經典，一於去街市買定新鮮既河粉。
                <a href="/recipes/dry-fried-beef-hor-fun" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-medium text-[#9B6035] mb-2">星期日 - 煲仔飯</h3>
              <p className="text-[#5A4030]">
                星期日最悠閒，可以整煲仔飯慢慢享受。
                記住要用香既米，撈埋啲臘味，正呀！
                <a href="/recipes/cantonese-clay-pot-rice" className="text-[#9B6035] underline ml-1">[睇食譜]</a>
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">整週晚餐既小技巧</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tips.map((tip, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-medium text-[#9B6035]">{tip.title}</h3>
                <p className="text-sm text-[#5A4030]">{tip.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">想搵更多選擇？</h2>
          <p className="text-[#5A4030] mb-4">
            如果呢七日既選擇唔夠，可以：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>
              <a href="/50-classic-hk-recipes" className="text-[#9B6035] underline">
                50款香港人必備食譜
              </a>
              - 超過50款選擇，等於成個月既晚餐
            </li>
            <li>
              <a href="/generate" className="text-[#9B6035] underline">
                AI餐單生成器
              </a>
              - 一click幫你安排成個星期
            </li>
            <li>
              <a href="/recipes" className="text-[#9B6035] underline">
                食譜庫
              </a>
              - 超過180款選擇
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm mb-12">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">常見問題</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#3A2010]">可以唔可以調動順序？</h3>
              <p className="text-[#5A4030]">可以既，你可以根據自己既時間同心情調動。例如邊日想做簡單啲，就揀 Monday 或者 Thursday 既快手菜。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">材料可以唔可以轉？</h3>
              <p className="text-[#5A4030]">绝对可以！例如你唔鍾意食牛腩，可以轉做豬扒。跟住自己既口味先係最重要。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">點樣慳錢慳時間？</h3>
              <p className="text-[#5A4030]">可以一次過去街市買齊七日既材料，通常散買會貴啲。同埋可以週末預先醃定啲肉，第二日直接落鑊。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">小朋友唔鍾意點算？</h3>
              <p className="text-[#5A4030]">可以將小朋友鍾意既菜式安排多啲。例如佢哋通常都鍾意雞翼、炒飯呢類，星期一、三、五都可以安排呢啲。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">得兩個人食既話點算？</h3>
              <p className="text-[#5A4030]">份量可以減半，或者整兩款唔同既餸，等唔會悶。例如蒸魚既同時可以整個炒菜，兩個餸兩個人岩岩好。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">可以唔可以一個星期整兩次？</h3>
              <p className="text-[#5A4030]">可以呀！如果你發現某一個星期特別忙，可以重複整某一兩日既菜式。例如星期二整既咖哩牛腩，可以分兩日食，唔洗咁辛苦。</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">總結</h2>
          <p className="text-[#5A4030]">
            一週晚餐計劃唔洗諗得咁複雜，就係揀啱食材、安排啱時間就得。
            如果你想更加輕鬆，可以試下我地既
            <a href="/generate" className="text-[#9B6035] underline">AI餐單生成器</a>，
            一click就幫你安排好成個星期既晚餐！
          </p>
        </section>
      </main>
    </Layout>
  );
}
