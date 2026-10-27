import Link from 'next/link';

export default function HomeAboutSection() {
  return (
    <section className="bg-[#F8F3E8] px-4 py-8 text-[#5A4030]">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="mb-3 text-xl font-bold text-[#3A2010]">關於今晚食乜</h2>
        <p className="text-sm leading-relaxed">今晚食乜幫你將日常揀餸、安排餐單同買餸連埋一齊。食譜由編輯整理，材料、做法及參考來源可在食譜頁查看。</p>
        <Link href="/about" className="mt-3 inline-block text-sm text-[#9B6035] underline underline-offset-4">關於我們</Link>
      </div>
    </section>
  );
}
