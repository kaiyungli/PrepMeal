import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PracticalRecipe } from '@/features/guides/practicalExamples';

export function ExampleLink({ examples, slug }: { examples: PracticalRecipe[]; slug: string }) {
  const recipe = examples.find(r => r.slug === slug);
  return recipe ? <Link className="underline text-[#9B6035]" href={`/recipes/${encodeURIComponent(recipe.slug)}`}>{recipe.name}</Link>
    : <span>示例食譜暫未可用，請到食譜列表另選</span>;
}

export function ExampleTiming({ examples, slug }: { examples: PracticalRecipe[]; slug: string }) {
  const recipe = examples.find(r => r.slug === slug);
  return recipe ? <span>原配方 {recipe.base_servings} 人份；備料 {recipe.prep_time_minutes} 分鐘＋烹調 {recipe.cook_time_minutes} 分鐘，預計共 {recipe.total_time_minutes} 分鐘</span> : <span>份量及時間請查看替代食譜</span>;
}

export function GuideTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: ReactNode[][] }) {
  return <div className="overflow-x-auto rounded-lg border border-[#DDD0B0]" role="region" aria-label={caption} tabIndex={0}>
    <table className="w-full min-w-[34rem] text-left text-sm">
      <caption className="bg-[#F8F3E8] p-3 text-left font-semibold">{caption}</caption>
      <thead className="bg-[#EEE5D3]"><tr>{headers.map(h => <th key={h} scope="col" className="p-3 align-top">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-[#DDD0B0]">{row.map((cell, i) => <td key={i} className="p-3 align-top">{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
