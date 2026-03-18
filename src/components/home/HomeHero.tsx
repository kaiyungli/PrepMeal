import Link from 'next/link';

export default function HomeHero() {
  return (
    <section className="bg-[#F8F3E8] relative overflow-hidden py-12 md:py-16">
      {/* Top-right green circle decoration */}
      <div className="absolute w-80 h-80 rounded-full bg-[#C8D49A] opacity-60 -top-16 -right-16 hidden md:block"></div>
      
      {/* Bottom-left warm yellow circle decoration */}
      <div className="absolute w-48 h-48 rounded-full bg-[#E8C87A] opacity-40 bottom-0 -left-12 hidden md:block"></div>
      
      <div className="relative z-10 mx-auto max-w-[1200px] px-4">
        <div className="grid grid-cols-12 gap-8 items-center">
          {/* Left side - Text */}
          <div className="col-span-12 md:col-span-6 text-center md:text-left">
            <div className="inline-flex items-center rounded-full bg-[#F8F3E8] px-4 py-1.5 text-sm font-semibold text-[#9B6035] mb-4">
              🍜 今晚食乜
            </div>
            <h1 className="clamp(4rem, 10vw, 9rem) font-black leading-none tracking-[-0.02em] text-[#3A2010] mb-8">
              今晚食乜
            </h1>
            <p className="mt-2 text-base text-[#7A5A38]">
              輸入你有嘅食材，我幫你搵啱啱嘅食譜，亦可以直接生成一週餐單。
            </p>
            
            {/* CTA Button */}
            <div className="mt-6">
              <Link
                href="/generate"
                className="inline-flex px-12 py-4 rounded-full bg-[#9B6035] text-white font-extrabold text-lg hover:opacity-95 transition-opacity"
              >
                生成食譜
              </Link>
            </div>
          </div>
          
          {/* Right side - HeroCard */}
          <div className="col-span-12 md:col-span-6 hidden md:flex justify-center">
            <div className="w-full max-w-md rounded-2xl border-2 border-[#DDD0B0] bg-white p-6 shadow-[0_20px_60px_rgba(155,96,53,0.14)]">
              {/* Placeholder content for HeroCard */}
              <div className="space-y-4">
                <div className="h-4 bg-[#F8F3E8] rounded w-3/4"></div>
                <div className="h-4 bg-[#F8F3E8] rounded w-1/2"></div>
                <div className="h-20 bg-[#F8F3E8] rounded-xl"></div>
                <div className="h-4 bg-[#F8F3E8] rounded w-full"></div>
                <div className="h-4 bg-[#F8F3E8] rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
