import Link from 'next/link';
import type { ReactNode } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import type { GuideRecipe } from '@/features/guides/guideRecipes';

export function GuidePage({ title, description, path, children }: {
  title: string; description: string; path: string; children: ReactNode;
}) {
  return <Layout><SEO title={title} description={description} canonical={`https://eatwhathk.com${path}`} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article', headline: title, description,
      author: { '@type': 'Organization', name: '今晚食乜' }, dateModified: '2026-10-26',
      mainEntityOfPage: `https://eatwhathk.com${path}`,
    }).replace(/</g, '\\u003c') }} />
    <main className="max-w-4xl mx-auto px-4 py-12 text-[#5A4030]">
      <h1 className="text-3xl font-bold text-[#3A2010] mb-6 text-center">{title}</h1>
      <p className="text-lg mb-4 text-center">{description}</p>
      <p className="text-sm text-center mb-8">內容更新：2026年10月26日</p>
      <div className="space-y-8 leading-relaxed">{children}</div>
      <nav aria-label="相關閱讀" className="mt-10 flex flex-wrap gap-4 border-t border-[#DDD0B0] pt-6">
        <Link href="/recipes" className="underline">搜尋全部食譜</Link>
        <Link href="/generate" className="underline">生成餐單</Link>
        <Link href="/hong-kong-market-shopping-guide" className="underline">買餸攻略</Link>
        <Link href="/contact" className="underline">回報資料問題</Link>
      </nav>
    </main></Layout>;
}

export function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="text-2xl font-semibold text-[#3A2010] mb-4">{title}</h2>{children}</section>;
}

export function GuideRecipeList({ recipes, days = false }: { recipes: GuideRecipe[]; days?: boolean }) {
  if (!recipes.length) return <p>目前未有符合本篇條件的食譜，請到<Link href="/recipes" className="underline">食譜列表</Link>選擇其他菜式。</p>;
  return <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {recipes.map((recipe, index) => <li key={recipe.id} className="bg-white rounded-xl border border-[#DDD0B0] p-4">
      {days && <p className="text-sm mb-1">第{index + 1}天</p>}
      <Link className="font-semibold text-[#9B6035] underline break-words" href={`/recipes/${encodeURIComponent(recipe.slug)}`}>{recipe.name}</Link>
      <p className="text-sm mt-2">{recipe.total_time_minutes ? `預計總時間 ${recipe.total_time_minutes} 分鐘` : '時間請查看食譜詳情'}</p>
    </li>)}
  </ol>;
}
