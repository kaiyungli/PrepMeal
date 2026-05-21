import Head from 'next/head';
import SEO from '@/components/seo/SEO';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

/**
 * Privacy Policy 隱私政策
 */
export default function Privacy() {
  return (
    <>
      <SEO
        title="隱私政策"
        description="PrepMeal 隱私政策 - 了解我們如何收集、使用、保護您的個人資料。"
        canonical="https://eatwhathk.com/privacy"
      />
      <Head>
        <title>隱私政策 | PrepMeal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-[#F8F3E8]">
        <Header />
        
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-6">隱私政策</h1>
          
          <div className="space-y-6 text-[#5A4030]">
            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">概述</h2>
              <p>PrepMeal 重視您的隱私。本政策說明我們如何收集、使用、保護您的個人資料。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">收集的資料</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Google 登入資訊（電郵地址、Google 帳戶資料）</li>
                <li>食譜收藏及個人偏好</li>
                <li>餐單計劃資料</li>
                <li>購物清單資料</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">Google AdSense 及廣告</h2>
              <p>本網站使用 Google AdSense 顯示廣告。Google 可能使用 Cookie 根據您的興趣顯示相關廣告。您可隨時在 Google 廣告設定中停用個人化廣告。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">Cookies</h2>
              <p>我們使用必要的 Cookies 維持登入狀態及服務運作。Google AdSense 亦可能設置廣告相關 Cookies。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">資料使用</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>提供個人化食譜推薦</li>
                <li>改善用戶體驗</li>
                <li>分析流量及使用情況</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">資料保護</h2>
              <p>我們採用適當的安全措施保護您的資料，並僅保留必要時間。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">聯絡我們</h2>
              <p>如有任何疑問，請透過應用程式內的支援渠道聯繫我們。</p>
            </section>

            <p className="text-sm text-[#AA7A50] pt-4">最後更新：2026年5月21日</p>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
