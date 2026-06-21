import Head from 'next/head';
import SEO from '@/components/seo/SEO';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
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
        <Header {...useHeaderController()} />
        
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

            <p className="text-sm text-[#AA7A50] pt-4">最後更新：2026年6月21日</p>
          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">資料保留期限</h2>
            <p>我們只會於達成相關用途所需期間內保留個人資料。</p>
            <p className="mt-2">帳戶資料一般會於帳戶存在期間保留。</p>
            <p className="mt-2">用戶建立的餐單、收藏及相關設定會於帳戶存續期間保存，以提供服務功能。</p>
            <p className="mt-2">如用戶要求刪除帳戶，我們會於合理期間內刪除或匿名化相關資料，惟法律、保安或技術需要保留的資料除外。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">用戶權利</h2>
            <p>你有權查閱、更正或刪除你的個人資料。</p>
            <p className="mt-2">如希望查詢、更正或刪除相關資料，可透過本頁提供的聯絡方式與我們聯絡。</p>
            <p className="mt-2">我們會於合理時間內處理相關要求，並於適用情況下作出回覆。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">第三方服務</h2>
            <p>為提供網站功能及改善服務質素，我們可能使用第三方服務供應商，包括但不限於：</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Google Authentication（登入服務）</li>
              <li>Google AdSense（廣告服務）</li>
              <li>Vercel（網站託管服務）</li>
            </ul>
            <p className="mt-2">上述第三方服務可能根據其自身私隱政策處理相關資料。</p>
          </section>

          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
