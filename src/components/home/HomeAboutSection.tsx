/**
 * HomeAboutSection - About the app content
 * Placed below HomeHowItWorks, above recipe filters
 */

export default function HomeAboutSection() {
  return (
    <section className="py-10 bg-[#F8F3E8]">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-xl font-bold text-center text-[#3A2010] mb-6">
          什麼是今晚食乜？
        </h2>
        
        <div className="max-w-2xl mx-auto text-[#5A4030] space-y-4 text-center">
          <p>
            今晚食乜是一個專為香港家庭設計的智能食譜搜尋及餐單規劃平台。
          </p>
          <p>
            我們收錄大量家常菜、中式料理、西式料理、健康餐及簡易晚餐食譜，
            幫助用戶快速解決每天「今晚食咩」的煩惱。
          </p>
          <p>
            除了搜尋食譜之外，用戶亦可以根據個人口味及需求，自動生成一週餐單，
            並整理成購物清單，節省規劃及採購時間。
          </p>
          
          <div className="pt-4">
            <p className="font-medium text-[#9B6035]">適合：</p>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              <span className="px-3 py-1 bg-white rounded-full text-sm text-[#7A5A38]">
                上班族
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-[#7A5A38]">
                家庭主婦
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-[#7A5A38]">
                健身人士
              </span>
              <span className="px-3 py-1 bg-white rounded-full text-sm text-[#7A5A38]">
                學生
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
