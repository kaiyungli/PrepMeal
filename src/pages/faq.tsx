import Head from 'next/head';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SEO from '@/components/seo/SEO';

const faqItems = [
  {
    question: '今晚食乜是什麼？',
    answer: '今晚食乜是一個專為香港家庭設計的智能食譜搜尋及餐單規劃平台。我們收錄大量家常食譜，幫助用戶快速解決「今晚食咩」的煩惱。',
  },
  {
    question: '如何搜尋食譜？',
    answer: '你可以使用搜尋欄輸入食譜名稱、材料或關鍵字。亦可以使用篩選功能，按難度、烹飪時間、食材類型等方式篩選。',
  },
  {
    question: '如何生成餐單？',
    answer: '在首頁點擊「生成餐單」按鈕，選擇人數和日期數目，系統會根據你的口味偏好自動配對食譜，生成一週餐單。',
  },
  {
    question: '如何儲存餐單？',
    answer: '生成餐單後，點擊「儲存餐單」即可保存到你的帳戶。你可以在「我的餐單」中查看和管理所有已儲存的餐單。',
  },
  {
    question: '如何產生購物清單？',
    answer: '在已儲存的餐單中，點擊「購物清單」按鈕，系統會自動整合所有食材，生成可購買的清單。你可以直接在超市使用。',
  },
  {
    question: '可以按食材搜尋嗎？',
    answer: '可以！你可以在搜尋欄輸入特定食材，如「牛肉」、「豆腐」等，系統會顯示包含該食材的食譜。',
  },
  {
    question: '可以收藏食譜嗎？',
    answer: '可以。點擊食譜卡片上的心形圖標即可收藏。收藏的食譜會保存在「收藏」頁面，方便日後快速查看。',
  },
  {
    question: '餐單如何計算？',
    answer: '餐單會根據你選擇的人數自動計算每道菜的分量。系統亦會提供營養資訊，幫助你了解每日的熱量及蛋白質攝取。',
  },
  {
    question: '是否適合減肥人士？',
    answer: '我們有健康餐、低脂餐等分類。你可以按「健康」或「低脂」篩選，亦可在食譜詳情頁查看卡路里和營養資訊。',
  },
  {
    question: '食譜資料從何而來？',
    answer: '我們的食譜來自公開的食譜資料庫及用戶分享。所有食譜都經過編輯審核，確保資料準確。',
  },
];

export default function Faq() {
  return (
    <>
      <SEO
        title="常見問題"
        description="今晚食乜常見問題解答"
        canonical="https://eatwhathk.com/faq"
      />
      <Head>
        <title>常見問題 | 今晚食乜</title>
      </Head>
      
      <div className="min-h-screen bg-[#F8F3E8]">
        <Header />
        
        <main className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-bold text-[#3A2010] mb-8 text-center">
            常見問題
          </h1>
          
          <div className="space-y-6">
            {faqItems.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-[#3A2010] mb-3">
                  {index + 1}. {item.question}
                </h2>
                <p className="text-[#5A4030] leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
