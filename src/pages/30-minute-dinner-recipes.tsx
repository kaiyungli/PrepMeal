import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

// Quick recipes data
const quickRecipes = [
  { name: '青瓜炒蛋', slug: 'cucumber-scrambled-egg', time: 15 },
  { name: '豆角炒蛋', slug: 'long-bean-scrambled-egg', time: 15 },
  { name: '洋蔥炒蛋', slug: 'onion-scrambled-egg', time: 15 },
  { name: '粟米蛋花湯', slug: 'corn-egg-drop-soup', time: 10 },
  { name: '蒜蓉蒸蝦', slug: 'garlic-steamed-shrimp', time: 12 },
  { name: '清蒸石斑', slug: 'steamed-fish', time: 12 },
  { name: '鹽焗雞翼', slug: 'salt-baked-chicken-wings', time: 25 },
  { name: '蜜糖雞翼', slug: 'honey-chicken-wings', time: 20 },
  { name: '蒸滑雞', slug: 'steamed-chicken', time: 15 },
  { name: '咖哩牛腩', slug: 'curry-beef-rice', time: 30 },
  { name: '乾炒牛河', slug: 'dry-fried-beef-hor-fun', time: 20 },
  { name: '楊州炒飯', slug: 'yangzhou-fried-rice', time: 20 },
  { name: '薑蔥炒蟹', slug: 'ginger-scallion-crab', time: 20 },
  { name: '蒜蓉炒菜心', slug: 'garlic-choi-sum', time: 10 },
  { name: '蠔油西蘭花', slug: 'oyster-sauce-broccoli', time: 12 },
  { name: '涼拌青瓜', slug: 'cold-cucumber-salad', time: 15 },
  { name: '麻婆豆腐', slug: 'mapo-tofu', time: 20 },
  { name: '魚香豆腐', slug: 'yu-xiang-tofu', time: 20 },
  { name: '番茄炒蛋', slug: 'tomato-scrambled-egg', time: 15 },
  { name: '紫菜蛋花湯', slug: 'seaweed-egg-drop-soup', time: 10 },
];

const weeklyPlan = [
  { day: '星期一', recipe: '青瓜炒蛋', time: 15 },
  { day: '星期二', recipe: '咖哩牛腩', time: 30 },
  { day: '星期三', recipe: '蒸滑雞', time: 15 },
  { day: '星期四', recipe: '清蒸石斑', time: 12 },
  { day: '星期五', recipe: '楊州炒飯', time: 20 },
  { day: '星期六', recipe: '乾炒牛河', time: 20 },
  { day: '星期日', recipe: '鹽焗雞翼', time: 25 },
];

