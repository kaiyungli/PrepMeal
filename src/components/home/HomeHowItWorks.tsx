/**
 * HomeHowItWorks - Shows how to use the app
 * Placed below HomeHero, above recipe filters
 */

export default function HomeHowItWorks() {
  const steps = [
    {
      number: '1',
      title: '搵食譜',
      description: '按食材、時間或難度揀餸。',
    },
    {
      number: '2',
      title: '安排餐單',
      description: '選擇3、5或7日，按條件配對現有食譜。',
    },
    {
      number: '3',
      title: '整理購物清單',
      description: '登入後按餐單人數整理材料，採購時逐項勾選。',
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
