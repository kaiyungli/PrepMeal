import type { ReactNode } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

type Props = { title: string; description: string; path: string; children: ReactNode };

export default function InformationPage({ title, description, path, children }: Props) {
  return (
    <Layout>
      <SEO title={title} description={description} canonical={`https://eatwhathk.com${path}`} />
      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-12 text-[#5A4030]">
        <h1 className="text-2xl font-bold text-[#3A2010] mb-3">{title}</h1>
        <p className="text-sm text-[#7A6553] mb-8">最後更新：2026年10月27日</p>
        <div className="space-y-8 leading-7 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#3A2010] [&_h2]:mb-3 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-2 [&_a]:underline! [&_a]:underline-offset-4">
          {children}
        </div>
      </main>
    </Layout>
  );
}

export function SiteContact() {
  return (
    <p>
      電郵：<a href="mailto:eatwhathk247@gmail.com">eatwhathk247@gmail.com</a><br />
      電話：<a href="tel:+85294959673">+852 9495 9673</a>
    </p>
  );
}
