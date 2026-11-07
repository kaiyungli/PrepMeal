/**
 * HomeHowItWorks - Shows how to use the app
 * Placed below HomeHero, above recipe filters
 */

export default function HomeHowItWorks() {
  const steps = [
    {
      number: '1',
      title: '生成餐單',
      description: '揀人數同3、5或7日，詳細配搭同飲食條件喺生成頁設定。',
    },
    {
      number: '2',
      title: '按口味換菜',
      description: '鎖定想保留嘅菜，再逐道替換唔啱口味嘅菜式。',
    },
    {
      number: '3',
      title: '跟清單買餸',
      description: '開啟合併購物清單，按人數核對材料；登入後可保存餐單同勾選已買材料。',
    },
  ];

  return (
    <section className="py-5 md:py-8 bg-[#F8F3E8]">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-xl font-bold text-center text-[#3A2010] mb-4">
          如何使用今晚食乜
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-3 rounded-xl bg-white p-3 md:block md:rounded-2xl md:p-6 md:text-center md:shadow-sm"
            >
              <div className="w-7 h-7 shrink-0 md:w-12 md:h-12 md:mx-auto md:mb-4 rounded-full bg-[#9B6035] text-white text-sm md:text-xl font-bold flex items-center justify-center">
                {step.number}
              </div>
              <div className="min-w-0">
              <h3 className="text-base md:text-lg font-semibold text-[#3A2010] mb-1 md:mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-[#7A5A38]">
                {step.description}
              </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
