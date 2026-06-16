import SEO from '@/components/seo/SEO';
import Layout from '@/components/layout/Layout';

export default function Contact() {
  return (
    <Layout>
      <SEO
        title="聯絡我們"
        description="聯絡今晚食乜 - 網站問題、食譜修正、商業合作"
        canonical="https://eatwhathk.com/contact"
      />
      
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
          聯絡我們
        </h1>
        
        <div className="space-y-8 text-[#5A4030]">
          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              聯絡今晚食乜
            </h2>
            <p>
              如果你有任何問題、建議或查詢，歡迎電郵比我哋：
              <br />
              <a href="mailto:hello@eatwhathk.com" className="text-[#9B6035] underline font-medium">
                hello@eatwhathk.com
              </a>
            </p>
            <p className="mt-3 text-sm opacity-70">
              我們一般會於 3-5 個工作天內回覆。多謝支持！
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              網站問題回報
            </h2>
            <p>
              如果你發現網站有任何問題，例如登入困難、頁面顯示異常或功能失靈，
              請電郵告知，並盡量提供以下資料：
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>使用的裝置和瀏覽器</li>
              <li>問題發生的時間</li>
              <li>問題的詳細描述</li>
            </ul>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              食譜資料修正
            </h2>
            <p>
              如果你發現任何食譜既資料有錯誤，例如材料、步驟或營養資訊有問題，
              請電郵通知我哋。我哋會盡快核查同修正。多謝你既幫手！
            </p>
          </section>

          <section className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
              合作與商業查詢
            </h2>
            <p>
              如果你有興趣同今晚食乜合作，例如餐廳推廣、品牌合作或其他商業機會，
              歡迎電郵至 hello@eatwhathk.com 提出。我哋會盡快回覆。
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}
