import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

export default function MealPlanExample() {
  const weekPlan = [
    {
      day: '星期一',
      meals: {
        breakfast: '蛋治 + 奶茶',
        lunch: '公司三文治',
        dinner: '洋蔥炒牛肉 + 白飯',
      },
    },
    {
      day: '星期二',
      meals: {
        breakfast: '腸粉 + 艇仔粥',
        lunch: '便利店意粉',
        dinner: '番茄薯仔燴雞扒 + 椰菜絲',
      },
    },
    {
      day: '星期三',
      meals: {
        breakfast: '多士 + 咖啡',
        lunch: '微波爐公仔麵',
        dinner: '青瓜炒蛋 + 炒米粉',
      },
    },
    {
      day: '星期四',
      meals: {
        breakfast: '中式包點 + 豆漿',
        lunch: '外賣寿司',
        dinner: '豉汁蒸排骨 + 白飯',
      },
    },
    {
      day: '星期五',
      meals: {
        breakfast: '煎蛋三文治 + 奶茶',
        lunch: '茶餐廳常餐',
        dinner: '蒜香雞翼 + 涼瓜炒牛肉',
      },
    },
    {
      day: '星期六',
      meals: {
        breakfast: '粥底海鮮鍋',
        lunch: '家庭自助火鍋',
        dinner: '清蒸石斑 + 蔬菜',
      },
    },
    {
      day: '星期日',
      meals: {
        breakfast: '自助早餐 brunch',
        lunch: '酒樓飲茶',
        dinner: '老火湯 + 紅燒肉',
      },
    },
  ];

  return (
    <Layout>
      <SEO
        title="一週餐單範例"
        description="一週七天每日三餐食譜範例，睇下香港家庭點樣規劃晚餐"
        canonical="https://eatwhathk.com/meal-plan-example"
      />
      
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-4 text-center">
          一週餐單範例
        </h1>

        <div className="space-y-8 text-[#5A4030]">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              咩係一週餐單規劃？
            </h2>
            <p>
              一週餐單規劃就係每週日前諗定嗰七日三餐要煮咩。
              好多香港家庭每日都問「今晚食乜」，
              如果早啲諗好，就可以一次過去街市買齊材料，
              唔使臨到尾先諗，或者走去快餐店食快餐。
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              做一週餐單有咩好處？
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>減少每日煩惱</strong> - 唔使臨訓前都唔知今晚煮乜
              </li>
              <li>
                <strong>控制預算</strong> - 一次過採購，通常平過逐日買
              </li>
              <li>
                <strong>減少浪費</strong> - 預先把材料寫低，唔會買多咗
              </li>
              <li>
                <strong>提前準備</strong> - 可以早啲醃定肉，晏啲煮快手
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-4">
              一週三餐餐單範例
            </h2>
            <div className="space-y-4">
              {weekPlan.map((day) => (
                <div key={day.day} className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-semibold text-[#9B6035] mb-3">
                    {day.day}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-[#AA7A50]">早餐</span>
                      <p>{day.meals.breakfast}</p>
                    </div>
                    <div>
                      <span className="text-[#AA7A50]">午餐</span>
                      <p>{day.meals.lunch}</p>
                    </div>
                    <div>
                      <span className="text-[#AA7A50]">晚餐</span>
                      <p>{day.meals.dinner}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              點樣開始自訂餐單？
            </h2>
            <p>
              其實自己整呢個表要啲時間，又要諗配搭，又要確保有營養。
              今晚食乜既 AI 餐單生成功能可以幫你慳啲工夫 -
              只需要選擇人數、想食既類型，幾秒就生成七日餐單，
              仲會自動整理成購物清單，唔洗自己寫。
            </p>
            <p className="mt-3">
              <a href="/generate" className="text-[#9B6035] underline font-medium">
                一 click 生成你自己既餐單 →
              </a>
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              小貼士
            </h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>可以週末一次過買齊材料，雪住慢慢用</li>
              <li>難既餸可以擺夜晚煮，快既可以擺晏晝</li>
              <li>如果唔想日日煮，可以週末煮多啲，第二日帶饭</li>
              <li>記得留一日「自由餐」，想食乜就食乜，唔洗跟餐單</li>
            </ul>
          </section>
        </div>
      </main>
    </Layout>
  );
}
