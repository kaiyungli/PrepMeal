export default function GenerateIntro() {
  return (
    <section aria-labelledby="generate-title" className="bg-[#9B6035] rounded-xl px-4 py-5 sm:px-6 sm:py-8 text-center text-white">
      <h1 id="generate-title" className="text-[clamp(1.5rem,4vw,2.5rem)] font-black mb-2">一週餐單</h1>
      <p className="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed">
        先安排幾日晚餐，再集中一至兩次買餸。按口味同時間調整菜式，買餸前核對家中已有材料。
      </p>
      <ol aria-label="安排餐單步驟" className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        <li>1. 揀日數同人數</li>
        <li>2. 生成及調整菜式</li>
        <li>3. 查看買餸材料</li>
      </ol>
      <p className="mt-2 text-xs sm:text-sm leading-relaxed">毋須登入即可生成及查看購物清單；保存到帳戶需登入。</p>
    </section>
  );
}