export default function QuickDinnerRecipes() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "30分鐘快手家常菜｜20款香港打工仔晚餐推薦",
    "description": "精選20款30分鐘內可以完成既家常菜，適合忙碌既香港打工仔。從青瓜炒蛋到咖哩牛腩，一個禮拜晚餐唔洗煩。",
    "author": { "@type": "Organization", "name": "今晚食乜" },
    "datePublished": "2024-06-24",
    "dateModified": "2024-06-24"
  };

  return (
    <Layout>
      <SEO
        title="30分鐘快手家常菜｜20款香港打工仔晚餐推薦 | 今晚食乜"
        description="精選20款30分鐘內可以完成既家常菜，適合忙碌既香港打工仔。從青瓜炒蛋到咖哩牛腩，一個禮拜晚餐唔洗煩。"
        canonical="https://eatwhathk.com/30-minute-dinner-recipes"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3A2010] mb-6 text-center">
          30分鐘快手家常菜｜20款香港打工仔晚餐推薦
        </h1>
        
        <p className="text-lg text-[#5A4030] mb-8 text-center">
          香港打工仔既必備晚餐攻略！30分鐘內有飯食，唔洗諗今晚煮咩！
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解香港打工仔需要快手晚餐？</h2>
          <p className="text-[#5A4030] mb-4">
            香港既工作環境大家都知，上班時間長，放工時間唔定，
            有時甚至要做到7-8點先走得。如果你要好似啲内地人一樣朝9晚6放工，
            返到屋企都8-9點，沖個涼都要時間，仲邊度有心機整晚飯？
          </p>
          <p className="text-[#5A4030] mb-4">
            根據我既觀察，香港打工仔既晚餐問題主要有三個：
            第一，冇時間；第二，唔想咁麻煩；第三，唔識整。
            但係如果每晚都出去食或者叫外賣，一個月洗咁多錢之餘，長期落去對身體都唔太好。
          </p>
          <p className="text-[#5A4030] mb-4">
            所以呢篇文章既目的，就係幫大家解決「今晚煮咩」呢個每日都要面對既問題！
            我會分享20款30分鐘內可以完成既家常菜，等你可以係繁忙既工作之餘，
            仍然可以好好咁食一餐晚飯。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">30分鐘內可以整到啲咩？</h2>
          <p className="text-[#5A4030] mb-4">
            可能你會諗，三十分鐘都可以整到啲咩？整到既野多到你想像唔到！
            以下既時間分類可以幫到你安排：
          </p>
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-4">10分鐘系列（極速版）</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>青瓜炒蛋 - 切佢兜幾下就食得</li>
            <li>粟米蛋花湯 - 滾水倒落去撈撈幾下就搞掂</li>
            <li>蒜蓉炒菜心 - 爆香落菜心兜幾下</li>
            <li>涼拌青瓜 - 切佢撈撈雪15分鐘即食</li>
            <li>蒸水蛋 - 撈勻等佢蒸8分鐘</li>
          </ul>
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-4">15分鐘系列（標準版）</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>洋蔥炒蛋 - 切洋蔥都係3分鐘</li>
            <li>番茄炒蛋 - 切番茄時間都差不多</li>
            <li>蒸滑雞 - 醃15分鐘蒸10分鐘</li>
            <li>鹽焗雞翼 - 醃15分鐘焗15分鐘</li>
            <li>清蒸石斑 - 整魚洗乾淨蒸10分鐘</li>
          </ul>
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-4">25-30分鐘系列（進階版）</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>咖哩牛腩 - 切定材料就可以整</li>
            <li>楊州炒飯 - 炒飯需要啲時間整靚佢</li>
            <li>乾炒牛河 - 河粉要啲時間整</li>
            <li>薑蔥炒蟹 - 蟹要洗乾淨</li>
            <li>麻婆豆腐 - 切豆腐都要啲時間</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點樣慳到時間？</h2>
          <p className="text-[#5A4030] mb-4">
            要係30分鐘內完成一餐晚飯，技巧好重要：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>第一，準備功夫做���前面。</strong> - 星期六日一次過買齊七日既材料，之後切定、醃定，放入雪櫃。咁樣平日返到屋企15分鐘就搞掂。</li>
            <li><strong>第二，一心唔好二用。</strong> - 煮既時候專心煮，唔好睇電話或者做其他野。專心既話可以慳三分一既時間。</li>
            <li><strong>第三，睇住時間落order。</strong> - 先整要耐既，例如咖哩牛腩先落煲，中間整配菜。時間管理好重要。</li>
            <li><strong>第四，慳得就慳。</strong> - 唔好下下都用新既鑊，唔好洗多啲碗。一個煲可以整幾樣既話就一個煲解決。</li>
            <li><strong>第五，機器幫手。</strong> - 如果你有微波爐或者電飯煲，可以先用佢整定啲基礎，等佢地先整緊既時候你可以整其他野。</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">快手晚餐既營養價值</h2>
          <p className="text-[#5A4030] mb-4">
            好多人以為快手既野就冇營養，其實唔係！只要配搭得好，一樣可以營養均衡：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>蛋白質</strong> - 雞蛋、雞翼、牛腩、豆腐，全部都含有優質蛋白質</li>
            <li><strong>蔬菜</strong> - 菜心、西蘭花、青瓜，全部都含有維生素同纖維</li>
            <li><strong>碳水</strong> - 米飯、粉麵、薯仔，提供能量既來源</li>
            <li><strong>脂肪</strong> - 適量既脂肪係必須既，雞翼既皮就有小小脂肪</li>
            <li><strong>礦物質</strong> - 牛肉既鐵質、魚既鈣質，都係日常所需</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            最重要既係均衡二字，唔好日日都係同一樣，就OK！
          </p>
        </section>


        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解香港人需要快手晚餐？</h2>
          <p className="text-[#5A4030] mb-4">
            香港人���活節奏快，放工已經6-7點，回到屋企都8-9點，
            如果每晚都要煮30分鐘以上既飯，簡直係另一份工作！
            根據調查，香港打工仔平均每晚只有1-2小時既私人時間，
            如果要用大半個鐘係廚房，真係寧願出去食或者叫外賣。
          </p>
          <p className="text-[#5A4030] mb-4">
            但係出去食唔止貴，長期落去洗咁多錢，
            而且冇咁健康。自己整既話可以控制油、鹽、糖既份量，
            對身體好啲。所以今日我就同大家分享20款30分鐘內可以搞掂既家常菜！
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>慳時間</strong> - 最快10分鐘就有得食，唔洗等咁耐</li>
            <li><strong>慳money</strong> - 自己整比出去食平一半以上</li>
            <li><strong>健康過外賣</strong> - 油鹽自己控制，冇咁heavy</li>
            <li><strong>屋企人開心</strong> - 煮既用心，食既窩心</li>
            <li><strong>每日都可以唔同</strong> - 20款輪住整，一個月至唔洗重複</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">20款30分鐘晚餐推薦</h2>
          <p className="text-[#5A4030] mb-4">
            以下既20款食譜，全部都係30分鐘內可以完成，
            而且材料係街市同超市都買到，唔洗特登出去買！
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {quickRecipes.map((recipe, index) => (
              <a
                key={recipe.slug}
                href={`/recipes/${recipe.slug}`}
                className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-[#9B6035] font-medium">
                  {index + 1}. {recipe.name}
                </span>
                <span className="text-sm text-[#5A4030] ml-2">({recipe.time}分鐘)</span>
              </a>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點樣10分鐘內整晚餐？</h2>
          <p className="text-[#5A4030] mb-4">
            如果你真係忙到趴係地下，以下既組合可以係10分鐘內完成：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>青瓜炒蛋</strong> - 青瓜切片撈勻蛋，落油炒3分鐘搞定！</li>
            <li><strong>粟米蛋花湯</strong> - 粟米加水滾，生粉水埋芡，撈蛋液，熄火！</li>
            <li><strong>蒜蓉炒菜心</strong> - 蒜蓉爆香，落菜心兜幾下，5分鐘搞定！</li>
            <li><strong>涼拌青瓜</strong> - 青瓜切片撈鹽出水，撈醬油同麻油，、雪15分鐘，即食！</li>
            <li><strong>蒸水蛋</strong> - 蛋水比例1:1.5，蒸8分鐘，幾簡單！</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            以上5款都係10分鐘內可以完成，既慳時間又有營養！
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">快手晚餐買餸攻略</h2>
          <p className="text-[#5A4030] mb-4">
            要做到30分鐘內有飯食，準備既功夫要做係前面：
          </p>
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-4">街市清單（一次過買齊）</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>蛋</strong> - 1盒（10隻）$15</li>
            <li><strong>雞翼</strong> - 1斤 $25</li>
            <li><strong>牛肉</strong> - 牛腩1斤 $40</li>
            <li><strong>魚</strong> - 石斑1條 $35</li>
            <li><strong>蔬菜</strong> - 青瓜、菜心、西蘭花 $20</li>
            <li><strong>豆腐</strong> - 2件 $8</li>
          </ul>
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-4">超市乾貨（長期備存）</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>米</strong> - 1包 $20</li>
            <li><strong>河粉</strong> - 1包 $15</li>
            <li><strong>調味料</strong> - 豉油、鹽、糖 $30</li>
            <li><strong>罐頭</strong> - 粟米、茄汁 $20</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            一次過買齊大約$200，可以整兩三個星期既晚餐！
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">一週快手晚餐餐單</h2>
          <p className="text-[#5A4030] mb-4">
            如果你想試下整週既快手晚餐，可以參考以下既餐單：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5DCC8]">
                  <th className="py-2 text-[#9B6035]">日期</th>
                  <th className="py-2 text-[#9B6035]">晚餐</th>
                  <th className="py-2 text-[#9B6035]">時間</th>
                </tr>
              </thead>
              <tbody>
                {weeklyPlan.map((item) => (
                  <tr key={item.day} className="border-b border-[#E5DCC8]">
                    <td className="py-2 text-[#3A2010]">{item.day}</td>
                    <td className="py-2 text-[#5A4030]">{item.recipe}</td>
                    <td className="py-2 text-[#5A4030]">{item.time}分鐘</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#5A4030] mt-4">
            總共時間：{weeklyPlan.reduce((a, b) => a + b.time, 0)}分鐘，平均每日{weeklyPlan.reduce((a, b) => a + b.time, 0) / 7}分鐘！
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">快手晚餐既小技巧</h2>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>事先醃肉</strong> - 週末一次過醃定幾日既肉，放入雪櫃，第二日直接落鑊</li>
            <li><strong>一鍋兩用</strong> - 蒸魚既同時可以用另一隻煲煮飯，一舉兩得</li>
            <li><strong>切定先</strong> - 夜晚返到屋企，先切定材料，咁樣可以慳5-10分鐘</li>
            <li><strong>睇住時間</strong> - 每樣野既時間唔同，先整要耐既餸，中間整配菜</li>
            <li><strong>慳洗碗</strong> - 用一個煲整多過一樣，例如蒸魚既水可以整湯</li>
            <li><strong>凍少少先落油</strong> - 魚同蛋呢類，落油既時候等油熱啲先好整，會香好多</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">想搵更多選擇？</h2>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><a href="/50-classic-hk-recipes" className="text-[#9B6035] underline">50款香港人必備食譜</a> - 超過50款選擇</li>
            <li><a href="/7-day-dinner-plan" className="text-[#9B6035] underline">一週晚餐完整攻略</a> - 每日不同選擇</li>
            <li><a href="/generate" className="text-[#9B6035] underline">AI餐單生成器</a> - ���click幫你安排</li>
            <li><a href="/recipes" className="text-[#9B6035] underline">食譜庫</a> - 超過180款選擇</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm mb-12">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">常見問題</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#3A2010]">30分鐘得唔得？</h3>
              <p className="text-[#5A4030]">可以！上面既20款食譜最快既10分鐘就得，最耐都唔過30分鐘。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">材料要去邊度買？</h3>
              <p className="text-[#5A4030]">街市同超市都有，街市既野更新鮮，超市既包裝整齊，大家可以就近選擇。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">可以唔可以一個星期整兩次？</h3>
              <p className="text-[#5A4030]">可以！如果某日真係太忙，可以重複整某啲好似咖哩牛腩呢類，整一次可以食兩日。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">小朋友會鍾意食呢啲嗎？</h3>
              <p className="text-[#5A4030]">會！呢啲都係小朋友鍾意既味道，例如蜜糖雞翼、咖哩、炒飯，全部都係小朋友既至愛。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">得兩個人食既話點算？</h3>
              <p className="text-[#5A4030]">份量減半就得，或者整兩款唔同既餸，等唔會悶。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">可以點樣慳時間？</h3>
              <p className="text-[#5A4030]">可以事先切定材料，醃定肉，咁樣返到屋企15分鐘就可以食到！</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">要幾多budget？</h3>
              <p className="text-[#5A4030]">每週大約$150-$200，一次過買齊材料，唔洗周圍走。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">呢個plan啱素食者嗎？</h3>
              <p className="text-[#5A4030]">都啱！將肉类轉做豆腐、豆製品或者菇类就得，例如麻婆豆腐、蒸豆腐。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">如果唔想日日都煮點算？</h3>
              <p className="text-[#5A4030]">可以安排一至兩日出去食或者叫外賣呀！例如星期三、五可以休息下，咁樣呢個plan都唔洗跟得太死。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">整親都失敗點算？</h3>
              <p className="text-[#5A4030]">放心，呢啲都係簡易做法，就算失敗都唔會衰得好緊要！最重要係有心整，同屋企人一齊食既時候就已經最開心。</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">總結</h2>
          <p className="text-[#5A4030]">
            香港人既生活已經夠忙，晚餐唔應該成為另一個負擔。
            用呢20款30分鐘內可以完成既家常菜，
            你可以輕鬆做到每日都有晚飯食，而且唔洗花太多時間！
            如果你想更加輕鬆，可以試下我地既
            <a href="/generate" className="text-[#9B6035] underline">AI餐單生成器</a>，
            一click就幫你安排好成個星期既晚餐！
          </p>
        </section>
      </main>
    </Layout>
  );
}
