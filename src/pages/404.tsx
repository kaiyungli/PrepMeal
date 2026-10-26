import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
export default function NotFound() {
  return <Layout><SEO title="找不到頁面" noIndex />
    <main className="max-w-2xl mx-auto px-4 py-16 text-center text-[#5A4030]">
      <p className="text-[#9B6035] font-semibold mb-3">404</p>
      <h1 className="text-3xl font-bold text-[#3A2010] mb-4">搵唔到呢個頁面</h1>
      <p>連結可能已經更新，或者頁面暫時未能提供。你可以重新搜尋食譜，或者返回首頁。</p>
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        <Link href="/recipes" style={{ color: '#FFFFFF' }} className="min-h-11 rounded-xl bg-[#9B6035] px-5 py-3">搜尋食譜</Link>
        <Link href="/" className="min-h-11 rounded-xl border border-[#DDD0B0] px-5 py-3">返回首頁</Link>
      </div>
      <p className="mt-6 text-sm">如果你由網站內的連結到達此頁，歡迎<Link href="/contact" className="underline">通知我們修正</Link>。</p>
    </main></Layout>;
}
