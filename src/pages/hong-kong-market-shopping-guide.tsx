import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

// Recipe links for internal linking
const recipeLinks = [
  { name: '青瓜炒蛋', slug: 'cucumber-scrambled-egg' },
  { name: '粟米蛋花湯', slug: 'corn-egg-drop-soup' },
  { name: '蒜蓉炒菜心', slug: 'garlic-choi-sum' },
  { name: '清蒸石斑', slug: 'steamed-fish' },
  { name: '鹽焗雞翼', slug: 'salt-baked-chicken-wings' },
  { name: '咖哩牛腩', slug: 'curry-beef-rice' },
  { name: '乾炒牛河', slug: 'dry-fried-beef-hor-fun' },
  { name: '楊州炒飯', slug: 'yangzhou-fried-rice' },
  { name: '番茄炒蛋', slug: 'tomato-scrambled-egg' },
  { name: '蒸滑雞', slug: 'steamed-chicken' },
  { name: '豆角炒蛋', slug: 'long-bean-scrambled-egg' },
  { name: '洋蔥炒蛋', slug: 'onion-scrambled-egg' },
  { name: '蜜糖雞翼', slug: 'honey-chicken-wings' },
  { name: '麻婆豆腐', slug: 'mapo-tofu' },
  { name: '魚香豆腐', slug: 'yu-xiang-tofu' },
  { name: '涼拌青瓜', slug: 'cold-cucumber-salad' },
  { name: '蒜蓉蒸蝦', slug: 'garlic-steamed-shrimp' },
  { name: '蠔油西蘭花', slug: 'oyster-sauce-broccoli' },
  { name: '紫菜蛋花湯', slug: 'seaweed-egg-drop-soup' },
  { name: '薑蔥炒蟹', slug: 'ginger-scallion-crab' },
];

const weeklyShoppingList = [
  { day: '星期一', breakfast: '麥片', lunch: '外賣', dinner: '青瓜炒蛋 + 粟米湯', cost: 25 },
  { day: '星期二', breakfast: '多士', lunch: '外賣', dinner: '咖哩牛腩飯', cost: 45 },
  { day: '星期三', breakfast: '粥', lunch: '外賣', dinner: '蒸滑雞 + 炒菜', cost: 40 },
  { day: '星期四', breakfast: '麥片', lunch: '外賣', dinner: '清蒸石斑 + 青菜', cost: 50 },
  { day: '星期五', breakfast: '多士', lunch: '外賣', dinner: '楊州炒飯', cost: 35 },
  { day: '星期六', breakfast: '出街食', lunch: '出街食', dinner: '乾炒牛河', cost: 40 },
  { day: '星期日', breakfast: '出街食', lunch: '出街食', dinner: '鹽焗雞翼', cost: 35 },
];

