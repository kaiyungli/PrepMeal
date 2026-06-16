import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

export default function HkDinnerIdeas() {
  return (
    <Layout>
      <SEO
        title="香港家庭晚餐靈感"
        description="精選香港家庭晚餐組合、買餸建議及快速家常菜靈感，解決每日今晚食咩既煩惱"
        canonical="https://eatwhathk.com/hk-dinner-ideas"
      />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
          香港家庭晚餐靈感
        </h1>

        <div className="space-y-8 text-[#5A4030]">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              香港家庭晚餐為何難安排？
            </h2>
            <p>
              香港人返工時間長，放工已經七點幾、八點，返到屋企已經好攰。
              如果住嘅地方唔近街市，買餸既時間更加有限。
              而且屋企每個人既口味都唔同，有人鍾意食辣，有人唔食辣，
              要搵到所有人都岩既款式真係唔容易。
            </p>
            <p className="mt-2">
              另一方面，家長都想小朋友食得健康啲，唔想成日食快餐或外賣，
              但係自己煮又要諗配搭、又要買材料、又要洗嘢，的確幾頭痕。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              30分鐘快速晚餐推薦
            </h2>
            <div className="space-y-4">
              {[
                { name: '番茄炒蛋套餐', detail: '番茄炒蛋 + 蒜蓉生菜 + 粟米肉粒湯' },
                { name: '西蘭花牛肉套餐', detail: '西蘭花炒牛肉 + 白飯 + 紫菜湯' },
                { name: '香煎三文魚套餐', detail: '香煎三文魚 + 雜菜沙律 + 薯仔湯' },
                { name: '青瓜炒蛋套餐', detail: '青瓜炒蛋 + 炒米粉 + 冬瓜湯' },
                { name: '肉碎豆腐套餐', detail: '肉碎蒸豆腐 + 炒小白菜 + 皮蛋瘦肉粥' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-[#9B6035]">{index + 1}. {item.name}</h3>
                  <p className="text-sm">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              一餸一菜一湯組合
            </h2>
            <div className="space-y-4">
              {[
                { name: '蒸魚組合', detail: '清蒸石斑 + 蒜蓉炒菜心 + 節瓜瘦肉湯' },
                { name: '炒牛肉組合', detail: '洋蔥炒牛肉 + 白灼芥蘭 + 番茄蛋花湯' },
                { name: '紅燒肉組合', detail: '紅燒五花腩 + 螞蝗菜 + 冬瓜老鴨湯' },
                { name: '雞煲組合', detail: '花雕雞煲 + 響鈴 + 雜菜' },
                { name: '蒸肉餅組合', detail: '馬蹄肉餅 + 蒸水蛋 + 瓜粒湯' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-[#9B6035]">{index + 1}. {item.name}</h3>
                  <p className="text-sm">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              四人家庭晚餐建議
            </h2>
            <div className="space-y-4">
              {[
                { name: '住家小菜', detail: '粟米魚塊 + 蝦仁炒蛋 + 蒜蓉白菜 + 老火湯' },
                { name: '簡易火鍋', detail: '肥牛片 + 魚片 + 蔬菜拼盤 + 湯底' },
                { name: '親子晚餐', detail: '芝士焗魚柳 + 薯條 + 羅宋湯 + 沙律' },
                { name: '健康組合', detail: '蒸雞 + 淮山杞子飯 + 炒雜菜 + 湯' },
                { name: '經濟選擇', detail: '肉碎蒸蛋 + 炒椰菜 + 腐皮湯 + 白飯' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-[#9B6035]">{index + 1}. {item.name}</h3>
                  <p className="text-sm">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              買餸預算控制技巧
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>每週規劃</strong> - 星期六日睇下今個禮拜想煮乜，先寫定shopping list，唔好臨去街市先諗
              </li>
              <li>
                <strong>善用當季食材</strong> - 夏天食冬瓜、節瓜平啲，冬天食蘿蔔、椰菜正時令
              </li>
              <li>
                <strong>重用食材</strong> - 例如買咗一斤牛肉，可以分兩餐，一餐炒、一餐燴，唔使另外買過
              </li>
              <li>
                <strong>減少浪費</strong> - 蔬菜唔好一次過買太多，有時街市晚啲買會平啲，但唔好因為平而買多咗
              </li>
              <li>
                <strong>比較價錢</strong> - 街市、超市、網上平台都睇下，有時網上減價幾抵
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              常見食材配搭參考
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-[#9B6035] mb-2">🐔 雞肉</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>雞髀 + 西蘭花 + 蘑菇</li>
                  <li>雞胸 + 洋蔥 + 彩椒</li>
                  <li>雞扒 + 薯仔 + 露筍</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[#9B6035] mb-2">🥩 牛肉</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>牛肉片 + 洋蔥 + 椰菜</li>
                  <li>牛腩 + 蘿蔔 + 馬鈴薯</li>
                  <li>牛柳 + 露筍 + 蒜頭</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[#9B6035] mb-2">🧈 豆腐</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>豆腐 + 肉碎 + 蔥</li>
                  <li>豆腐 + 蝦仁 + 蛋</li>
                  <li>豆腐 + 魚肉 + 芫荽</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-[#9B6035] mb-2">🐟 魚</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>三文魚 + 薯仔 + 檸檬</li>
                  <li>石斑 + 薑蔥 + 醬油</li>
                  <li>鱸魚 + 豆豉 + 蒜蓉</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              總結
            </h2>
            <p>
              其實煮晚餐唔難，最難既係「今晚食咩」呢個問題。
              如果每次都要花半粒鐘諗，既費時又費神。
              不如試下用今晚食既 AI 餐單生成功能，幾秒就幫你整定七日餐單，
              仲會自動寫埋shopping list，唔洗自己諗。
            </p>
            <p className="mt-3">
              <a href="/generate" className="text-[#9B6035] underline font-medium">
                一 click 生成你自己既餐單 →
              </a>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
