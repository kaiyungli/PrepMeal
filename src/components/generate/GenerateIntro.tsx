export default function GenerateIntro() {
  return (
    <section aria-labelledby="generate-title" className="py-3 text-[#3A2010]">
      <h1 id="generate-title" className="text-2xl sm:text-3xl font-bold mb-2">一週餐單</h1>
      <p className="max-w-2xl text-sm leading-relaxed text-[#66594B]">
        先安排幾日晚餐，再集中一至兩次買餸。按口味同時間調整菜式，買餸前核對家中已有材料。
      </p>
      <ol aria-label="安排餐單步驟" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#66594B]">
        <li>1. 揀日數同人數</li>
        <li>2. 生成及調整菜式</li>
        <li>3. 查看買餸材料</li>
      </ol>
      <p className="mt-2 text-xs leading-relaxed text-[#66594B]">毋須登入即可生成及查看購物清單；保存到帳戶需登入。</p>
    </section>
  );
}
