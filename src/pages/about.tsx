import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

export default function About() {
  return (
    <Layout>
      <SEO
        title="關於"
        description="關於今晚食乜 - 智能食譜搜尋及餐單規劃平台"
        canonical="https://eatwhathk.com/about"
      />
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
          關於今晚食乜
        </h1>
        
        <div className="space-y-8 text-[#5A4030]">
          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              我們是誰
            </h2>
            <p>
              今晚食乜（eatwhathk.com）是一個專為香港家庭設計的智能食譜搜尋及餐單規劃平台。
              我們明白香港人每天工作繁忙，放工後還要諗今晚食乜真係頭痕。
              所以我哋創立呢個平台，希望幫大家慳時間、慳腳骨力。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              為什麼建立今晚食乜
            </h2>
            <p>
              我哋發現好多人每晚都為咗「今晚食咩」而苦惱。
              去街市唔知買乜，睇完食譜又唔記得要買咩材料。
              所以我哋希望提供一個一站式解決方案，
              由搜尋食譜、生成餐單到整理購物清單，一次過搞掂。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              我們如何幫助香港家庭
            </h2>
            <p>
              今晚食乜提供三大功能：
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>智能食譜搜尋 - 按食材、難度、時間、卡路里篩選</li>
              <li>一鍵生成餐單 - AI 根據口味配對，一 click 生成七日晚餐</li>
              <li>自動購物清單 - 整合所有食材，慳時間慳腳骨力</li>
            </ul>
            <p className="mt-2">
              用戶可以直接 save 餐單到帳戶，唔使每次都用紙筆記。
              而且我哋支援 Google 登入，幾秒就搞得掂。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              食譜與餐單資料來源
            </h2>
            <p>
              我哋既食譜來自公開既食譜資料庫，經過編輯審核同分類。
              所有食譜都標明難度、烹飪時間、卡路里同埋材料，
              確保資料準確可靠。餐單就由 AI 根據用戶既口味同偏好自動生成。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              AI 餐單生成的用途與限制
            </h2>
            <p>
              AI 餐單生成功能可以幫你快速解決「今晚食咩」既問題，
              但生成既餐單僅供參考。我哋建議用戶在使用前自行判斷食材同分量是否適合自己既口味同需要。
              我哋唔會收集任何敏感既個人資料，所有資料都會安全儲存。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              聯絡方式
            </h2>
            <p>
              如果你有任何意見或疑問，歡迎電郵比我哋：
              <br />
              <a href="mailto:hello@eatwhathk.com" className="text-[#9B6035] underline">
                hello@eatwhathk.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
