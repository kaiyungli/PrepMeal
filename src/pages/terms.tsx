import Head from 'next/head';
import Header from '@/components/layout/Header';
import { useHeaderController } from '@/features/layout/hooks/useHeaderController';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';

export default function Terms() {
  return (
    <>
      <SEO
        title="服務條款"
        description="今晚食乜服務條款與使用規範。"
        canonical="https://eatwhathk.com/terms"
      />
      <Head>
        <title>服務條款｜今晚食乜</title>
      </Head>
      
      <div className="min-h-screen bg-[#F8F3E8]">
        <Header {...useHeaderController()} />
        
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-6">服務條款</h1>
          
          <p className="text-sm text-[#AA7A50] mb-4">最後更新日期：2026年6月</p>
          
          <p className="mb-6">
            使用今晚食乜（eatwhathk.com）即表示你同意遵守本服務條款及相關政策。
          </p>
          
          <div className="space-y-6 text-[#5A4030]">
            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">服務說明</h2>
              <p>今晚食乜提供 AI 智能食譜搜尋、每週餐單生成及購物清單管理功能。本服務將持續改進，我們保留隨時調整服務內容的權利。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">使用者責任</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>請確保您提供的資料真實準確</li>
                <li>勿使用本服務進行任何違法或不當用途</li>
                <li>勿複製或轉發受版權保護的食譜內容</li>
                <li>保護您的帳戶安全，切勿分享登入資訊</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">食譜與內容聲明</h2>
              <p>本服務展示的食譜來自開放食譜庫或用戶分享。我們盡力確保食譜資訊準確，但不保證所有內容完全正確。使用者在製作食物前請自行判斷食材及步驟是否適合。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">帳戶與登入</h2>
              <p>本服務使用 Google 帳戶作為主要登入方式。登入即表示您同意 Google 的服務條款及隱私政策。我們不會存取您的 Google 密碼或其他敏感資料。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">廣告與第三方服務</h2>
              <p>本服務可能顯示 Google 廣告及包含第三方連結。這些廣告和連結的內容與我們無關，我們不對其負責。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">免責聲明</h2>
              <p>本服務按現況提供，不提供任何明示或暗示擔保。您使用本服務即表示同意承擔相關風險。我們不對任何使用直接或間接損失負責，包括但不限於食譜製作過程中的任何問題。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">條款修改權利</h2>
              <p>我們保留隨時修改本服務條款的權利。繼續使用本服務即表示同意修改後的條款。如不同意條款，請停止使用本服務。</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[#3A2010] mb-2">聯絡方式</h2>
              <p>如對本服務條款有任何疑問，請聯繫我們：
              <br />
              電郵：eatwhathk247@gmail.com
              <br />
              電話：+852 9495 9673</p>
            </section>

            <p className="text-sm text-[#AA7A50] pt-4">生效日期：2026年6月21日</p>
          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">AI生成內容聲明</h2>
            <p>本網站部分功能會利用人工智能技術協助生成餐單建議、食譜推薦及購物清單。</p>
            <p className="mt-2">相關內容僅供一般參考用途，可能出現不完整、過時或不適用於特定人士的情況。</p>
            <p className="mt-2">用戶應自行判斷相關內容是否符合個人需要，並於有需要時自行作出調整。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">健康與營養免責聲明</h2>
            <p>本網站提供的食譜、營養及飲食相關內容僅供一般資訊用途，並不構成醫療、營養或專業健康建議。</p>
            <p className="mt-2">如你有食物過敏、慢性疾病、懷孕、特殊飲食需求或其他健康狀況，應先諮詢醫生、註冊營養師或其他專業人士意見。</p>
            <p className="mt-2">用戶因使用本網站內容而產生的任何風險，需自行承擔。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">知識產權</h2>
            <p>除另有註明外，本網站之內容、文字、圖片、設計、標誌及相關資料均屬今晚食乜所有或獲授權使用。</p>
            <p className="mt-2">未經書面同意，不得複製、修改、重新發布或作商業用途使用。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#3A2010] mb-2">帳戶終止</h2>
            <p>如發現用戶濫用服務、從事違法活動、干擾網站運作、進行未經授權的自動化存取或其他損害網站及其他用戶利益的行為，我們有權暫停或終止相關帳戶及服務存取權限。</p>
          </section>

          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
