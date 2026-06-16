import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

const pairings = {
  chicken: [
    { name: '雞肉 + 蘑菇', desc: '中式炒片或西式忌廉汁，簡單易做' },
    { name: '雞肉 + 西蘭花', desc: '低脂健康，適合減肥人士' },
    { name: '雞肉 + 薯仔', desc: '住家味，細路都鍾意' },
    { name: '雞肉 + 洋蔥', desc: '洋蔥雞蓋飯，人人都岩' },
    { name: '雞肉 + 粟米', desc: '粟米雞柳粒，清甜好味' },
    { name: '雞肉 + 露筍', desc: '露筍炒雞片，清新爽口' },
  ],
  beef: [
    { name: '牛肉 + 西蘭花', desc: '鐵質豐富，媽媽最愛' },
    { name: '牛肉 + 洋蔥', desc: '洋蔥和牛，經典配搭' },
    { name: '牛肉 + 彩椒', desc: '色彩繽紛，賣相加分' },
    { name: '牛肉 + 薯仔', desc: '薯仔牛肉煲，暖胃之選' },
    { name: '牛肉 + 金菇', desc: '金菇肥牛卷，火鍋一流' },
    { name: '牛肉 + 椰菜', desc: '椰菜炒牛肉，快手小菜' },
  ],
  pork: [
    { name: '豬肉 + 冬瓜', desc: '冬瓜燴肉，消暑清热' },
    { name: '豬肉 + 蘿蔔', desc: '蘿蔔炆肉，冬天恩物' },
    { name: '豬肉 + 苦瓜', desc: '苦瓜炒肉片，去火一流' },
    { name: '豬肉 + 茄子', desc: '茄子肉片，茄子控必試' },
    { name: '豬肉 + 青瓜', desc: '青瓜炒肉片，清爽' },
    { name: '豬肉 + 番茄', desc: '番茄煮肉，酸甜開胃' },
  ],
  tofu: [
    { name: '豆腐 + 肉碎', desc: '肉碎蒸豆腐，普通都岩' },
    { name: '豆腐 + 蝦仁', desc: '蝦仁蒸豆腐，鮮甜' },
    { name: '豆腐 + 蛋', desc: '蒸水蛋，細路岩' },
    { name: '豆腐 + 蔥', desc: '蔥燒豆腐，簡單' },
    { name: '豆腐 + 魚肉', desc: '魚肉豆腐湯，營養' },
    { name: '豆腐 + 辣醬', desc: '麻婆豆腐，重口味' },
  ],
  egg: [
    { name: '番茄 + 蛋', desc: '番茄炒蛋，永恒經典' },
    { name: '青瓜 + 蛋', desc: '青瓜炒蛋，清新' },
    { name: '洋蔥 + 蛋', desc: '洋蔥蛋餅，早餐岩' },
    { name: '粟米 + 蛋', desc: '粟米蛋花湯，快' },
    { name: '芝士 + 蛋', desc: '芝士烘蛋，西式' },
    { name: '蝦仁 + 蛋', desc: '蝦仁炒蛋，海鮮' },
  ],
  salmon: [
    { name: '三文魚 + 檸檬', desc: '香煎檸檬三文魚，經典' },
    { name: '三文魚 + 薯仔', desc: '焗薯仔三文魚，正' },
    { name: '三文魚 + 蘆筍', desc: '蘆筍三文魚卷，高級' },
    { name: '三文魚 + 牛油果', desc: '牛油果三文魚沙律' },
    { name: '三文魚 + 蒜蓉', desc: '蒜蓉蒸三文魚' },
    { name: '三文魚 + 味噌', desc: '味噌三文魚湯' },
  ],
  veg: [
    { name: '菜心 + 蒜', desc: '蒜蓉炒菜心，必備' },
    { name: '西蘭花 + 蒜', desc: '蒜蓉西蘭花，健康' },
    { name: '白菜 + 薑', desc: '薑汁炒白菜，暖身' },
    { name: '青瓜 + 蒜', desc: '涼拌青瓜，夏天' },
    { name: '番茄 + 蛋', desc: '番茄炒菜，萬能' },
    { name: '南瓜 + 肉', desc: '南瓜炆肉，時令' },
  ],
};

export default function IngredientPairingGuide() {
  return (
    <Layout>
      <SEO
        title="常見食材配搭指南"
        description="整理香港家庭常用食材配搭，幫助你快速決定今晚煮乜"
        canonical="https://eatwhathk.com/ingredient-pairing-guide"
      />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
          常見食材配搭指南
        </h1>

        <div className="space-y-8 text-[#5A4030]">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              點解食材配搭咁重要？
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>慳時間</strong> - 唔洗每次都諗今晚食乜，直接跟配搭</li>
              <li><strong>少浪費</strong> - 一週用幾次相同材料，唔洗散買</li>
              <li><strong>易規劃</strong> - 配搭固定咗，寫餐單自然快</li>
              <li><strong>營養均</strong> - 蛋白質+蔬菜+碳水，營養均衡</li>
            </ul>
          </section>

          {Object.entries(pairings).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
                {{
                  chicken: '🐔 雞肉配搭',
                  beef: '🥩 牛肉配搭',
                  pork: '🐖 豬肉配搭',
                  tofu: '🧈 豆腐配搭',
                  egg: '🥚 雞蛋配搭',
                  salmon: '🐟 三文魚配搭',
                  veg: '🥬 蔬菜配搭',
                }[category]}
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {items.map((item, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                    <h3 className="font-medium text-[#9B6035]">{item.name}</h3>
                    <p className="text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              點樣用配搭建立一週餐單？
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>揀一組蛋白質</strong> - 例如雞肉或牛肉，呢個禮拜用佢為主</li>
              <li><strong>配兩至三款蔬菜</strong> - 唔同配搭，唔會悶</li>
              <li><strong>分配日期</strong> - 邊日食清淡啲，邊日食濃味啲，安排好</li>
              <li><strong>一次過買齊</strong> - 列定shopping list，一次過採購</li>
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              總結
            </h2>
            <p>
              其實煮晚餐唔難，難既係「今晚食咩」。
              如果你有咗呢個配搭清單，每次唔洗諗，
              直接跟住配，幾日都唔洗點諗就可以過一週。
              如果想更快，可以試下今晚食乜既搜尋功能，
              一 search 就搵到唔同既配搭食譜。
            </p>
            <p className="mt-3">
              <a href="/recipes" className="text-[#9B6035] underline font-medium">
                搜尋食譜 →
              </a>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