export default function HKMarketShoppingGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "香港街市買餸攻略｜新手必學買菜技巧與一週採購清單",
    "description": "香港街市買餸完整攻略！教你點樣係街市買最新鮮既材料，$300-$500就可以買齊一週晚餐，新手必學既買餸技巧同埋食材保存方法。",
    "author": { "@type": "Organization", "name": "今晚食乜" },
    "datePublished": "2026-06-25",
    "dateModified": "2026-06-25"
  };

  return (
    <Layout>
      <SEO
        title="香港街市買餸攻略｜新手必學買菜技巧與一週採購清單 | 今晚食乜"
        description="香港街市買餸完整攻略！教你點樣係街市買最新鮮既材料，$300-$500就可以買齊一週晚餐，新手必學既買餸技巧同埋食材保存方法。"
        canonical="https://eatwhathk.com/hong-kong-market-shopping-guide"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#3A2010] mb-6 text-center">
          香港街市買餸攻略｜新手必學買菜技巧與一週採購清單
        </h1>
        
        <p className="text-lg text-[#5A4030] mb-8 text-center">
          街市買餸唔係老手既專利！新手必學既買餸技巧，等你唔洗每日都為今晚煮咩頭痕
        </p>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">點解香港人仍然喜歡去街市買餸？</h2>
          <p className="text-[#5A4030] mb-4">
            就算香港有唔少超市同埋網上買餸既服務，仍然有唔少香港人選擇去街市買餸。原因有以下幾個：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>最新鮮</strong> - 街市既蔬菜同海鮮通常都係當日到貨，超市既野可能已經擺咗幾日</li>
            <li><strong>可以摸下試下</strong> - 街市可以親手摸下啲蔬菜幾fresh、睇下啲魚幾精神，超市包裝好既就睇唔到</li>
            <li><strong>價錢平</strong> - 街市既價錢通常比超市平20-30%，同阿姐傾下偈仲可以再有discount</li>
            <li><strong>人情味</strong> - 街市既阿姐阿叔會教到你點樣揀野、整咩好食，唔洗自己猜</li>
            <li><strong>選擇多</strong> - 街市有唔同既食材，超市既選擇比較少，有時你想買既野未必有</li>
            <li><strong>可以講價</strong> - 同阿姐熟咗之後，每次都會俾你好多添，變相即係discount</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            而且去街市買餸其實唔洗好早起身，通常朝早8點去到就已经有好多野揀，夜晚7點去到既話通常阿姐都會特價賣埋佢，等唔洗第二日再擺。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">香港常見街市食材分類</h2>
          
          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-6">🥬 蔬菜</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>菜心</strong> - 最常見既蔬菜，香港人最鍾意食，一斤約$8-12</li>
            <li><strong>小白菜</strong> - 幾時整都得，一斤約$6-10</li>
            <li><strong>西蘭花</strong> - 營養價值高，一個約$8-15</li>
            <li><strong>青瓜</strong> - 可以炒蛋、涼拌，一斤約$10-15</li>
            <li><strong>番茄</strong> - 炒蛋一流，一斤約$12-18</li>
            <li><strong>節瓜</strong> - 夏天既限定，一斤約$8-12</li>
            <li><strong>通菜</strong> - 夏天至啱，一斤約$5-8</li>
            <li><strong>潺菜</strong> - 夏天至啱，一斤約$5-8</li>
          </ul>

          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-6">🦐 海鮮</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>石斑</strong> - ersea魚幾時都好味，一斤約$50-80</li>
            <li><strong>蝦</strong> - 白灼、蒸都得，一斤約$40-60</li>
            <li><strong>肉蟹</strong> - 薑蔥炒一流，一斤約$50-70</li>
            <li><strong>花甲</strong> - 炒粉絲幾好味，一斤約$25-35</li>
            <li><strong>倉魚</strong> - 煎既話超香，一斤約$30-45</li>
            <li><strong>墨魚</strong> - 炒或者灼都得，一斤約$40-55</li>
          </ul>

          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-6">🥩 肉類</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>牛肉</strong> - 牛腩、牛肉片，一斤約$50-80</li>
            <li><strong>豬肉</strong> - 最常用，一斤約$35-50</li>
            <li><strong>雞</strong> - 雞翼、雞髀、雞胸，一斤約$25-40</li>
            <li><strong>排骨</strong> - 蒸既話好好味，一斤約$40-55</li>
            <li><strong>叉燒</strong> - 粥既時候切啲，一斤約$40-60</li>
          </ul>

          <h3 className="text-lg font-medium text-[#9B6035] mb-2 mt-6">🧈 豆製品</h3>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>豆腐</strong> - 煎、蒸、炒都得，一件約$3-8</li>
            <li><strong>豆卜</strong> - 滷味既話超正，一件約$2-5</li>
            <li><strong>枝竹</strong> - 冬至至啱，一紮約$8-12</li>
            <li><strong>腐乳</strong> - 送粥一流，一磚約$5-10</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">新手買餸常見錯誤</h2>
          <p className="text-[#5A4030] mb-4">
            以下係一啲新手經常犯既錯誤，等你唔好再犯：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>買太多</strong> - 新手通常會一次過買好多，結果食唔曬浪費咗。建議初期先買少啲，睇下自己既食量先再慢慢增加。</li>
            <li><strong>唔問價</strong> - 唔同既檔口價錢可以差好遠，問下先好買，唔好即刻就話要。</li>
            <li><strong>唔該先</strong> - 街市既阿姐阿叔都鍾意勤力既人，聲氣大聲啲該聲「姐姐／阿叔」，會對你好多。</li>
            <li><strong>呃稱</strong> - 新手通常唔識睇稱，等佢話幾多就幾多。其實可以問下「幾多錢一斤？」然後自己計下。</li>
            <li><strong>唔比較</strong> - 街市通常有幾檔賣同一樣既野，唔好即刻就買，多行幾檔比較下。</li>
            <li><strong>唔留意天氣</strong> - 夏天街市既野好快變壞，買完要快啲翻屋企雪好佢。</li>
            <li><strong>唔識時間</strong> - 朝早去街市既野最新鮮，但係夜晚去既話通常有特價。</li>
            <li><strong>唔問意見</strong> - 阿姐阿叔通常會教你點樣整既野好食，問下佢地會話你知。</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">如何用 $300-$500 完成一週買餸</h2>
          <p className="text-[#5A4030] mb-4">
            如果你係一個人或者兩個人住，既budget可以參考以下既建議：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>$300預算（慳皮版）</strong> - 每晚整一個餸，配罐頭或者公仔麵，唔好諗住食太好</li>
            <li><strong>$400預算（普通版）</strong> - 兩日整一次肉，其他日子食蔬菜同蛋，夠營養</li>
            <li><strong>$500預算（豐富版）</strong> - 每日都有肉有菜，星期六日出街食，整體夠</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            以下係慳錢既小技巧：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>一次過買齊七日既材料，唔好每日都去街市</li>
            <li>揀啲「可以做多過一款」既材料，例如雞翼可以整鹽焗、蜜糖、咖哩味</li>
            <li>買街市既野，唔好去超市</li>
            <li>晚晚去街市既話通常有特價</li>
            <li>同阿姐建立關係，熟咗會俾你好多添</li>
            <li>學定幾款「乜都可以整既」餸，例如炒蛋、炒菜心</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">一週採購清單範例</h2>
          <p className="text-[#5A4030] mb-4">
            以下係一週既晚餐採購清單，你可以根據自己既口味調整：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5DCC8]">
                  <th className="py-2 text-[#9B6035]">日期</th>
                  <th className="py-2 text-[#9B6035]">早餐</th>
                  <th className="py-2 text-[#9B6035]">午餐</th>
                  <th className="py-2 text-[#9B6035]">晚餐</th>
                  <th className="py-2 text-[#9B6035]">預算</th>
                </tr>
              </thead>
              <tbody>
                {weeklyShoppingList.map((item) => (
                  <tr key={item.day} className="border-b border-[#E5DCC8]">
                    <td className="py-2 text-[#3A2010]">{item.day}</td>
                    <td className="py-2 text-[#5A4030]">{item.breakfast}</td>
                    <td className="py-2 text-[#5A4030]">{item.lunch}</td>
                    <td className="py-2 text-[#5A4030]">{item.dinner}</td>
                    <td className="py-2 text-[#5A4030]">${item.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[#5A4030] mt-4">
            總預算：${weeklyShoppingList.reduce((a, b) => a + b.cost, 0)}（平均每日${Math.round(weeklyShoppingList.reduce((a, b) => a + b.cost, 0) / 7)}）
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">如何保存食材減少浪費</h2>
          <p className="text-[#5A4030] mb-4">
            街市買既野最怕係唔食曬浪費，以下係保存既小技巧：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>蔬菜</strong> - 用報紙包住放入雪櫃，既可以保持水分又唔會黐埋一齊，最好3日內食完</li>
            <li><strong>肉類</strong> - 放入雪櫃既最盡可以放2日，如果想放耐啲可以放入冰格，但係要記得食之前一日攤出黎退冰</li>
            <li><strong>海鮮</strong> - 海鮮最緊要新鮮，最好今日買今日食，如果真係唔得可以放入雪櫃但係最多1日</li>
            <li><strong>豆腐</strong> - 雪住可以放一個禮拜，但如果變黃或者出水就唔好再食</li>
            <li><strong>雞蛋</strong> - 雪櫃門口既位係最暖既，最好放入中間既位，可以放3-4個禮拜</li>
            <li><strong>已經切左既材料</strong> - 可以用保鮮盒裝住，等佢唔會串味</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            最重要既係：買既時候諗清楚自己既食量，唔好一次過買太多。如果真係買多咗，可以同屋企人或者鄰居分享一下，既唔浪費又有人情味。
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">配合 EatWhatHK 規劃晚餐</h2>
          <p className="text-[#5A4030] mb-4">
            街市買餸之前，最好先plan定今晚整咩。EatWhatHK可以幫到你：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><a href="/generate" className="text-[#9B6035] underline">AI餐單生成器</a> - 一click幫你安排成個星期既晚餐，唔洗每日諗今晚煮咩</li>
            <li><a href="/recipes" className="text-[#9B6035] underline">食譜庫</a> - 超過180款食譜，唔洗就住就住</li>
            <li><a href="/30-minute-dinner-recipes" className="text-[#9B6035] underline">30分鐘晚餐</a> - 如果你真係好忙，呢啲快速版好岩你</li>
            <li><a href="/7-day-dinner-plan" className="text-[#9B6035] underline">一週晚餐攻略</a> - 每日唔同既選擇，一個月至唔洗重複</li>
            <li><a href="/50-classic-hk-recipes" className="text-[#9B6035] underline">50款經典食譜</a> - ��港��必學既家常菜</li>
            <li><a href="/healthy-dinner-guide" className="text-[#9B6035] underline">健康晚餐指南</a> - 如果你想食得健康啲</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            用EatYourPlan既話，你可以：
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-[#5A4030]">
            <li>先用<a href="/generate" className="text-[#9B6035] underline">生成器</a>安排成個星期既餐單</li>
            <li>跟住餐單去街市買相應既材料</li>
            <li>跟住食譜整晚飯</li>
            <li>如果有剩既材料，可以存放入<a href="/my-plans" className="text-[#9B6035] underline">我的餐單</a>等第二日用</li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">街市買餸實用技巧</h2>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>早起的鳥兒有蟲食</strong> - 朝早8點去到街市，啲野最新鮮，可以揀過痛快</li>
            <li><strong>臨收檔先去</strong> - 夜晚7點後去街市，阿姐通常會特價賣埋佢</li>
            <li><strong>建立關係</strong> - 同阿姐阿叔傾多啲偈，熟咗之後佢地會俾你好野你</li>
            <li><strong>唔好怕問</strong> - 唔識既野問下阿姐，佢地會教到你</li>
            <li><strong>自備環保袋</strong> - 街市既膠袋唔環保，自備袋好啱</li>
            <li><strong>帶定散紙</strong> - 街市通常收現金，唔好信VISA</li>
            <li><strong>唔好星期日去</strong> - 星期日街市好多人，最好平日去</li>
            <li><strong>帶遮</strong> - 街市附近唔係咁方便搭的士，落雨既話帶定遮</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">香港主要街市推薦</h2>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li><strong>街市</strong> - 最多選擇，乜都有</li>
            <li><strong>九龍城街市</strong> - 蔬菜最平</li>
            <li><strong>灣仔街市</strong> - 海鮮最新鮮</li>
            <li><strong>大埔街市</strong> - 咩都有，乜都平</li>
            <li><strong>屯門街市</strong> - 新界北既居民咁就腳</li>
            <li><strong>將軍澳街市</strong> - 東九龍既居民咁就腳</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">街市買餸既化學作用</h2>
          <p className="text-[#5A4030] mb-4">
            去街市買餸唔單止係買材料，仲係一種社交活動。以下既「化學作用」你一定要知：
          </p>
          <ul className="list-disc pl-5 space-y-3 text-[#5A4030]">
            <li><strong>阿姐會記得你</strong> - 如果你去多幾次，阿姐會記得你既口味，會推介啱你既野</li>
            <li><strong>會送啲俾你</strong> - 買開既話，阿姐有時會送啲蔥、蒜仔俾你</li>
            <li><strong>會教點整</strong> - 阿姐唔單止賣野，仲會教到你點樣整好食</li>
            <li><strong>會介紹新野</strong> - 有時阿姐會推薦啲新既材料或者季節既野</li>
            <li><strong>會等你講價</strong> - 熟客既話，通常都可以講下價</li>
            <li><strong>會提早留貨</strong> - 如果你想買啲特既野，可以提早同阿姐講佢留貨</li>
          </ul>
        </section>

        <section className="bg-white rounded-xl p-6 shadow-sm mb-12">
          <h2 className="text-xl font-semibold text-[#3A2010] mb-4">常見問題</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-[#3A2010]">街市幾點去最好？</h3>
              <p className="text-[#5A4030]">朝早8點到10點最好，啲野最新鮮。如果想平啲，可以夜晚7點後去，通常有特價。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">點樣呃稱？</h3>
              <p className="text-[#5A4030]">可以問下「幾多錢一斤？」然後自己計下。或者可以帶把小稱，唔該先。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">可以講價嗎？</h3>
              <p className="text-[#5A4030]">可以！同阿姐阿叔熟咗之後，通常都可以講下價。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">、街市同超市既分別？</h3>
              <p className="text-[#5A4030]">街市既野更新鮮、便啲，但係要早起身去。超市既野包裝好，但係貴啲。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">點樣保存蔬菜？</h3>
              <p className="text-[#5A4030]">用報紙包住放入雪櫃，最好3日內食完。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">一週買幾多錢夠？</h3>
              <p className="text-[#5A4030]">一個人既話$300-$500夠七日，如果兩個人既話$500-$800。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">新手去街市要注意咩？</h3>
              <p className="text-[#5A4030]">記得該聲「姐姐／阿叔」，問下價先好買，唔好即刻話要。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">街市買餸要帶咩？</h3>
              <p className="text-[#5A4030]">帶定散錢、環保袋，如果有時間可以去早啲。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">點樣先可以平啲？</h3>
              <p className="text-[#5A4030]">同阿姐建立關係，臨收檔先去，或者一次過買多啲。</p>
            </div>
            <div>
              <h3 className="font-medium text-[#3A2010]">如果唔識整點算？</h3>
              <p className="text-[#5A4030]">問下阿姐，佢地會教你整乜野好食。亦可以去<a href="/recipes" className="text-[#9B6035] underline">食譜庫</a>睇下教學。</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">總結</h2>
          <p className="text-[#5A4030] mb-4">
            街市買餸係香港人既生活一部分，唔單止可以買到最新鮮既材料，仲可以感受到濃濃既人情味。
            如果你係新手，唔洗怕，去多幾次就識嘞！
          </p>
          <p className="text-[#5A4030] mb-4">
            記住以下既重點：
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[#5A4030]">
            <li>該聲「姐姐／阿叔」</li>
            <li>問下價先好買</li>
            <li>同阿姐建立關係</li>
            <li>早起身去揀野</li>
            <li>帶定散錢同環保袋</li>
          </ul>
          <p className="text-[#5A4030] mt-4">
            如果你想更加輕鬆，可以先用<a href="/generate" className="text-[#9B6035] underline">EatWhatHK既AI餐單生成器</a>，
            幫你安排好成個星期既晚餐，咁你去街市既時候就唔洗諗咁多，直接買啱既材料就可以！
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-[#3A2010] mb-4">相關食譜推薦</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {recipeLinks.map((recipe, index) => (
              <a
                key={recipe.slug}
                href={`/recipes/${recipe.slug}`}
                className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-[#9B6035] font-medium">
                  {index + 1}. {recipe.name}
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
