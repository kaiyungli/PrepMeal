/**
 * HomeHowItWorks - Shows how to use the app
 * Placed below HomeHero, above recipe filters
 */

export default function HomeHowItWorks() {
  const steps = [
    {
      number: '1',
      title: '搜尋或篩選食譜',
      description: '按食材、難度、時間或類型搜尋心儀食譜',
    },
    {
      number: '2',
      title: '一鍵生成每週餐單',
      description: 'AI 智能配對，一 click 生成七日晚餐',
    },
    {
      number: '3',
      title: '自動整理購物清單',
      description: '一週食材一次過採購，慳時間慳腳骨力',
    },
  ];

  return (
    <section className="py-12 bg-[#F8F3E8]">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-xl font-bold text-center text-[#3A2010] mb-8">
          如何使用今晚食乜
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl p-6 text-center shadow-sm"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#9B6035] text-white text-xl font-bold flex items-center justify-center">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-[#3A2010] mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[#7A5A38]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
