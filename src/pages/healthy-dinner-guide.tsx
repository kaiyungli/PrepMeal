import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

export default function HealthyDinnerGuide() {
  return (
    <Layout>
      <SEO
        title="健康晚餐指南"
        description="香港家庭健康晚餐建議，減脂、高蛋白、低油均衡配搭"
        canonical="https://eatwhathk.com/healthy-dinner-guide"
      />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
          健康晚餐指南
        </h1>

        <div className="space-y-8 text-[#5A4030]">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              健康晚餐應該點安排？
            </h2>
            <p>
              好多人以為健康晚餐就等於食齋或者食少啲，其實唔係。
              一餐健康既晚餐應該包含以下元素：
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>蛋白質</strong> - 雞肉、魚、豆腐、蛋，維持肌肉同飽肚感</li>
              <li><strong>蔬菜</strong> - 纖維維生素佔每日一半，幫助消化</li>
              <li><strong>碳水化合物</strong> - 粟米、薯仔、飯，提供能量</li>
              <li><strong>優質脂肪</strong> - 橄欖油、牛油果、三文魚</li>
            </ul>
            <p className="mt-3">
              比例方面，建議蔬菜佔一半，蛋白質同碳水各佔四分一，
              咁樣既飽肚又唔會吸收太多熱量。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              減脂晚餐建議
            </h2>
            <div className="space-y-3">
              {[
                { name: '蒸雞胸 + 西蘭花', desc: '低脂高蛋白，加少少醬油' },
                { name: '香煎魚柳 + 雜菜', desc: '唔使油都得，三文魚有Omega-3' },
                { name: '豆腐湯 + 青瓜', desc: '清得黎有營養，幾飽' },
                { name: '雞蛋炒雜蔬', desc: '蛋有蛋白質，蔬菜有纖維' },
                { name: '牛肉片灼菜心', desc: '用灼既方式，唔使落油' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-[#9B6035]">{item.name}</h3>
                  <p className="text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              高蛋白晚餐建議
            </h2>
            <div className="space-y-3">
              {[
                { name: '雞髀肉蒸豆腐', desc: '雞髀肉加豆腐，蛋白質爆燈' },
                { name: '三文魚扒 + 薯仔', desc: '三文魚有優質脂肪加蛋白質' },
                { name: '牛肉炒西蘭花', desc: '牛肉高鐵配蔬菜，營養丰富' },
                { name: '蝦仁蒸蛋', desc: '蝦加蛋，雙重蛋白質' },
                { name: '豬肉丸煮番茄', desc: '自製豬肉丸，無新增劑' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-[#9B6035]">{item.name}</h3>
                  <p className="text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              少油少糖家常菜
            </h2>
            <div className="space-y-3">
              {[
                { name: '清蒸石斑', desc: '加薑蔥就好好味，唔使油' },
                { name: '白灼蝦', desc: '水煮蝦，甜味最正' },
                { name: '蒜蓉蒸娃娃菜', desc: '蒜蓉令素菜變好味' },
                { name: '冬瓜煮肉片', desc: '冬瓜吸晒肉味，唔使落油' },
                { name: '青瓜涼拌', desc: '青瓜加少少醋同蒜，開胃' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-medium text-[#9B6035]">{item.name}</h3>
                  <p className="text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              適合上班族的健康晚餐
            </h2>
            <p>
              好多上班族放工已經七點、八點，唔想煮太久，
              但係又想健康啲。以下係啱既選擇：
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-2">
              <li><strong>15分鐘內搞得掂</strong> - 蒸魚+灼菜，或者微波爐意粉加蔬菜</li>
              <li><strong>預先醃定</strong> - 星期六日醃定雞扒，夜晚直接煎</li>
              <li><strong>一鍋到底</strong> - 一個煲同時煮飯同蒸菜，唔使洗多嘢</li>
              <li><strong>半成品</strong> - 買已經處理好既食材，例如切好既肉片</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              一週健康晚餐範例
            </h2>
            <div className="space-y-3">
              {[
                { day: '星期一', meal: '蒸雞胸 + 雜菜' },
                { day: '星期二', meal: '香煎三文魚 + 薯仔' },
                { day: '星期三', meal: '牛肉片炒西蘭花' },
                { day: '星期四', meal: '蝦仁蒸蛋 + 青瓜' },
                { day: '星期五', meal: '清蒸石斑 + 菜心' },
                { day: '星期六', meal: '自助火鍋' },
                { day: '星期日', meal: '外賣日' },
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 shadow-sm flex justify-between">
                  <span className="font-medium text-[#9B6035]">{item.day}</span>
                  <span>{item.meal}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              常見錯誤
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>以為食少啲就健康</strong> - 營養唔夠反而餓更快，第二日狂食</li>
              <li><strong>完全唔食澱粉</strong> - 會無力，特別係做運動既人</li>
              <li><strong>只食蔬菜</strong> - 蛋白質唔夠，肌肉流失</li>
              <li><strong>過度調味</strong> - 醬油、鹽撈太多，其實食物本身既味已經好好</li>
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              總結
            </h2>
            <p>
              健康晚餐唔係得一個標準，每個人既需要都唔同。
              最緊要既係：
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>有蛋白質 - 雞魚肉豆腐蛋</li>
              <li>有蔬菜 - 每日一半既碟</li>
              <li>適量碳水 - 唔使完全戒澱粉</li>
              <li>少油少鹽 - 天然調味最正</li>
            </ul>
            <p className="mt-3">
              如果你想更快搵到健康既食譜，可以試下今晚食乜既篩選功能，
              揀「健康」或「低脂」，幾秒就搵到啱既餸。
            </p>
            <p className="mt-3">
              <a href="/recipes" className="text-[#9B6035] underline font-medium">
                搜尋健康食譜 →
              </a>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
